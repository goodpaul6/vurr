// This file serves as one big main function

// Spawn as many bunnies as necessary to spell HBD HORATIU
// and every time he feeds one it goes to its place in the
// words.
//
// Actually, since there are 116 bunnies, for every carrot you feed,
// a random sample of 10 of them go into position.

import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";

import { init as initRenderer, renderer } from "./renderer.js";
import {
  init as initScene,
  update as updateScene,
  scene,
  camera,
} from "./scene.js";
import { init as initInput, update as updateInput, tap } from "./input.js";
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
  allLoaded,
} from "./models.js";
import { init as initBunnies, update as updateBunnies } from "./bunnies.js";
import { init as initDecor, update as updateDecor } from "./decor.js";
import { init as initBushes, update as updateBushes } from "./bushes.js";
import { init as initDoor, update as updateDoor, openDoor } from "./door.js";
import { init as initPhysics, update as updatePhysics } from "./physics.js";
import {
  init as initCarrots,
  create as createCarrot,
  update as updateCarrots,
} from "./carrots.js";
import { init as initClouds, update as updateClouds } from "./clouds.js";

initPhysics();
initRenderer();
initScene();
initInput();
initPlayer();
initModels();
initButtons();
initBunnies();
initDecor();
initBushes();
initDoor();
initCarrots();
initClouds();

onAllLoaded(function () {
  createButton(
    new THREE.Vector3(3.5, 0, 0),
    new THREE.Euler(0, Math.PI, 0),
    null,
    function (pressedControllers) {
      tap(pressedControllers);
      openDoor();
    }
  );

  createButton(
    new THREE.Vector3(0, 0, -2),
    null,
    new THREE.Color(0xe07a36),
    function (pressedControllers) {
      tap(pressedControllers);
      createCarrot(new THREE.Vector3(0, 1.5, 0));
    }
  );
});

let lastTS = 0;

const maxDt = 0.04;

let frames = 0;
let timeSinceLastLoggedFrames = 0;

function animate(ts) {
  ts /= 1000;

  const dt = Math.min(ts - lastTS, maxDt);
  lastTS = ts;

  frames += 1;
  timeSinceLastLoggedFrames += dt;

  if (timeSinceLastLoggedFrames >= 1) {
    console.log("FPS: ", frames);
    frames = 0;
    timeSinceLastLoggedFrames -= 1;
  }

  updateModels();

  renderer.xr.setReferenceSpace(getReferenceSpace());

  if (!allLoaded()) {
    return;
  }

  updateScene(ts);
  updateInput();
  updatePlayer();
  updateBunnies(dt);
  updateDecor(ts);
  updateButtons();
  updateBushes(ts);
  updateDoor();
  updateCarrots();
  updateClouds();

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
setInterval(updatePhysics, 1000 / 60);
