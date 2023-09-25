import * as THREE from "three";

import { onAllLoaded, bushGltf } from "./models.js";
import { scene, ground } from "./scene.js";

const bushes = [];

export function init() {
  bushes.length = 0;

  onAllLoaded(function () {
    if (!ground) {
      throw new Error("Please call bushes.js init after scene.js init");
    }

    const groundRadius = ground.geometry.boundingSphere.radius * ground.scale.x;

    const bushScene = bushGltf.scene;
    bushScene.castShadow = true;

    const v = new THREE.Vector3();

    // Distribute evenly around the ground; not too many
    for (let i = 0; i < 20; ++i) {
      v.randomDirection();
      v.y = 0;

      v.multiplyScalar(groundRadius / 2.0);

      const instance = bushScene.clone();

      instance.position.copy(v);
      instance.rotation.set(0, Math.random() * Math.PI * 2, 0);
      instance.scale.y = Math.random() + 0.8;

      bushes.push(instance);
      scene.add(instance);
    }
  });
}

export function update(elapsed) {}
