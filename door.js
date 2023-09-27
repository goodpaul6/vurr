import * as THREE from "three";

import { onAllLoaded, doorGltf } from "./models.js";
import { scene, dirLight, hemiLight } from "./scene.js";
import {
  onPhysicsLoaded,
  createCuboidBody,
  setBodyType,
  BODY_TYPE_POSN_KINEMATIC,
} from "./physics.js";

export let doorScene = null;
let collider = null;

const FINAL_DIR_LIGHT_INTENSITY = 0.5;
const FINAL_HEMI_LIGHT_INTENSITY = 1.0;

let initDirLightIntensity = null;
let initHemiLightIntensity = null;

const maxHeight = 2.3;

export function init() {
  onAllLoaded(function () {
    initDirLightIntensity = dirLight.intensity;
    initHemiLightIntensity = hemiLight.intensity;

    doorScene = doorGltf.scene;

    doorScene.children.forEach(function (child) {
      if (child.name === "collider") {
        child.visible = false;
        collider = child;
      }
    });

    doorScene.userData.isOpen = false;
    doorScene.position.set(0, 0.02, 0);
    doorScene.userData.initY = doorScene.position.y;
    doorScene.castShadow = true;

    scene.add(doorScene);

    onPhysicsLoaded(function () {
      const min = collider.geometry.boundingBox.min.clone();
      const max = collider.geometry.boundingBox.max.clone();

      const mat = new THREE.Matrix4().compose(
        collider.position,
        collider.quaternion,
        collider.scale
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
  doorScene.userData.body.setNextKinematicTranslation(
    collider.getWorldPosition(new THREE.Vector3())
  );

  const t =
    (doorScene.position.y - doorScene.userData.initY) /
    (maxHeight - doorScene.userData.initY);

  dirLight.intensity =
    t * FINAL_DIR_LIGHT_INTENSITY + (1 - t) * initDirLightIntensity;
  hemiLight.intensity =
    t * FINAL_HEMI_LIGHT_INTENSITY + (1 - t) * initHemiLightIntensity;
}
