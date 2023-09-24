import * as THREE from "three";

import { onAllLoaded, grassBladeGltf } from "./models.js";
import { scene, ground } from "./scene.js";

const blades = [];

export function init() {
  blades.length = 0;
  onAllLoaded(function () {
    const v = new THREE.Vector3();

    if (!ground) {
      throw new Error("Must init grass.js after initting scene.js");
    }

    const groundRadius = ground.geometry.boundingSphere.radius * ground.scale.x;

    const bladeMesh = grassBladeGltf.scene.children[0];

    for (let i = 0; i < 200; ++i) {
      v.randomDirection();
      v.y = 0;

      v.multiplyScalar(groundRadius / 2.0);

      const count = Math.floor(Math.random() * 5 + 4);

      for (let i = 0; i < count; ++i) {
        const bladeInstance = bladeMesh.clone();

        bladeInstance.position.copy(v);
        bladeInstance.position.add(
          new THREE.Vector3().randomDirection().setY(0)
        );

        bladeInstance.scale.x = Math.random();
        bladeInstance.scale.z = bladeInstance.scale.x;

        blades.push(bladeInstance);
        scene.add(bladeInstance);
      }
    }
  });
}

export function update(elapsed) {
  for (const blade of blades) {
    blade.rotation.set(
      (Math.sin(elapsed * 4 + blade.position.x + blade.position.z) * Math.PI) /
        8 +
        Math.PI / 2,
      0,
      0
    );
  }
}
