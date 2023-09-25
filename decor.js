import * as THREE from "three";

import { onAllLoaded, grassBladeGltf, flowerGltf } from "./models.js";
import { scene, ground } from "./scene.js";

const blades = [];
const flowers = [];

function addRandomDecor(mesh, decorArr) {
    const v = new THREE.Vector3();
    const groundRadius = ground.geometry.boundingSphere.radius * ground.scale.x;

    for (let i = 0; i < 150; ++i) {
      v.randomDirection();
      v.y = 0;

      v.multiplyScalar(groundRadius / 2.0);

      const count = Math.floor(Math.random() * 5 + 4);

      for (let i = 0; i < count; ++i) {
        const bladeInstance = mesh.clone();

        bladeInstance.position.copy(v);
        bladeInstance.position.add(
          new THREE.Vector3().randomDirection().setY(0)
        );

        bladeInstance.scale.x = Math.random();
        bladeInstance.scale.z = bladeInstance.scale.x;

        if (bladeInstance.scale.lengthSq() < 0.2) {
          continue;
        }

        decorArr.push(bladeInstance);
        scene.add(bladeInstance);
      }
    }
}

export function init() {
  blades.length = 0;
  onAllLoaded(function () {
    if (!ground) {
      throw new Error("Must init decor.js after initting scene.js");
    }
    const bladeMesh = grassBladeGltf.scene.children[0];
    addRandomDecor(bladeMesh, blades);

    const flowerMesh = flowerGltf.scene;
    addRandomDecor(flowerMesh, flowers);
  });
}

function updateRandomDecor(decorArr, elapsed, offset) {
  for (const decor of decorArr) {
    decor.rotation.set(
      (Math.sin(elapsed * 4 + decor.position.x + decor.position.z) * Math.PI) /
        8 +
        offset,
      0,
      0
    );
  }

}

export function update(elapsed) {
  updateRandomDecor(blades, elapsed, Math.PI / 2);
  updateRandomDecor(flowers, elapsed, 0);
}
