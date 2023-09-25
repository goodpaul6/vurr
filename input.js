import { renderer } from "./renderer.js";
import { camera } from "./scene.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export const controllers = [
  renderer.xr.getController(0),
  renderer.xr.getController(1),
];

export const gamepads = [];

let controls = null;

export function init() {
  controls = new OrbitControls(camera, renderer.domElement);

  camera.position.set(0, 3, 3);
  controls.update();

  for (const controller of controllers) {
    controller.addEventListener("connected", function (event) {
      if (event.data.gamepad) {
        event.data.gamepad.controller = controller;
        gamepads.push(event.data.gamepad);
        controller.gamepad = event.data.gamepad;
      }
    });
  }
}

export function update() {
  controls.update();
}

export function tap(controllers) {
  for (const controller of controllers) {
    if (!controller.gamepad || !controller.gamepad.vibrationActuator) continue;
    controller.gamepad.vibrationActuator.playEffect("dual-rumble", {
      duration: 10,
      strongMagnitude: 1.0,
    });
  }
}
