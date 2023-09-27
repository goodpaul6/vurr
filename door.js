import * as THREE from "three";

import { onAllLoaded, doorGltf } from "./models.js";
import { scene } from "./scene.js";
import {
  onPhysicsLoaded,
  createCuboidBody,
  setBodyType,
  BODY_TYPE_POSN_KINEMATIC,
} from "./physics.js";

export let doorScene = null;

const maxHeight = 2.3;

export function init() {
  onAllLoaded(function () {
    doorScene = doorGltf.scene;

    let collider = null;

    doorScene.children.forEach(function (child) {
      if (child.name === "collider") {
        child.visible = false;
        collider = child;
      }
    });

    doorScene.userData.isOpen = false;
    doorScene.position.set(0, 0.02, 0);
    doorScene.castShadow = true;

    scene.add(doorScene);

    onPhysicsLoaded(function () {
      collider.geometry.computeBoundingBox();

      const min = collider.geometry.boundingBox.min
        .clone()
        .multiply(collider.scale);
      const max = collider.geometry.boundingBox.max
        .clone()
        .multiply(collider.scale);

      const mat = new THREE.Matrix4().compose(
        collider.position,
        collider.quaternion,
        new THREE.Vector3(1, 1, 1)
      );

      min.applyMatrix4(mat);
      max.applyMatrix4(mat);

      const center = new THREE.Vector3()
        .addScaledVector(min, 0.5)
        .addScaledVector(max, 0.5);

      const size = new THREE.Vector3().subVectors(max, min);

      doorScene.userData.body = createCuboidBody({
        position: center,
        hx: size.x / 2,
        hy: size.y / 2,
        hz: size.z / 2,
      });

      setBodyType(doorScene.userData.body, BODY_TYPE_POSN_KINEMATIC);
    });
  });
}

export function openDoor() {
  doorScene.userData.isOpen = true;
}

export function update() {
  if (!doorScene.userData.isOpen) return;
  if (doorScene.position.y >= maxHeight) return;

  doorScene.position.add(new THREE.Vector3(0, 0.008, 0));
  doorScene.userData.body.setNextKinematicPosition(doorScene.position);
}
