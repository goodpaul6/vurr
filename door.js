import * as THREE from "three";

import { onAllLoaded, doorGltf } from "./models.js";
import { scene } from "./scene.js";

export let doorScene = null;

const maxHeight = 2.3;

export function init() {
  onAllLoaded(function () {
    doorScene = doorGltf.scene;
    doorScene.userData.isOpen = false;
    doorScene.position.set(0, 0.02, 0);
    doorScene.castShadow = true;
    scene.add(doorScene);
  });
}

export function openDoor() {
  doorScene.userData.isOpen = true;
}

export function update() {
  if (!doorScene.userData.isOpen) return;
  if (doorScene.position.y >= maxHeight) return;
  doorScene.position.add(new THREE.Vector3(0, 0.008, 0));
}
