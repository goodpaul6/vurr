import * as THREE from "three";

import { baseReferenceSpace } from "./renderer.js";
import { scene, room, ground, playOutro } from "./scene.js";
import { controllers, gamepads } from "./input.js";
import { doorScene as door } from "./door.js";
import { allBunniesSentToFinalPos } from "./bunnies.js";

let pos = new THREE.Vector3();
export let orient = new THREE.Quaternion();

const FINAL_POS = new THREE.Vector3(0, -35, -20);
const RISE_SPEED = 0.4;

const raycaster = new THREE.Raycaster();

const DEBUG_MODE = false;

export const teleportMarker = new THREE.Mesh(
  new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xbcbcbc })
);

const tempMatrix = new THREE.Matrix4();

let teleportIntersection = null;

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

export function worldPos() {
  return new THREE.Vector3(-pos.x, -pos.y, -pos.z);
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

export function update(dt) {
  if (allBunniesSentToFinalPos()) {
    playOutro();

    if (pos.distanceTo(FINAL_POS) > 0.1) {
      pos.addScaledVector(
        new THREE.Vector3().subVectors(FINAL_POS, pos).normalize(),
        RISE_SPEED * dt
      );
    }
  }

  teleportIntersection = null;

  for (const controller of controllers) {
    if (!controller.userData.isSelecting) {
      continue;
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

      if (!door.userData.isOpen && !DEBUG_MODE) {
        // If the teleport destination is too close to the edge of the room box, don't let the player teleport there
        if (
          Math.abs(teleportIntersection.x) > 4 ||
          Math.abs(teleportIntersection.z) > 3
        ) {
          teleportIntersection = null;
        } else {
          // Set the height a little higher so we can see it inside the room
          teleportIntersection.setY(0.04);
        }
      }
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
  for (const gamepad of gamepads) {
    if (!gamepad) {
      continue;
    }

    const value = gamepad.axes[2];

    if (value === 0) {
      gamepad.lastAxesValue = 0;
      continue;
    }

    if (
      (gamepad.lastAxesValue < 0 && value < 0) ||
      (gamepad.lastAxesValue > 0 && value > 0)
    ) {
      continue;
    }

    orient = orient.multiply(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, value < 0 ? -Math.PI / 16 : Math.PI / 16)
      )
    );

    gamepad.lastAxesValue = value;

    break;
  }
}
