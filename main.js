// This file serves as one big main function
import * as THREE from "three";

import { init as initRenderer, renderer } from "./renderer.js";
import { init as initScene, scene, camera } from "./scene.js";
import { init as initInput, update as updateInput } from "./input.js";
import { init as initButtons } from "./buttons.js";
import {
  getReferenceSpace,
  init as initPlayer,
  update as updatePlayer,
} from "./player.js";
import {
  init as initModels,
  update as updateModels,
  onAllLoaded,
  doorGltf,
  allLoaded,
} from "./models.js";
import {
  init as initBunnies,
  create as createBunny,
  update as updateBunnies,
} from "./bunnies.js";

initRenderer();
initScene();
initInput();
initPlayer();
initModels();
initButtons();
initBunnies();

let door = null;

onAllLoaded(function () {
  for (let i = 0; i < 100; ++i) {
    createBunny(new THREE.Vector3(0, 0.17, 0));
  }

  door = doorGltf.scene;
  door.position.set(0, 0.1, 0);
  door.castShadow = true;
  scene.add(door);
});

let lastTS = 0;

function animate(ts) {
  const dt = (ts - lastTS) / 1000;
  lastTS = ts;

  updateModels();

  renderer.xr.setReferenceSpace(getReferenceSpace());

  if (!allLoaded()) {
    return;
  }

  // TODO(Apaar): Clean this up omg
  updateInput();
  updatePlayer();
  updateBunnies(dt);

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
