import * as THREE from "three";

import { onAllLoaded, bunnyGltf } from "./models.js";
import { scene, ground, ROOM_RADIUS } from "./scene.js";
import { worldPos as playerWorldPos } from "./player.js";

const SPEED = 3;
const TARGET_MAX_DIST = 10;
const HOP_TILL_GOAL_THRESHOLD = 0.001;

// 1 hop per unit closer to target pos
const HOP_LENGTH = 1;
const HOP_HEIGHT = 0.4;

// To stay away from the room
const MIN_DIST_FROM_GROUND_CENTER = ROOM_RADIUS;
const MAX_DIST_FROM_GROUND_CENTER = 20;

// Constants determining state changes and bunny distances
const CURIOUS_STATE_CHANGE_DIST = 6;
const CURIOUS_MAX_DIST = 7;
const BEG_WAIT_DIST = 2;
const BEG_MAX_DIST = 3;

const bunnies = [];
let bunniesIMesh = null;

const tempVector = new THREE.Vector3();
const tempMatrix = new THREE.Matrix4();
const ONE = new THREE.Vector3(1, 1, 1);

const HBD_STRING = `
         *  * ***  ***
         *  * *  * *  *
         **** ***  *  *
         *  * *  * *  *
         *  * ***  ***
  

*  * **** ***   **  **** **** *  *
*  * *  * *  * *  *  *    *   *  *
**** *  * ***  ****  *    *   *  *
*  * *  * *  * *  *  *    *   *  *
*  * **** *  * *  *  *   ****  **
`;

function create(pos, finalPos) {
  const instance = {
    position: pos.clone(),
    quaternion: new THREE.Quaternion(),
    initY: pos.y,
    targetPos: null,
    finalPos: finalPos.clone(),
    waitTimer: 2,
    stateFn: waitState,
    index: bunnies.length,
  };

  bunnies.push(instance);

  return instance;
}

export function init() {
  bunnies.length = 0;

  onAllLoaded(function () {
    const lines = HBD_STRING.split("\n");

    create(new THREE.Vector3(10, 0.16, 10), new THREE.Vector3(0, 0, 0));
    // for (let y = 0; y < lines.length; ++y) {
    //   const line = lines[y];
    //   for (let x = 0; x < line.length; ++x) {
    //     if (line[x] !== "*") {
    //       continue;
    //     }

    //     const finalPos = new THREE.Vector3(x * 0.6 - 9, 0.16, y * 0.6 + 9);

    //     create(finalPos, finalPos);
    //   }
    // }

    const bunnyMesh = bunnyGltf.scene.children[0];

    bunniesIMesh = new THREE.InstancedMesh(
      bunnyMesh.geometry,
      new THREE.MeshPhongMaterial({
        map: bunnyMesh.material.map,
      }),
      bunnies.length
    );
    bunniesIMesh.castShadow = true;
    bunniesIMesh.frustumCulled = false;

    scene.add(bunniesIMesh);
  });
}

function isBunnyOnGround(bunny) {
  return Math.abs(bunny.position.y - bunny.initY) <= 0.005;
}

function enterWaitState({ bunny, waitFor }) {
  if (!isBunnyOnGround(bunny)) {
    console.error("Why is the bunny floating????");
  }

  bunny.position.y = bunny.initY;
  bunny.targetPos = null;
  bunny.waitTimer = waitFor;

  return waitState;
}

function enterMoveState({ bunny, hopDirection, numHops }) {
  bunny.hopDirection = hopDirection.clone().normalize();
  bunny.numHops = numHops;

  bunny.posBeforeHop = bunny.position.clone();
  bunny.waitTimer = null;

  return moveState;
}

// Returns true once we're done hopping.
function doHops(bunny, dt) {
  tempVector.copy(bunny.hopDirection);

  const angle = Math.atan2(-tempVector.z, tempVector.x);

  tempVector.multiplyScalar(SPEED * dt);

  bunny.position.add(tempVector);

  const destOrient = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, angle, 0, "YXZ")
  );
  bunny.quaternion.rotateTowards(destOrient, 10 * dt);

  const hopTillGoal =
    (HOP_LENGTH -
      tempVector.subVectors(bunny.position, bunny.posBeforeHop).length()) /
    HOP_LENGTH;

  bunny.position.y =
    bunny.initY + Math.abs(Math.sin(hopTillGoal * Math.PI) * HOP_HEIGHT);

  if (hopTillGoal > HOP_TILL_GOAL_THRESHOLD) {
    return false;
  }

  bunny.numHops--;
  bunny.position.y = bunny.initY;
  bunny.posBeforeHop = bunny.position.clone();

  return bunny.numHops <= 0;
}

