import * as THREE from "three";

import { onAllLoaded, grassBladeGltf, flowerGltf } from "./models.js";
import { scene, ground } from "./scene.js";

const blades = [];
const flowers = [];

function addRandomDecor(mesh, decorArr, editFn) {
  const v = new THREE.Vector3();
  const groundRadius = ground.geometry.boundingSphere.radius * ground.scale.x;

  for (let i = 0; i < 100; ++i) {
    v.randomDirection();
    v.y = 0;

    v.multiplyScalar(groundRadius / 2.0);

    const count = Math.floor(Math.random() * 5 + 4);

    for (let i = 0; i < count; ++i) {
      const bladeInstance = mesh.clone();

      bladeInstance.position.copy(v);
      bladeInstance.position.add(new THREE.Vector3().randomDirection().setY(0));

      editFn(bladeInstance);

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
    const bladeMesh = grassBladeGltf.scene;

    addRandomDecor(bladeMesh, blades, function (instance) {
      instance.scale.z = Math.random();
      instance.scale.y = instance.scale.z;
    });

    const flowerMesh = flowerGltf.scene;

    addRandomDecor(flowerMesh, flowers, function (instance) {
      instance.scale.x = Math.random();
      instance.scale.z = instance.scale.x;
    });
  });
}

function updateRandomDecor(decorArr, elapsed) {
  for (const decor of decorArr) {
    decor.rotation.set(
      (Math.sin(elapsed * 4 + decor.position.x + decor.position.z) * Math.PI) /
        8,
      0,
      0
    );
  }
}

export function update(elapsed) {
  updateRandomDecor(blades, elapsed);
  updateRandomDecor(flowers, elapsed);
}
