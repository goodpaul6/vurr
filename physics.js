import * as THREE from "three";
import RAPIER from "rapier";

let world = null;

const physicsLoadedHandlers = [];

const bodies = [];

const clock = new THREE.Clock();
const tempVec = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempMatrix = new THREE.Matrix4();
const ONE = new THREE.Vector3(1, 1, 1);

export const BODY_TYPE_DYNAMIC = 0;
export const BODY_TYPE_POSN_KINEMATIC = 1;

export const DEBUG_MODE = false;

export function init() {
  RAPIER.init().then(function () {
    world = new RAPIER.World(new THREE.Vector3(0, -9.8, 0));

    for (const handlerFn of physicsLoadedHandlers) {
      handlerFn();
    }
  });
}

export function onPhysicsLoaded(fn) {
  if (world) {
    fn();
  } else {
    physicsLoadedHandlers.push(fn);
  }
}

export function createEmptyBody({ position, quat = null, mass = 0 }) {
  const desc =
    mass > 0 ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.fixed();
  desc.setTranslation(...position);
  if (quat !== null) {
    desc.setRotation(quat);
  }

  const body = world.createRigidBody(desc);
  bodies.push(body);

  return body;
}

export function createAndAttachCuboidCollider({
  body,
  hx,
  hy,
  hz,
  offset = null,
}) {
  const colliderDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz);
  if (offset !== null) {
    colliderDesc.setTranslation(...offset);
  }

  return world.createCollider(colliderDesc, body);
}

function createBody(position, quat, mass, colliderDesc) {
  const body = createEmptyBody({
    position,
    quat,
    mass,
  });

  world.createCollider(colliderDesc, body);

  return body;
}

export function createCuboidBody({
  hx,
  hy,
  hz,
  position,
  quat = null,
  mass = 0,
}) {
  const colliderDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz);
  return createBody(position, quat, mass, colliderDesc);
}

export function createCylinderBody({
  halfHeight,
  radius,
  position,
  quat = null,
  mass = 0,
  colliderOffset = null,
}) {
  const colliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, radius);

  if (colliderOffset !== null) {
    colliderDesc.setTranslation(...colliderOffset);
  }

  return createBody(position, quat, mass, colliderDesc);
}

export function createCapsuleBody({
  halfHeight,
  radius,
  position,
  quat = null,
  mass = 0,
  colliderOffset = null,
}) {
  const colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius);

  if (colliderOffset !== null) {
    colliderDesc.setTranslation(...colliderOffset);
  }

  return createBody(position, quat, mass, colliderDesc);
}

export function updateObjectFromBody(mesh, body) {
  // TODO(Apaar): Handle instanced meshes
  mesh.position.copy(body.translation());
  mesh.quaternion.copy(body.rotation());
}

export function setBodyType(body, type) {
  switch (type) {
    case BODY_TYPE_DYNAMIC:
      body.setBodyType(RAPIER.RigidBodyType.Dynamic);
      break;
    case BODY_TYPE_POSN_KINEMATIC:
      body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased);
      break;
  }
}

const DEBUG_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.15,
});

const DEBUG_BOX = new THREE.BoxGeometry(1, 1, 1);
const DEBUG_CYLINDER = new THREE.CylinderGeometry(1, 1, 1);
const DEBUG_CAPSULE = new THREE.CapsuleGeometry(1, 1);

export function forEachBody(fn) {
  bodies.forEach(fn);
}

export function update() {
  if (DEBUG_MODE) {
    for (const body of bodies) {
      if (body.obj) {
        updateObjectFromBody(body.obj, body);
        continue;
      }

      body.obj = new THREE.Object3D();

      for (let i = 0; i < body.numColliders(); ++i) {
        const collider = body.collider(i);
        const shape = collider.shape;

        // This is in world space, so we use the inverse of the parent body's
        // transform to get the collider's pos in local space
        const colliderTranslation = collider.translation();

        tempVec.copy(body.translation());
        tempQuat.copy(body.rotation());

        tempMatrix.compose(tempVec, tempQuat, ONE);
        tempMatrix.invert();

        const localPos = new THREE.Vector3()
          .copy(colliderTranslation)
          .applyMatrix4(tempMatrix);

        if (shape instanceof RAPIER.Cuboid) {
          const mesh = new THREE.Mesh(DEBUG_BOX, DEBUG_MATERIAL);

          mesh.position.copy(localPos);

          mesh.scale.set(
            shape.halfExtents.x * 2,
            shape.halfExtents.y * 2,
            shape.halfExtents.z * 2
          );

          body.obj.add(mesh);
        } else if (shape instanceof RAPIER.Cylinder) {
          const mesh = new THREE.Mesh(DEBUG_CYLINDER, DEBUG_MATERIAL);

          mesh.position.copy(localPos);
          mesh.scale.set(shape.radius, shape.halfHeight * 2, shape.radius);

          body.obj.add(mesh);
        } else if (shape instanceof RAPIER.Capsule) {
          const mesh = new THREE.Mesh(DEBUG_CAPSULE, DEBUG_MATERIAL);

          mesh.position.copy(localPos);
          mesh.scale.set(shape.radius, shape.halfHeight * 2, shape.radius);

          body.obj.add(mesh);
        }
      }
    }
  }

  world.timestep = clock.getDelta();
  world.step();
}
