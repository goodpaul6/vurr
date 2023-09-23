import * as THREE from "three";

import { baseReferenceSpace } from "./renderer.js";
import { scene, ground } from "./scene.js";
import { controllers, gamepads } from "./input.js";

export let pos = new THREE.Vector3();
export let orient = new THREE.Quaternion();

const raycaster = new THREE.Raycaster();

export const teleportMarker = new THREE.Mesh(
  new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xbcbcbc })
);

const tempMatrix = new THREE.Matrix4();

let teleportIntersection = null;
let lastAxesValue = 0;

export function getReferenceSpace() {
  // HACK(Apaar): Basically, the MDN documentation lies. If we supply a rotation
  // along with a translation, it will actually translate first and then rotate,
  // resulting in a rotation around the origin from the translated position.
  //
  // Instead, I just rotate first and then translate as a separate step. Not so bad.
  return baseReferenceSpace
    ?.getOffsetReferenceSpace(new XRRigidTransform(undefined, orient))
    ?.getOffsetReferenceSpace(new XRRigidTransform(pos, undefined));
}

export function init() {
  scene.add(teleportMarker);

  for (const controller of controllers) {
    controller.addEventListener("selectstart", function () {
      this.userData.isSelecting = true;
    });

    function onSelectEnd() {
      this.userData.isSelecting = false;

      if (teleportIntersection === null) {
        return;
      }

      pos.set(
        -teleportIntersection.x,
        -teleportIntersection.y,
        -teleportIntersection.z
      );
    }

    controller.addEventListener("selectend", onSelectEnd);
  }
}

export function update() {
  teleportIntersection = null;

  for (const controller of controllers) {
    if (!controller.userData.isSelecting) {
      return;
    }

    controller.updateMatrixWorld(true);

    // Put the controllers rotation transform into this tempMatrix
    tempMatrix.identity().extractRotation(controller.matrixWorld);

    // Extract controller position
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);

    // Apply controller rotation to ray direction (-1 z forward)
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects([ground]);

    if (intersects.length > 0) {
      teleportIntersection = intersects[0].point;
    }

    break;
  }

  if (teleportIntersection) {
    teleportMarker.position.copy(teleportIntersection);
    teleportMarker.position.y += 0.01;
    teleportMarker.visible = true;
  } else {
    teleportMarker.visible = false;
  }

  // Snap turning
  for (const gamepad of gamepads.slice(1)) {
    if (!gamepad) {
      continue;
    }

    const value = gamepad.axes[2];

    if (value === 0) {
      lastAxesValue = 0;
      continue;
    }

    if ((lastAxesValue < 0 && value < 0) || (lastAxesValue > 0 && value > 0)) {
      continue;
    }

    orient = orient.multiply(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, value < 0 ? -Math.PI / 16 : Math.PI / 16)
      )
    );

    lastAxesValue = value;

    break;
  }
}
