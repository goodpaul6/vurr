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

function randomOffsetPos(vec) {
  // We keep looping until we generate a position within bounds
  for (;;) {
    tempVector.subVectors(newPos, ground.position);

    const d2 = tempVector.lengthSq();

    if (
      d2 <= MAX_DIST_FROM_GROUND_CENTER * MAX_DIST_FROM_GROUND_CENTER &&
      d2 >= MIN_DIST_FROM_GROUND_CENTER * MIN_DIST_FROM_GROUND_CENTER
    ) {
      return newPos;
    }
  }
}

function enterWaitState({ bunny, waitFor }) {
  if (Math.abs(bunny.position.y - bunny.initY) > 0.005) {
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

function subXZOnly(destVec, vecA, vecB) {
  const dx = vecA.x - vecB.x;
  const dz = vecA.z - vecB.z;

  destVec.x = dx;
  destVec.y = 0;
  destVec.z = dz;

  return destVec;
}

function moveState(bunny, dt) {
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

  if (hopTillGoal > HOP_TILL_GOAL_THRESHOLD) return moveState;

  bunny.numHops--;
  bunny.position.y = bunny.initY;
  bunny.posBeforeHop = bunny.position.clone();

  if (bunny.numHops <= 0)
    return enterWaitState({
      bunny,
      waitFor: Math.random() * 2 + 1,
    });

  return moveState;
}

function towardsPlayerPos(vec, y) {
  console.log(
    "Diff between world pos and vector: ",
    tempVector.subVectors(playerWorldPos(), vec)
  );
  const vecDiff = tempVector
    .subVectors(playerWorldPos(), vec)
    .setY(y)
    .normalize();
  return vec.clone().add(vecDiff);
}

function begState(bunny, dt) {
  if (bunny.position.distanceTo(playerWorldPos()) >= BEG_MAX_DIST) {
    // We are too far away to feed the bunny
    bunny.waitTimer = 0;
    return approachState;
  }

  // Only adjust bunny direction every waitTimer to avoid jarring turns
  // if (bunny.waitTimer > 0) {
  //   bunny.waitTimer -= dt;
  //   return begState;
  // }

  tempVector
    .subVectors(playerWorldPos(), bunny.position)
    .setY(bunny.position.y);

  const angle = Math.atan2(-tempVector.z, tempVector.x);

  // TODO(Apaar): See if we can smoothly interpolate the rotation
  const destOrient = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, angle, 0, "YXZ")
  );

  bunny.quaternion.rotateTowards(destOrient, 10 * dt);

  // bunny.waitTimer = 1;
  // Bunny can be fed carrot here
  return begState;
}

function approachWaitState(bunny, dt) {
  if (bunny.waitTimer > 0) {
    bunny.waitTimer -= dt;
    return approachWaitState;
  }
  bunny.targetPos = towardsPlayerPos(bunny.position, bunny.initY);
  return approachState;
}

function approachState(bunny, dt) {
  if (bunny.position.distanceTo(playerWorldPos()) >= CURIOUS_MAX_DIST) {
    // We are too far away for the bunny to care
    bunny.waitTimer = 0;
    return waitState;
  }
  if (
    bunny.position.distanceTo(playerWorldPos()) < BEG_MAX_DIST &&
    Math.abs(bunny.position.y - bunny.initY) <= 0.05
  ) {
    return begState;
  }
  bunny.position.y = bunny.initY;
  tempVector.subVectors(bunny.targetPos, bunny.position);

  const d = tempVector.length();

  tempVector.normalize();

  const angle = Math.atan2(-tempVector.z, tempVector.x);

  // TODO(Apaar): See if we can smoothly interpolate the rotation
  const destOrient = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, angle, 0, "YXZ")
  );

  bunny.quaternion.rotateTowards(destOrient, 10 * dt);

  tempVector.multiplyScalar(SPEED * dt);

  bunny.position.add(tempVector);

  bunny.position.y =
    bunny.initY + Math.abs(Math.sin((d * HOP_RATE * Math.PI) / 2) * HOP_HEIGHT);

  const atTargetDist = SPEED / 10;

  if (d <= atTargetDist && Math.abs(bunny.position.y - bunny.initY) <= 0.05) {
    if (bunny.position.distanceTo(playerWorldPos()) < BEG_WAIT_DIST) {
      bunny.waitTimer = 2;
      return begState;
    }
    bunny.waitTimer = 1;
    return approachWaitState;
  }
  return approachState;
}

function curiousState(bunny, dt) {
  if (bunny.position.distanceTo(playerWorldPos()) >= CURIOUS_MAX_DIST) {
    // We are too far away for the bunny to care
    bunny.waitTimer = 0;
    return waitState;
  }
  if (bunny.waitTimer <= 0) {
    // The bunny has waited long enough; time to risk a close encounter
    // We normalize this vector because we only want the bunny to hop twice each time
    bunny.targetPos = towardsPlayerPos(bunny.position, bunny.initY);
    return approachState;
  }

  tempVector.subVectors(playerWorldPos(), bunny.position);

  tempVector.normalize();

  const angle = Math.atan2(-tempVector.z, tempVector.x);

  // TODO(Apaar): See if we can smoothly interpolate the rotation
  const destOrient = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, angle, 0, "YXZ")
  );

  bunny.quaternion.rotateTowards(destOrient, 10 * dt);

  bunny.waitTimer -= dt;
  return curiousState;
}

function waitState(bunny, dt) {
  /*
  if (bunny.position.distanceTo(playerWorldPos()) < CURIOUS_STATE_CHANGE_DIST) {
    bunny.waitTimer = 5;
    return curiousState;
  }
  */

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
