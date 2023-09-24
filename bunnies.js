import * as THREE from "three";

import { onAllLoaded, bunnyGltf } from "./models.js";
import { scene, ground } from "./scene.js";

let bunnyMesh = null;

const SPEED = 3;
const TARGET_MAX_DIST = 10;

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

export function create(pos) {
  if (!bunnyMesh) {
    throw new Error("Only call 'create' inside or after 'onAllLoaded'");
  }

  const instance = bunnyMesh.clone();

  instance.position.set(pos.x, pos.y, pos.z);

  instance.userData = {
    ...instance.userData,
    targetPos: randomOffsetPos(pos),
    waitTimer: 0,
  };

  bunnies.push(instance);
  scene.add(instance);
}

export function update(dt) {
  for (const bunny of bunnies) {
    if (bunny.userData.waitTimer > 0) {
      bunny.userData.waitTimer -= dt;
      continue;
    }

    tempVector.subVectors(bunny.userData.targetPos, bunny.position);

    const d2 = tempVector.lengthSq();

    tempVector.normalize();

    const angle = Math.atan2(-tempVector.z, tempVector.x);

    tempVector.multiplyScalar(SPEED * dt);

    bunny.position.add(tempVector);
    bunny.rotation.set(0, angle, 0, "YXZ");

    const atTargetDist = SPEED / 50;

    if (d2 < atTargetDist * atTargetDist) {
      bunny.userData.targetPos = randomOffsetPos(bunny.position);
      // Potentially wait after reaching the target
      if (Math.random() > 0.8) {
        bunny.userData.waitTimer = Math.random() * 2 + 2;
      }
    }
  }
}
