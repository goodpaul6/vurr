import * as THREE from "three";

import { listener, scene } from "./scene.js";
import { onAllLoaded, buttonGltf, buttonClickSoundBuffer } from "./models.js";
import { controllers } from "./input.js";

export const buttons = [];

let buttonScene = null;

export function init() {
  buttons.length = 0;

  onAllLoaded(function () {
    buttonScene = buttonGltf.scene;
    buttonScene.castShadow = true;
  });
}

export function create(pos, rot, color, onPressFn) {
  if (!buttonScene) {
    throw new Error("Create must be called inside or after onAllLoaded.");
  }

  const instance = buttonScene.clone();

  instance.position.copy(pos);

  if (rot) {
    instance.rotation.copy(rot);
  }

  const pressable = instance.children.find(function (c) {
    return c.name.includes("button");
  });

  instance.userData.pressable = pressable;

  instance.updateMatrixWorld(true);
  pressable.updateMatrixWorld(true);

  pressable.userData.initMatrixWorld = pressable.matrixWorld.clone();
  pressable.userData.initPos = pressable.position.clone();

  // HACK(Apaar): We're not supposed to put this in here but who cares, we'll never
  // clone the instance (hopefully).
  pressable.userData.onPressFn = onPressFn;

  const sound = new THREE.PositionalAudio(listener);

  pressable.userData.sound = sound;

  sound.setBuffer(buttonClickSoundBuffer);
  sound.setRefDistance(0.3);

  pressable.add(sound);

  if (color) {
    // threejs objects share the same material by default
    pressable.material = pressable.material.clone();
    pressable.material.color = color;
  }

  buttons.push(instance);
  scene.add(instance);
}

export function update() {
  buttonLoop: for (const button of buttons) {
    const pressableButton = button.userData.pressable;

    let controllersPressingButton = [];
    for (const controller of controllers) {
      // Force an update - we don't see the updated matrix world ever otherwise
      controller.updateMatrixWorld(true);

      // These are their positions in the world
      let controllerPos = new THREE.Vector3().setFromMatrixPosition(
        controller.matrixWorld
      );

      let buttonPos = new THREE.Vector3().setFromMatrixPosition(
        pressableButton.userData.initMatrixWorld
      );

      // TODO(Apaar): Prevent the player from pushing buttons from underneath
      if (buttonPos.distanceTo(controllerPos) < 0.1) {
        controllersPressingButton.push(controller);
      }
    }

    if (controllersPressingButton.length > 0) {
      if (!pressableButton.userData.wasPressed) {
        pressableButton.userData.onPressFn(controllersPressingButton);
        pressableButton.userData.sound.stop();
        pressableButton.userData.sound.play();
      }

      const maxButtonTravelDist = 0.025;

      let vector = new THREE.Vector3(0, -0.01, 0);
      vector = vector.applyAxisAngle(
        new THREE.Vector3(0, 0, 1),
        -0.36600252546
      );

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
        continue buttonLoop;
      }

      pressableButton.position.add(vector);
    } else {
      if (
        pressableButton.position.distanceTo(pressableButton.userData.initPos) <=
        0.001
      ) {
        pressableButton.position.copy(pressableButton.userData.initPos);
        continue buttonLoop;
      }

      let vector = new THREE.Vector3(0, 0.001, 0);
      vector = vector.applyAxisAngle(
        new THREE.Vector3(0, 0, 1),
        -0.36600252546
      );

      pressableButton.position.add(vector);
    }

    // We don't set it until after so that we can check above that it was the first time the button
    // was pressed and call the onPressFn.
    pressableButton.userData.wasPressed = controllersPressingButton.length > 0;
  }
}
