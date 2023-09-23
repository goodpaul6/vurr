import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const gltfLoader = new GLTFLoader();

// Array of functions that are called once all the models are loaded.
const allLoadedHandlers = [];

export let groundGltf = null;
export let bunnyGltf = null;
export let roomGltf = null;
export let doorGltf = null;
export let buttonGltf = null;

export function init() {
  gltfLoader.load("public/ground.glb", function (gltf) {
    groundGltf = gltf;
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
}

export function allLoaded() {
  return groundGltf && bunnyGltf && roomGltf && doorGltf && buttonGltf;
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
