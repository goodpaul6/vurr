import * as THREE from "three";

import { scene } from "./scene.js";
import { onAllLoaded, carrotGltf } from "./models.js";
import {
  createCapsuleBody,
  updateObjectFromBody,
  setBodyType,
  BODY_TYPE_POSN_KINEMATIC,
  BODY_TYPE_DYNAMIC,
} from "./physics.js";
import { gamepads } from "./input.js";

let carrotScene = null;

export const carrots = [];

const CAPSULE_HALF_HEIGHT = 0.04;
const CAPSULE_RADIUS = 0.02;
const CAPSULE_OFFSET = new THREE.Vector3(0, 0.08, 0);

const geom = new THREE.CapsuleGeometry(CAPSULE_RADIUS, CAPSULE_HALF_HEIGHT * 2);
const mat = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.5,
});

export function init() {
  carrots.length = 0;

  onAllLoaded(function () {
    carrotScene = carrotGltf.scene;

    for (const child of carrotScene.children) {
      child.castShadow = true;
    }
  });
}

export function create(pos) {
  if (!carrotScene) {
    throw new Error("Must call carrots.js create inside or after onAllLoaded");
  }

  const instance = carrotScene.clone();

  const body = createCapsuleBody({
    position: pos.clone().add(new THREE.Vector3().random().multiplyScalar(0.5)),
    halfHeight: CAPSULE_HALF_HEIGHT,
    radius: CAPSULE_RADIUS,
    mass: 2,
    colliderOffset: CAPSULE_OFFSET,
  });

  instance.position.copy(pos);
  instance.userData.body = body;
  instance.userData.heldByGamepad = null;
  instance.userData.isEaten = false;

  const capsule = new THREE.Mesh(geom, mat);
  capsule.position.copy(CAPSULE_OFFSET);
  //instance.add(capsule);

  carrots.push(instance);
  scene.add(instance);
}

export function update() {
  const tempVector = new THREE.Vector3();
  const tempMatrix = new THREE.Matrix4();
  const tempQuat = new THREE.Quaternion();

  for (const carrot of carrots) {
    if (carrot.userData.isEaten) continue;
    const carrotWorldPos = carrot.getWorldPosition(new THREE.Vector3());

    for (const gamepad of gamepads) {
      const controller = gamepad.controller;

      // Make sure we have the matrix for the controller
      controller.updateMatrixWorld(true);

      tempMatrix.identity().extractRotation(controller.matrixWorld);

      tempVector.setFromMatrixPosition(controller.matrixWorld);
      tempQuat.setFromRotationMatrix(tempMatrix);

      const pressedValue = 0.4;

      if (carrot.userData.heldByGamepad === gamepad) {
        if (gamepad.buttons[1].value < pressedValue) {
          carrot.userData.heldByGamepad.hasCarrot = false;
          carrot.userData.heldByGamepad = null;

          setBodyType(carrot.userData.body, BODY_TYPE_DYNAMIC);
        } else {
          carrot.userData.body.setNextKinematicTranslation(tempVector);
          carrot.userData.body.setNextKinematicRotation(tempQuat);
        }
      } else if (
        !gamepad.hasCarrot &&
        !carrot.userData.heldByGamepad &&
        gamepad.buttons[1].value > pressedValue &&
        carrotWorldPos.distanceTo(tempVector) < 0.2
      ) {
        carrot.userData.heldByGamepad = gamepad;
        // HACK(Apaar): Very hacky
        gamepad.hasCarrot = true;

        setBodyType(carrot.userData.body, BODY_TYPE_POSN_KINEMATIC);
      }
    }

    updateObjectFromBody(carrot, carrot.userData.body);
  }
}
