import * as THREE from "three";

import { scene } from "./scene.js";
import { onAllLoaded, buttonGltf } from "./models.js";
import { controllers } from "./input.js";

export let button = null;
export let pressableButton = null;

export function init() {
  onAllLoaded(function () {
    button = buttonGltf.scene;
    button.castShadow = true;

    button.position.set(0, 0, -1);

    pressableButton = button.children.filter(function (c) {
      return c.name.includes("button");
    })[0];
    pressableButton.userData.initPos = pressableButton.position.clone();

    scene.add(button);
  });
}

export function update() {
  let isPressed = false;
  for (const controller of controllers) {
    // Force an update - we don't see the updated matrix world ever otherwise
    controller.updateMatrixWorld(true);

    // These are their positions in the world
    let controllerPos = new THREE.Vector3().setFromMatrixPosition(
      controller.matrixWorld
    );
    let buttonPos = new THREE.Vector3().setFromMatrixPosition(
      pressableButton.matrixWorld
    );
    if (buttonPos.distanceTo(controllerPos) < 0.1) {
      isPressed = true;
    }
  }
  pressableButton.userData.isPressed = isPressed;
  if (isPressed) {
    let vector = new THREE.Vector3(0, -0.01, 0);
    vector = vector.applyAxisAngle(new THREE.Vector3(0, 0, 1), -0.36600252546);
    const maxButtonTravelDist = 0.025;
    if (
      pressableButton.position.distanceTo(pressableButton.userData.initPos) >=
      maxButtonTravelDist
    ) {
      pressableButton.position.copy(
        vector
          .normalize()
          .multiplyScalar(maxButtonTravelDist)
          .add(pressableButton.userData.initPos)
      );
      return;
    }
    pressableButton.position.add(vector);
  } else {
    pressableButton.userData.isPressed = false;
    if (
      pressableButton.position.distanceTo(pressableButton.userData.initPos) <=
      0.00001
    ) {
      pressableButton.position.copy(pressableButton.userData.initPos);
      return;
    }
    let vector = new THREE.Vector3(0, 0.001, 0);
    vector = vector.applyAxisAngle(new THREE.Vector3(0, 0, 1), -0.36600252546);
    pressableButton.position.add(vector);
  }
}
