import { scene } from "./scene.js";
import { onAllLoaded, buttonGltf } from "./models.js";

export let button = null;

export function init() {
  onAllLoaded(function () {
    button = buttonGltf.scene;
    button.castShadow = true;
    scene.add(button);
  });
}