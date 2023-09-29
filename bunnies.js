import * as THREE from "three";

import { onAllLoaded, bunnyGltf } from "./models.js";
import { scene, ground, ROOM_RADIUS } from "./scene.js";
import { worldPos as playerWorldPos } from "./player.js";
import { carrots } from "./carrots.js";
import { gamepads } from "./input.js";
import { removeBody } from "./physics.js";

const SPEED = 3;
const CREEP_SPEED = 0.5;
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
const NOTICE_CARROT_DIST = 3;
const NOTICE_CARROT_DIST_MAX = 5;
const EAT_CARROT_DIST = 0.5;
const FINAL_POS_DIST = 0.2;
const MAX_CARROT_Y_DIST = 0.4;

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
    color: new THREE.Color(0xffffff),
    carrot: null,
    isSentToFinalPos: false,
  };

  bunnies.push(instance);

  return instance;
}

export function init() {
  bunnies.length = 0;

  onAllLoaded(function () {
    const lines = HBD_STRING.split("\n");

    // create(new THREE.Vector3(10, 0.16, 10), new THREE.Vector3(0, 0, 0));
    for (let y = 0; y < lines.length; ++y) {
      const line = lines[y];
      for (let x = 0; x < line.length; ++x) {
        if (line[x] !== "*") {
          continue;
        }

        // Set to some random distance in between the max and min dist from
        // ground centre, adding 2 to prevent bunnies from getting in the room
        const randomDist =
          Math.random() *
            (MAX_DIST_FROM_GROUND_CENTER - MIN_DIST_FROM_GROUND_CENTER) +
          MIN_DIST_FROM_GROUND_CENTER +
          2;

        // Set to a random direction (in the XZ plane)
        // Need to normalize since after setting y to 0, it's no longer a
        // unit vector
        const randomDirection = tempVector
          .randomDirection()
          .setY(0)
          .normalize();

        const startPos = randomDirection.multiplyScalar(randomDist).setY(0.16);

        const finalPos = new THREE.Vector3(x * 0.6 - 9, 0.16, y * 0.6 + 9);

        create(startPos, finalPos);
      }
    }

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

function enterEatCarrotState({ bunny }) {
  // check if carrot is eaten
  let carrot = bunny.targetCarrot;

  if (carrot.isEaten) {
    // The carrot left the array before we could eat it - shouldn't be possible
    console.error(
      "Tried to eat carrot but it was not in the carrots array anymore"
    );
  }

  // Remove the carrot's physics body so its motion is no longer dictated by it
  removeBody(carrot.userData.body);
  carrot.userData.body = null;

  carrot.userData.isEaten = true;

  let gamepad = carrot.userData.heldByGamepad;
  if (gamepad) {
    gamepad.hasCarrot = false;
    carrot.userData.heldByGamepad = null;
  }

  bunny.carrot = carrot;
  bunny.isSentToFinalPos = true;

  return eatCarrotState;
}

/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

function eatCarrotState(bunny, dt) {
  // Randomly assign ~10 bunnies to go to their final positions
  let notFinalPosBunnies = bunnies.filter(function (b) {
    return b.stateFn !== finalPosState;
  });
  let shuffledBunnies = [...notFinalPosBunnies];
  shuffleArray(shuffledBunnies);

  shuffledBunnies = shuffledBunnies.slice(0, 29);

  for (let bunny of shuffledBunnies) {
    bunny.isSentToFinalPos = true;
  }

  return enterGoToFinalPosState({ bunny });
}

function enterGoToFinalPosState({ bunny }) {
  tempVector.subVectors(bunny.finalPos, bunny.position).setY(0);
  bunny.numHops = Math.floor(tempVector.length() / HOP_LENGTH);

  tempVector.normalize();
  bunny.hopDirection = tempVector.clone();

  bunny.posBeforeHop = bunny.position.clone();
  bunny.waitTimer = null;

  return goToFinalPosState;
}

function goToFinalPosState(bunny, dt) {
  bunny.color.set(0xffffff);

  if (doHops(bunny, dt)) {
    return enterCreepToFinalPosState();
  }
  return goToFinalPosState;
}

function enterCreepToFinalPosState() {
  return creepToFinalPosState;
}

function creepToFinalPosState(bunny, dt) {
  bunny.color.set(0xff008a);
  if (bunny.position.distanceTo(bunny.finalPos) <= FINAL_POS_DIST)
    return enterFinalPosState({ bunny });

  tempVector.subVectors(bunny.finalPos, bunny.position).setY(0).normalize();

  const angle = Math.atan2(-tempVector.z, tempVector.x);

  tempVector.multiplyScalar(CREEP_SPEED * dt);

  bunny.position.add(tempVector);

  const destOrient = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, angle, 0, "YXZ")
  );
  bunny.quaternion.rotateTowards(destOrient, 10 * dt);

  return creepToFinalPosState;
}

function enterFinalPosState({ bunny }) {
  bunny.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
  bunny.position.copy(bunny.finalPos);

  return finalPosState;
}

function finalPosState(bunny, dt) {
  bunny.color.set(0x00a3ff);

  return finalPosState;
}

function enterGoToCarrotState({ bunny, carrot }) {
  bunny.targetCarrot = carrot;

  tempVector.subVectors(bunny.targetCarrot.position, bunny.position).setY(0);
  tempVector.normalize();

  bunny.hopDirection = tempVector.clone();

  bunny.numHops = 1;

  bunny.posBeforeHop = bunny.position.clone();

  bunny.waitTimer = null;

  return goToCarrotState;
}

function goToCarrotState(bunny, dt) {
  bunny.color.set(0xff8a00);
  if (
    bunny.targetCarrot.userData.isEaten ||
    bunny.position.distanceTo(bunny.targetCarrot.position) >
      NOTICE_CARROT_DIST_MAX
  ) {
    // lost interest in the carrot
    return enterWaitState({
      bunny,
      waitFor: 1,
    });
  }

  if (doHops(bunny, dt)) {
    if (
      bunny.position.distanceTo(bunny.targetCarrot.position) <= EAT_CARROT_DIST
    ) {
      return enterEatCarrotState({ bunny });
    }
    return enterGoToCarrotState({ bunny, carrot: bunny.targetCarrot });
  }

  return goToCarrotState;
}

function findNearbyCarrot(bunny) {
  for (let carrot of carrots) {
    if (
      !carrot.userData.isEaten &&
      bunny.position.distanceTo(carrot.position) <= NOTICE_CARROT_DIST
    ) {
      if (
        Math.abs(tempVector.subVectors(bunny.position, carrot.position).y) <=
        MAX_CARROT_Y_DIST
      ) {
        return carrot;
      }
    }
  }
  return null;
}

function enterWaitState({ bunny, waitFor }) {
  if (!isBunnyOnGround(bunny)) {
    console.error("Why is the bunny floating????");
  }

  bunny.position.y = bunny.initY;
  bunny.targetPos = null;
  bunny.targetCarrot = null;
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
  bunny.color.set(0x00ff00);

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
  const carrot = findNearbyCarrot(bunny);
  if (carrot) {
    return enterGoToCarrotState({ bunny, carrot });
  }

  if (
    bunny.position.distanceTo(playerWorldPos()) >= BEG_MAX_DIST ||
    !playerIsHoldingCarrot()
  ) {
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
  bunny.color.set(0xffff00);

  const carrot = findNearbyCarrot(bunny);
  if (carrot) {
    return enterGoToCarrotState({ bunny, carrot });
  }

  if (
    bunny.position.distanceTo(playerWorldPos()) >= CURIOUS_MAX_DIST ||
    !playerIsHoldingCarrot()
  ) {
    // We are too far away for the bunny to care, or we dropped the carrot
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

  return enterApproachState({ bunny });
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
  bunny.color.set(0xff00ff);

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
  bunny.color.set(0x0000ff);

  const carrot = findNearbyCarrot(bunny);
  if (carrot) {
    return enterGoToCarrotState({ bunny, carrot });
  }

  if (
    bunny.position.distanceTo(playerWorldPos()) >= CURIOUS_MAX_DIST ||
    !playerIsHoldingCarrot()
  ) {
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

function playerIsHoldingCarrot() {
  for (let gamepad of gamepads) {
    if (gamepad.hasCarrot) return true;
  }
  return false;
}

function waitState(bunny, dt) {
  bunny.color.set(0xff0000);

  if (bunny.isSentToFinalPos) {
    return enterGoToFinalPosState({ bunny });
  }

  const carrot = findNearbyCarrot(bunny);
  if (carrot) {
    return enterGoToCarrotState({ bunny, carrot });
  }

  if (
    playerIsHoldingCarrot() &&
    bunny.position.distanceTo(playerWorldPos()) < CURIOUS_STATE_CHANGE_DIST
  ) {
    return enterCuriousState({
      bunny,
      waitFor: 3,
    });
  }

  if (bunny.waitTimer > 0) {
    bunny.waitTimer -= dt;
    return waitState;
  }

  let hopDirection = new THREE.Vector3().randomDirection().setY(0);
  let numHops = Math.floor(Math.random() * 5 + 1);

  tempVector.copy(hopDirection);
  tempVector.multiplyScalar(numHops * HOP_LENGTH);
  tempVector.add(bunny.position);

  const bunnyGoingInsideRoom =
    tempVector.distanceTo(ground.position) < MIN_DIST_FROM_GROUND_CENTER &&
    bunny.position.distanceTo(ground.position) >
      tempVector.distanceTo(ground.position);

  const bunnyLeavingField =
    tempVector.distanceTo(ground.position) > MAX_DIST_FROM_GROUND_CENTER &&
    bunny.position.distanceTo(ground.position) <
      tempVector.distanceTo(ground.position);

  if (bunnyGoingInsideRoom || bunnyLeavingField) {
    hopDirection.negate();
  }

  return enterMoveState({
    bunny,
    hopDirection,
    numHops,
  });
}

export function update(dt) {
  for (const bunny of bunnies) {
    bunny.stateFn = bunny.stateFn(bunny, dt);

    tempMatrix.compose(bunny.position, bunny.quaternion, ONE);

    bunniesIMesh.setMatrixAt(bunny.index, tempMatrix);

    // bunniesIMesh.setColorAt(bunny.index, bunny.color);

    if (bunny.carrot) {
      bunny.carrot.position.set(0.24, 0, -0.08).applyMatrix4(tempMatrix);
      bunny.carrot.quaternion.copy(bunny.quaternion);
    }
  }

  if (bunnies.length > 0) {
    if (bunniesIMesh.intanceColor) {
      bunniesIMesh.instanceColor.needsUpdate = true;
    }
    bunniesIMesh.instanceMatrix.needsUpdate = true;
  }
}

export function allBunniesSentToFinalPos() {
  return bunnies.every(function (bunny) {
    return bunny.isSentToFinalPos;
  });
}
