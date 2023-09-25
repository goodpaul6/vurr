// This file serves as one big main function
import * as THREE from "three";

import { init as initRenderer, renderer } from "./renderer.js";
import { init as initScene, scene, camera } from "./scene.js";
import { init as initInput, update as updateInput } from "./input.js";
import {
  init as initButtons,
  create as createButton,
  update as updateButtons,
} from "./buttons.js";
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
import { init as initGrass, update as updateGrass } from "./decor.js";

initRenderer();
initScene();
initInput();
initPlayer();
initModels();
initButtons();
initBunnies();
initGrass();

let door = null;

onAllLoaded(function () {
  for (let i = 0; i < 8; ++i) {
    createBunny(new THREE.Vector3(0, 0.17, 0));
  }

  createButton(new THREE.Vector3(0, 0, -1), function () {
    console.log("Pressed!");
  });

  createButton(new THREE.Vector3(0, 0, -2), function () {
    console.log("Pressed B!");
  });

  door = doorGltf.scene;
  door.position.set(0, 0.1, 0);
  door.castShadow = true;
  scene.add(door);
});

let lastTS = 0;

function animate(ts) {
  ts /= 1000;

  const dt = ts - lastTS;
  lastTS = ts;

  updateModels();

  renderer.xr.setReferenceSpace(getReferenceSpace());

  if (!allLoaded()) {
    return;
  }

  updateInput();
  updatePlayer();
  updateBunnies(dt);
  updateGrass(ts);
  updateButtons();

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
