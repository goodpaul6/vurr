import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { renderer } from "./renderer.js";
import { onAllLoaded, groundGltf } from "./models.js";

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

export const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
export const hemiLight = new THREE.HemisphereLight(0xfcebc3, 0x3b653e);

const controllerModelFactory = new XRControllerModelFactory();
export let ground = null;
export let room = null;

export function init() {
  function onWindowResze() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", onWindowResze);

  scene.background = new THREE.Color(0x79c6d4);

  dirLight.position.set(1, 1, 1);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 500;

  scene.add(dirLight);
  scene.add(hemiLight);

  const controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );

  scene.add(controllerGrip1);

  const controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2)
  );

  scene.add(controllerGrip2);

  onAllLoaded(function () {
    ground = groundGltf.scene.children[0];
    ground.receiveShadow = true;
    scene.add(ground);
  });

  gltfLoader.load("public/room.glb", function (gltf) {
    room = gltf.scene;
    room.position.set(0, 0.1, 0);
    room.castShadow = true;
    scene.add(room);
  });
}
