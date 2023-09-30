import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const gltfLoader = new GLTFLoader();
const audioLoader = new THREE.AudioLoader();

// Array of functions that are called once all the models are loaded.
const allLoadedHandlers = [];

export let groundGltf = null;
export let bunnyGltf = null;
export let roomGltf = null;
export let doorGltf = null;
export let buttonGltf = null;
export let grassBladeGltf = null;
export let flowerGltf = null;
export let bushGltf = null;
export let carrotGltf = null;
export let cloudGltf = null;
export let skyboxGltf = null;
export let valleyGltf = null;

export let buttonClickSoundBuffer = null;
export let doorOpenLoopSoundBuffer = null;
export let doorOpenClickSoundBuffer = null;

export let outroBuffer = null;

export function init() {
  gltfLoader.load("public/ground.glb", function (gltf) {
    groundGltf = gltf;
  });

  gltfLoader.load("public/grass_blade.glb", function (gltf) {
    grassBladeGltf = gltf;
  });

  gltfLoader.load("public/flower.glb", function (gltf) {
    flowerGltf = gltf;
  });

  gltfLoader.load("public/bunny.glb", function (gltf) {
    bunnyGltf = gltf;
  });

  gltfLoader.load("public/room.glb", function (gltf) {
    roomGltf = gltf;
  });

  gltfLoader.load("public/door.glb", function (gltf) {
    doorGltf = gltf;
  });

  gltfLoader.load("public/button.glb", function (gltf) {
    buttonGltf = gltf;
  });

  gltfLoader.load("public/bush_1.glb", function (gltf) {
    bushGltf = gltf;
  });

  gltfLoader.load("public/carrot.glb", function (gltf) {
    carrotGltf = gltf;
  });

  gltfLoader.load("public/cloud.glb", function (gltf) {
    cloudGltf = gltf;
  });

  gltfLoader.load("public/skybox.glb", function (gltf) {
    skyboxGltf = gltf;
  });

  gltfLoader.load("public/valley.glb", function (gltf) {
    valleyGltf = gltf;
  });

  audioLoader.load("public/button_click.ogg", function (buffer) {
    buttonClickSoundBuffer = buffer;
  });

  audioLoader.load("public/door_open_loop.ogg", function (buffer) {
    doorOpenLoopSoundBuffer = buffer;
  });

  audioLoader.load("public/door_open_click.ogg", function (buffer) {
    doorOpenClickSoundBuffer = buffer;
  });

  audioLoader.load("public/outro.ogg", function (buffer) {
    outroBuffer = buffer;
  });
}

export function allLoaded() {
  return (
    groundGltf &&
    bunnyGltf &&
    roomGltf &&
    doorGltf &&
    buttonGltf &&
    grassBladeGltf &&
    bushGltf &&
    carrotGltf &&
    flowerGltf &&
    cloudGltf &&
    skyboxGltf &&
    valleyGltf &&
    buttonClickSoundBuffer &&
    doorOpenLoopSoundBuffer &&
    doorOpenClickSoundBuffer &&
    outroBuffer
  );
}

// Function will be called if/once all models are loaded.
export function onAllLoaded(fn) {
  if (
    allLoadedHandlers.find(function (fv) {
      return fv.fn === fn;
    })
  ) {
    return;
  }

  let called = false;

  if (allLoaded()) {
    // If we're already loaded then just call it and mark it as such
    fn();
    called = true;
  }

  allLoadedHandlers.push({
    fn,
    called,
  });
}

// Polls for whether all the models are loaded and calls the handlers at that time.
export function update() {
  if (!allLoaded()) {
    return;
  }

  for (const handler of allLoadedHandlers) {
    if (handler.called) {
      continue;
    }

    handler.fn();
    handler.called = true;
  }
}
