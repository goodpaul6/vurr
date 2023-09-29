import * as THREE from "three";
import { cloudGltf, onAllLoaded } from "./models.js";
import { dirLight, scene } from "./scene.js";

const CLOUD_COUNT = 10;
const CLOUD_BASE_Y = 20;
const CLOUD_CLIMB_Y = 20;
const CLOUD_DISTRIBUTION_RADIUS = 40;

const clouds = [];

let cloudsIMesh = null;
let sunMesh = null;

export function init() {
  onAllLoaded(function () {
    for (let i = 0; i < CLOUD_COUNT; ++i) {
      // Give each cloud a random position above the
      clouds.push({
        position: new THREE.Vector3()
          .randomDirection()
          .multiplyScalar(CLOUD_DISTRIBUTION_RADIUS)
          .setY(Math.random() * CLOUD_CLIMB_Y + CLOUD_BASE_Y),
        quaternion: new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, Math.random() * Math.PI * 2)
        ),
        scale: new THREE.Vector3().random().addScalar(0.5).setY(1),
        index: i,
      });
    }

    const cloudMesh = cloudGltf.scene.children[0];

    cloudsIMesh = new THREE.InstancedMesh(
      cloudMesh.geometry,
      new THREE.MeshBasicMaterial({
        color: cloudMesh.material.color,
      }),
      CLOUD_COUNT
    );

    cloudsIMesh.frustumCulled = false;

    scene.add(cloudsIMesh);

    sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(4),
      new THREE.MeshBasicMaterial({
        color: 0xf5be4b,
      })
    );

    sunMesh.position.copy(dirLight.position).multiplyScalar(10);

    scene.add(sunMesh);
  });
}

export function update() {
  const mat = new THREE.Matrix4();

  for (const cloud of clouds) {
    mat.compose(cloud.position, cloud.quaternion, cloud.scale);

    cloudsIMesh.setMatrixAt(cloud.index, mat);
  }

  cloudsIMesh.instanceMatrix.needsUpdate = true;
}
