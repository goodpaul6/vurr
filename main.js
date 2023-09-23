// This file serves as one big main function

import { init as initRenderer, renderer } from "./renderer.js";
import { init as initScene, scene, camera, gltfLoader } from "./scene.js";
import { init as initInput, update as updateInput } from "./input.js";
import {
  getReferenceSpace,
  init as initPlayer,
  update as updatePlayer,
} from "./player.js";

initRenderer();
initScene();
initInput();
initPlayer();

let bunny = null;
let room = null;
let door = null;

gltfLoader.load("public/bunny.glb", function (gltf) {
  bunny = gltf.scene.children[0];
  bunny.castShadow = true;

  for (let i = 0; i < 8; ++i) {
    const bunnyInstance = bunny.clone();
    bunnyInstance.position.set(i * 4 - 8, 0, -5);

    scene.add(bunnyInstance);
  }
});

gltfLoader.load("public/room.glb", function (gltf) {
  room = gltf.scene;
  room.position.set(0, 1, 0);
  room.castShadow = true;
  scene.add(room);
});

gltfLoader.load("public/door.glb", function (gltf) {
  door = gltf.scene;
  door.position.set(0, 1, 0);
  door.castShadow = true;
  scene.add(door);
});

function animate() {
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
