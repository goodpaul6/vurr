import * as THREE from "three";

import { onAllLoaded, grassBladeGltf, flowerGltf } from "./models.js";
import { scene, ground } from "./scene.js";

let blades = [];
let bladesIMesh = null;

let flowers = [];

function makeRandomDecorTransforms(clusterCount, editFn) {
  const transforms = [];

  const v = new THREE.Vector3();
  const groundRadius = ground.geometry.boundingSphere.radius * ground.scale.x;

  for (let i = 0; i < clusterCount; ++i) {
    v.randomDirection();
    v.y = 0;

    v.multiplyScalar(groundRadius / 2.0);

    const count = Math.floor(Math.random() * 5 + 4);

    for (let i = 0; i < count; ++i) {
      const bladeInstance = {
        position: v.clone(),
        scale: new THREE.Vector3(1, 1, 1),
        rotation: new THREE.Euler(),
      };

      bladeInstance.position.add(new THREE.Vector3().randomDirection().setY(0));

      editFn(bladeInstance);

      if (bladeInstance.scale.lengthSq() < 0.2) {
        continue;
      }

      transforms.push(bladeInstance);
    }
  }

  return transforms;
}

export function init() {
  blades.length = 0;
  flowers.length = 0;

  onAllLoaded(function () {
    if (!ground) {
      throw new Error("Must init decor.js after initting scene.js");
    }

    const bladeTransforms = makeRandomDecorTransforms(100, function (instance) {
      instance.scale.z = Math.random() * 0.8 + 0.2;
      instance.scale.y = instance.scale.z;
    });

    const bladeMesh = grassBladeGltf.scene.children[0];

    bladesIMesh = new THREE.InstancedMesh(
      bladeMesh.geometry,
      bladeMesh.material,
      bladeTransforms.length
    );

    scene.add(bladesIMesh);

    blades = bladeTransforms.map(function (v, i) {
      return { ...v, index: i };
    });

    const flowerTransforms = makeRandomDecorTransforms(10, function (instance) {
      instance.scale.x = Math.random();
      instance.scale.z = instance.scale.x;
    });

    const flowerMesh = flowerGltf.scene;

    flowers = flowerTransforms.map(function (v) {
      const mesh = flowerMesh.clone();

      mesh.position.copy(v.position);
      mesh.rotation.copy(v.rotation);
      mesh.scale.copy(v.scale);

      scene.add(mesh);

      return mesh;
    });
  });
}

function updateBlades(elapsed) {
  const tempMat = new THREE.Matrix4();
  const tempMat2 = new THREE.Matrix4();

  for (const decor of blades) {
    decor.rotation.set(
      (Math.sin(elapsed * 4 + decor.position.x + decor.position.z) * Math.PI) /
        8 +
        Math.PI / 2,
      0,
      0
    );

    tempMat2.makeScale(decor.scale.x, decor.scale.y, decor.scale.z);

    tempMat.makeRotationFromEuler(decor.rotation);
    tempMat.multiply(tempMat2);
    tempMat.setPosition(decor.position);

    bladesIMesh.setMatrixAt(decor.index, tempMat);
  }

  bladesIMesh.instanceMatrix.needsUpdate = true;
}

function updateFlowers(elapsed) {
  for (const decor of flowers) {
    decor.rotation.set(
      (Math.sin(elapsed * 4 + decor.position.x + decor.position.z) * Math.PI) /
        8,
      0,
      0
    );
  }
}

export function update(elapsed) {
  updateBlades(elapsed);
  updateFlowers(elapsed);
}
