import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { renderer } from "./renderer.js";
import {
  onAllLoaded,
  groundGltf,
  roomGltf,
  skyboxGltf,
  valleyGltf,
} from "./models.js";
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
export const listener = new THREE.AudioListener();

export const dirLight = new THREE.DirectionalLight(0xffffff, 0.1);
export const hemiLight = new THREE.HemisphereLight(0xfcebc3, 0x3b653e, 0.1);

export const ROOM_RADIUS = 8;

export let ground = null;
export let room = null;
export let skybox = null;
export let valley = null;
export let groundBody = null;
export let roomBody = null;

let roomText = null;

const controllerModelFactory = new XRControllerModelFactory();

export function init() {
  function onWindowResze() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", onWindowResze);

  scene.background = new THREE.Color(0x79c6d4);

  camera.add(listener);

  dirLight.position.set(10, 13, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 512;
  dirLight.shadow.mapSize.height = 512;
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
      specular: 0x000000,
    });
    scene.add(ground);

    room = roomGltf.scene;
    room.position.set(0, 0.02, 0);
    for (const child of room.children) {
      child.castShadow = true;
    }
    scene.add(room);

    skybox = skyboxGltf.scene.children[0];
    skybox.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      depthWrite: false,
    });
    skybox.position.setY(25);
    skybox.scale.set(50, 50, 50);

    scene.add(skybox);

    valley = valleyGltf.scene;
    valley.scale.set(40, 40, 40);
    valley.position.set(0, -60, 0);

    for (const child of valley.children) {
      child.material = new THREE.MeshLambertMaterial({
        map: child.material.map,
        color: child.material.color,
      });
    }

    scene.add(valley);

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

      roomText = room.children.find(function (child) {
        return child.name === "title";
      });

      roomText.material = new THREE.MeshBasicMaterial({
        color: roomText.material.color,
      });

      roomText.userData.initY = roomText.position.y;

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

export function update(elapsed) {
  roomText.position.y = Math.sin(elapsed * 4) * 0.1 + roomText.userData.initY;

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
