import * as THREE from "three";

import { onAllLoaded, bushGltf } from "./models.js";
import { scene, ground, ROOM_RADIUS } from "./scene.js";

const bushes = [];

export function init() {
  bushes.length = 0;

  const ZERO = new THREE.Vector3();

  onAllLoaded(function () {
    if (!ground) {
      throw new Error("Please call bushes.js init after scene.js init");
    }

    const groundRadius = ground.geometry.boundingSphere.radius * ground.scale.x;

    const bushMesh = bushGltf.scene.children[0];
    bushMesh.castShadow = true;
    bushMesh.material = new THREE.MeshPhongMaterial({
      color: bushMesh.material.color,
    });

    const v = new THREE.Vector3();

    // Distribute evenly around the ground; not too many
    for (let i = 0; i < 20; ++i) {
      do {
        v.randomDirection().setY(0);
        v.multiplyScalar(groundRadius / 2.0);
        // Min radius around house
      } while (v.distanceToSquared(ZERO) < ROOM_RADIUS * ROOM_RADIUS);

      const instance = bushMesh.clone();

      instance.position.add(v);
      instance.rotation.set(0, Math.random() * Math.PI * 2, 0);
      instance.scale.y *= Math.random() + 1;

      bushes.push(instance);
      scene.add(instance);
    }
  });
}

export function update(elapsed) {
  const tempMat = new THREE.Matrix4();

  for (const bush of bushes) {
    bush.matrixAutoUpdate = false;

    tempMat.makeShear(
      0,
      0,
      0,
      0,
      Math.sin(elapsed * 4 + bush.position.x + bush.position.z) * 0.1,
      0
    );
    bush.matrix
      .compose(bush.position, bush.quaternion, bush.scale)
      .multiply(tempMat);
  }
}
