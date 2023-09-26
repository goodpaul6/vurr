import * as THREE from "three";

import { onAllLoaded, bunnyGltf } from "./models.js";
import { scene, ground, ROOM_RADIUS } from "./scene.js";

const SPEED = 3;
const TARGET_MAX_DIST = 10;

// 1 hop per unit closer to target pos
const HOP_RATE = 2;
const HOP_HEIGHT = 0.4;

// To stay away from the room
const MIN_DIST_FROM_GROUND_CENTER = ROOM_RADIUS;
const MAX_DIST_FROM_GROUND_CENTER = 20;

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
    targetPos: randomOffsetPos(pos),
    finalPos: finalPos.clone(),
    waitTimer: 0,
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

    for (let y = 0; y < lines.length; ++y) {
      const line = lines[y];
      for (let x = 0; x < line.length; ++x) {
        if (line[x] !== "*") {
          continue;
        }

        const finalPos = new THREE.Vector3(x * 0.6 - 9, 0.16, y * 0.6 + 9);

        create(finalPos, finalPos);
      }
    }

    const bunnyMesh = bunnyGltf.scene.children[0];

    bunniesIMesh = new THREE.InstancedMesh(
      bunnyMesh.geometry,
      bunnyMesh.material,
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

function moveState(bunny, dt) {
  // HACK(Apaar): Because we only care about distance in the XZ plane
  bunny.position.y = bunny.initY;

  tempVector.subVectors(bunny.targetPos, bunny.position);

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
    bunny.initY + Math.abs(Math.sin((d * HOP_RATE * Math.PI) / 2) * HOP_HEIGHT);

  const atTargetDist = SPEED / 50;

  if (d <= atTargetDist) {
    bunny.position.y = bunny.initY;
    bunny.targetPos = randomOffsetPos(bunny.position);

    // Wait after reaching the target
    bunny.waitTimer = Math.random() * 2 + 1;

    return waitState;
  }

  return moveState;
}

function waitState(bunny, dt) {
  if (bunny.waitTimer > 0) {
    bunny.waitTimer -= dt;
    return waitState;
  }

  return moveState;
}

export function update(dt) {
  for (const bunny of bunnies) {
    bunny.stateFn = bunny.stateFn(bunny, dt);

    tempMatrix.compose(bunny.position, bunny.quaternion, ONE);
    bunniesIMesh.setMatrixAt(bunny.index, tempMatrix);
  }

  bunniesIMesh.instanceMatrix.needsUpdate = true;
}
