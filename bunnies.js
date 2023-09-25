import * as THREE from "three";

import { onAllLoaded, bunnyGltf } from "./models.js";
import { scene, ground } from "./scene.js";

let bunnyMesh = null;

const SPEED = 3;
const TARGET_MAX_DIST = 10;

// 1 hop per unit closer to target pos
const HOP_RATE = 2;
const HOP_HEIGHT = 0.4;

// To stay away from the room
const MIN_DIST_FROM_GROUND_CENTER = 0;
const MAX_DIST_FROM_GROUND_CENTER = 20;

const bunnies = [];

const tempVector = new THREE.Vector3();

export function init() {
  bunnies.length = 0;

  onAllLoaded(function () {
    bunnyMesh = bunnyGltf.scene.children[0];
    bunnyMesh.castShadow = true;
  });
}

function randomOffsetPos(vec) {
  // We keep looping until we generate a position within bounds
  for (;;) {
    tempVector.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    tempVector.multiplyScalar(TARGET_MAX_DIST);

    // HACK(Apaar): I floor this because the distance must be an integer to start with
    // otherwise our Math.sin below will probably have the bunny start in the air (integer values
    // will always result in a Math.sin value of 0 since we multiply it by Math.PI / 2).
    tempVector.floor();

    const newPos = vec.clone().add(tempVector);

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

function moveState(bunny) {
    // HACK(Apaar): Because we only care about distance in the XZ plane
    bunny.position.y = bunny.userData.initY;

    tempVector.subVectors(bunny.userData.targetPos, bunny.position);

    const d = tempVector.length();

    tempVector.normalize();

    const angle = Math.atan2(-tempVector.z, tempVector.x);

    tempVector.multiplyScalar(SPEED * dt);

    bunny.position.add(tempVector);

    // TODO(Apaar): See if we can smoothly interpolate the rotation
    const destOrient = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, angle, 0, "YXZ")
    );

    bunny.quaternion.rotateTowards(destOrient, 10 * dt);

    bunny.position.y =
      bunny.userData.initY +
      Math.abs(Math.sin((d * HOP_RATE * Math.PI) / 2) * HOP_HEIGHT);

    const atTargetDist = SPEED / 50;

    if (d <= atTargetDist) {
      bunny.position.y = bunny.userData.initY;
      bunny.userData.targetPos = randomOffsetPos(bunny.position);

      // Wait after reaching the target
      bunny.userData.waitTimer = Math.random() * 2 + 1;
      
      return waitState;
    }

  return moveState;
}

function waitState(bunny, dt) {
  if(bunny.userData.waitTimer > 0) {
    bunny.userData.waitTimer -= dt;
    return waitState;
  }

  return moveState;
}

export function create(pos) {
  if (!bunnyMesh) {
    throw new Error("Only call 'create' inside or after 'onAllLoaded'");
  }

  const instance = bunnyMesh.clone();

  instance.position.copy(pos);

  instance.userData = {
    ...instance.userData,
    initY: pos.y,
    targetPos: randomOffsetPos(pos),
    waitTimer: 0,
    stateFn: waitState,
  };

  bunnies.push(instance);
  scene.add(instance);
}

export function update(dt) {
  for (const bunny of bunnies) {
    bunny.stateFn = bunny.stateFn(bunny, dt);
  }
}