function moveState(bunny, dt) {
  if (doHops(bunny, dt)) {
    return enterWaitState({
      bunny,
      waitFor: Math.random() * 2 + 1,
    });
  }

  return moveState;
}

function enterBegState({ bunny }) {
  bunny.position.y = bunny.initY;

  return begState;
}

function begState(bunny, dt) {
  if (bunny.position.distanceTo(playerWorldPos()) >= BEG_MAX_DIST) {
    return enterApproachState({
      bunny,
    });
  }

  turnTowardsPlayer(bunny, dt);
  return begState;
}

function enterApproachWaitState({ bunny, waitFor }) {
  bunny.position.y = bunny.initY;
  bunny.waitTimer = waitFor;

  return approachWaitState;
}

function approachWaitState(bunny, dt) {
  if (bunny.position.distanceTo(playerWorldPos()) >= CURIOUS_MAX_DIST) {
    // We are too far away for the bunny to care
    return enterWaitState({
      bunny,
      waitFor: 1,
    });
  }

  if (bunny.position.distanceTo(playerWorldPos()) < BEG_MAX_DIST) {
    return enterBegState({
      bunny,
    });
  }

  if (bunny.waitTimer > 0) {
    bunny.waitTimer -= dt;
    return approachWaitState;
  }

  return approachState;
}

function enterApproachState({ bunny }) {
  tempVector.subVectors(playerWorldPos(), bunny.position).setY(0);
  tempVector.normalize();

  // The hop direction will always be towards the player
  bunny.hopDirection = tempVector.clone();
  bunny.numHops = 1;

  bunny.posBeforeHop = bunny.position.clone();
  bunny.waitTimer = null;

  return approachState;
}

function approachState(bunny, dt) {
  if (doHops(bunny, dt)) {
    return enterApproachWaitState({ bunny, waitFor: 1 });
  }

  return approachState;
}

function enterCuriousState({ bunny, waitFor }) {
  if (!isBunnyOnGround(bunny)) {
    console.error("Why float???");
  }

  bunny.position.y = bunny.initY;
  bunny.waitTimer = waitFor;

  return curiousState;
}

function turnTowardsPlayer(bunny, dt) {
  tempVector.subVectors(playerWorldPos(), bunny.position).setY(0);
  tempVector.normalize();

  const angle = Math.atan2(-tempVector.z, tempVector.x);

  // TODO(Apaar): See if we can smoothly interpolate the rotation
  const destOrient = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, angle, 0, "YXZ")
  );

  bunny.quaternion.rotateTowards(destOrient, 10 * dt);
}

function curiousState(bunny, dt) {
  if (bunny.position.distanceTo(playerWorldPos()) >= CURIOUS_MAX_DIST) {
    // We are too far away for the bunny to care
    return enterWaitState({
      bunny,
      waitFor: 1,
    });
  }

  turnTowardsPlayer(bunny, dt);

  if (bunny.waitTimer > 0) {
    bunny.waitTimer -= dt;
    return curiousState;
  }

  // The bunny has waited long enough; time to risk a close encounter
  // We normalize this vector because we only want the bunny to hop twice each time

  return enterApproachState({
    bunny,
  });
}

function waitState(bunny, dt) {
  if (bunny.position.distanceTo(playerWorldPos()) < CURIOUS_STATE_CHANGE_DIST) {
    return enterCuriousState({
      bunny,
      waitFor: 3,
    });
  }

  if (bunny.waitTimer > 0) {
    bunny.waitTimer -= dt;
    return waitState;
  }

  return enterMoveState({
    bunny,
    hopDirection: new THREE.Vector3().randomDirection().setY(0),
    numHops: Math.floor(Math.random() * 5 + 1),
  });
}

export function update(dt) {
  for (const bunny of bunnies) {
    bunny.stateFn = bunny.stateFn(bunny, dt);

    tempMatrix.compose(bunny.position, bunny.quaternion, ONE);
    bunniesIMesh.setMatrixAt(bunny.index, tempMatrix);
  }

  bunniesIMesh.instanceMatrix.needsUpdate = true;
}
