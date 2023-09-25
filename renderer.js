import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

export const renderer = new THREE.WebGLRenderer({ antialias: true });
export let baseReferenceSpace = null;

export function init() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", onWindowResize, false);

  renderer.xr.addEventListener("sessionstart", function () {
    baseReferenceSpace = renderer.xr.getReferenceSpace();
  });

  renderer.xr.enabled = true;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
}
