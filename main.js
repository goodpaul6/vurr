// This file serves as one big main function

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
  bunnyGltf,
  doorGltf,
} from "./models.js";

initRenderer();
initScene();
initInput();
initPlayer();
initModels();
initButtons();

let bunny = null;
let door = null;

onAllLoaded(function () {
  bunny = bunnyGltf.scene.children[0];
  bunny.castShadow = true;

  for (let i = 0; i < 8; ++i) {
    const bunnyInstance = bunny.clone();
    bunnyInstance.position.set(i * 4 - 8, 0, -5);

    scene.add(bunnyInstance);
  }

  door = doorGltf.scene;
  door.position.set(0, 0.1, 0);
  door.castShadow = true;
  scene.add(door);
});

function animate() {
  updateModels();

  renderer.xr.setReferenceSpace(getReferenceSpace());

  // TODO(Apaar): Clean this up omg
  updateInput();
  updatePlayer();

  if (bunny) {
    bunny.rotation.z += 0.01;
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
