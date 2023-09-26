import * as THREE from "three";
import RAPIER from "rapier";

let world = null;

const physicsLoadedHandlers = [];

const bodies = [];

const clock = new THREE.Clock();
const tempVec = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempMatrix = new THREE.Matrix4();

export const BODY_TYPE_DYNAMIC = 0;
export const BODY_TYPE_POSN_KINEMATIC = 1;

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

export function update() {
  world.timestep = clock.getDelta();
  world.step();
}
