// This file serves as one big main function
import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";

import { init as initRenderer, renderer } from "./renderer.js";
import { init as initScene, scene, camera } from "./scene.js";
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
import {
  init as initBunnies,
  create as createBunny,
  update as updateBunnies,
} from "./bunnies.js";
import { init as initDecor, update as updateDecor } from "./decor.js";
import { init as initBushes, update as updateBushes } from "./bushes.js";
import { init as initDoor, update as updateDoor, openDoor } from "./door.js";
import { init as initPhysics, update as updatePhysics } from "./physics.js";
import {
  init as initCarrots,
  create as createCarrot,
  update as updateCarrots,
} from "./carrots.js";

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

let stats = null;

onAllLoaded(function () {
  for (let i = 0; i < 8; ++i) {
    createBunny(new THREE.Vector3(0, 0.17, 0));
  }

  createButton(
    new THREE.Vector3(3.5, 0, 0),
    new THREE.Euler(0, Math.PI, 0),
    function (pressedControllers) {
      tap(pressedControllers);
      openDoor();
    }
  );

  createButton(
    new THREE.Vector3(0, 0, -2),
    null,
    function (pressedControllers) {
      tap(pressedControllers);
      createCarrot(new THREE.Vector3(0, 2, -1));
    }
  );

  stats = new Stats();
  
  stats.showPanel(0);

  document.body.appendChild(stats.dom);
});

let lastTS = 0;

const maxDt = 0.04;

function animate(ts) {
  ts /= 1000;

  const dt = Math.min(ts - lastTS, maxDt);
  lastTS = ts;

  updateModels();

  renderer.xr.setReferenceSpace(getReferenceSpace());

  if (!allLoaded()) {
    return;
  }

  updatePhysics();
  updateInput();
  updatePlayer();
  updateBunnies(dt);
  updateDecor(ts);
  updateButtons();
  updateBushes(ts);
  updateDoor();
  updateCarrots();

  renderer.render(scene, camera);

  stats.update();
}

renderer.setAnimationLoop(animate);
