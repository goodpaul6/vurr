import * as THREE from "three";

import { scene } from "./scene.js";
import { onAllLoaded, carrotGltf } from "./models.js";
import { createCapsuleBody, updateObjectFromBody } from "./physics.js";

let carrotScene = null;

const carrots = [];

const CAPSULE_HALF_HEIGHT = 0.04;
const CAPSULE_RADIUS = 0.03;
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

  const capsule = new THREE.Mesh(geom, mat);
  capsule.position.copy(CAPSULE_OFFSET);
  //instance.add(capsule);

  carrots.push(instance);
  scene.add(instance);
}

export function update() {
  for (const carrot of carrots) {
    updateObjectFromBody(carrot, carrot.userData.body);
  }
}
