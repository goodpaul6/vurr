import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { renderer } from "./renderer.js";
import { onAllLoaded, groundGltf, roomGltf } from "./models.js";
import {
  onPhysicsLoaded,
  createCylinderBody,
  createEmptyBody,
  createAndAttachCuboidCollider,
  DEBUG_MODE as PHYSICS_DEBUG_MODE,
  forEachBody,
} from "./physics.js";

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

export const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
export const hemiLight = new THREE.HemisphereLight(0xfcebc3, 0x3b653e);

export const ROOM_RADIUS = 8;

export let ground = null;
export let room = null;
export let groundBody = null;
export let roomBody = null;

const controllerModelFactory = new XRControllerModelFactory();

export function init() {
  function onWindowResze() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", onWindowResze);

  scene.background = new THREE.Color(0x79c6d4);

  dirLight.position.set(10, 10, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 500;
  dirLight.shadow.camera.left = -20;
  dirLight.shadow.camera.right = 20;
  dirLight.shadow.camera.top = 20;
  dirLight.shadow.camera.bottom = -20;

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

    // NOTE(Apaar): This is a major GPU fragment optimization
    ground.material = new THREE.MeshPhongMaterial({
      color: ground.material.color,
    });
    scene.add(ground);

    room = roomGltf.scene;
    room.position.set(0, 0.02, 0);
    for (const child of room.children) {
      child.castShadow = true;
    }
    scene.add(room);

    onPhysicsLoaded(function () {
      // FIXME(Apaar): For some reason the debug geometry for this shows up correctly but
      // this is actually not large enough to cover the ground, wild...
      groundBody = createCylinderBody({
        halfHeight: 0.5,
        radius: 24.7,
        position: new THREE.Vector3(),
        colliderOffset: new THREE.Vector3(0, -0.5, 0),
      });

      roomBody = createEmptyBody({
        position: room.position.clone(),
      });

      for (const mesh of room.children) {
        const min = mesh.geometry.boundingBox.min;
        const max = mesh.geometry.boundingBox.max;

        const mat = new THREE.Matrix4();
        mat.makeRotationFromQuaternion(mesh.quaternion);

        min.applyMatrix4(mat);
        max.applyMatrix4(mat);

        const center = new THREE.Vector3()
          .addScaledVector(min, 0.5)
          .addScaledVector(max, 0.5);

        const size = new THREE.Vector3().subVectors(max, min);

        createAndAttachCuboidCollider({
          body: roomBody,
          // HACK(Apaar): We do Math.max because some meshes are tooo thin
          hx: Math.max(Math.abs(size.x) / 2, 0.05),
          hy: Math.max(Math.abs(size.y) / 2, 0.05),
          hz: Math.max(Math.abs(size.z) / 2, 0.05),
          offset: center,
        });
      }
    });
  });
}

export function update() {
  if (!PHYSICS_DEBUG_MODE) {
    return;
  }

  // Add body objects to scene if they haven't been added
  forEachBody(function (body) {
    if (!body.obj || body.obj.parent) {
      return;
    }

    scene.add(body.obj);
  });
}
