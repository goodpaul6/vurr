import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import { OrbitControls } from "three/addons/controls/OrbitControls";
import { VRButton } from "three/addons/webxr/VRButton";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const raycaster = new THREE.Raycaster();

let baseReferenceSpace = null;

const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

renderer.xr.addEventListener("sessionstart", function () {
  baseReferenceSpace = renderer.xr.getReferenceSpace();
});

renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.background = new THREE.Color(0x79c6d4);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);

dirLight.position.set(1, 1, 0);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 500;

scene.add(dirLight);

scene.add(new THREE.HemisphereLight(0xfcebc3, 0x3b653e));

const loader = new GLTFLoader();

let bunny = null;
let ground = null;

loader.load("public/bunny.glb", function (gltf) {
  bunny = gltf.scene.children[0];
  bunny.castShadow = true;

  for (let i = 0; i < 8; ++i) {
    const bunnyInstance = bunny.clone();
    bunnyInstance.position.set(i * 4 - 8, 0, -5);

    scene.add(bunnyInstance);
  }
});

loader.load("public/ground.glb", function (gltf) {
  ground = gltf.scene.children[0];
  ground.receiveShadow = true;
  scene.add(ground);
});

// Marker for teleportation
const teleportMarker = new THREE.Mesh(
  new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xbcbcbc })
);

scene.add(teleportMarker);

let teleportIntersection = null;

const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);

controller1.addEventListener("selectstart", function () {
  this.userData.isSelecting = true;
});

controller2.addEventListener("selectstart", function () {
  this.userData.isSelecting = true;
});

let lastTeleportPos = null;
let lastRotation = null;

function onSelectEnd() {
  this.userData.isSelecting = false;

  if (teleportIntersection === null) {
    return;
  }

  const posn = {
    x: -teleportIntersection.x,
    y: -teleportIntersection.y,
    z: -teleportIntersection.z,
  };

  lastTeleportPos = posn;

  const rot = lastRotation ?? new THREE.Quaternion();
  lastRotation = rot;

  const rotTransform = new XRRigidTransform(undefined, rot);

  const rotBase = baseReferenceSpace.getOffsetReferenceSpace(rotTransform);

  const moveTransform = new XRRigidTransform(posn, undefined);

  renderer.xr.setReferenceSpace(rotBase.getOffsetReferenceSpace(moveTransform));
}

controller1.addEventListener("selectend", onSelectEnd);
controller2.addEventListener("selectend", onSelectEnd);

let gamepad1 = null;
let gamepad2 = null;

controller1.addEventListener("connected", function (evt) {
  gamepad1 = evt.data.gamepad;
});

controller2.addEventListener("connected", function (evt) {
  gamepad2 = evt.data.gamepad;
});

const controllerModelFactory = new XRControllerModelFactory();

const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(
  controllerModelFactory.createControllerModel(controllerGrip1)
);
scene.add(controllerGrip1);

const controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(
  controllerModelFactory.createControllerModel(controllerGrip2)
);
scene.add(controllerGrip2);

const controls = new OrbitControls(camera, renderer.domElement);

camera.position.set(0, 3, 3);
controls.update();

const tempMatrix = new THREE.Matrix4();

let lastAxesValue = 0;

function animate(ts, xrFrame) {
  controls.update();

  teleportIntersection = null;

  for (const controller of [controller1, controller2]) {
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
    }

    break;
  }

  // TODO(Apaar): Clean this up omg
  for (const gamepad of [gamepad2]) {
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

    const prevRot = lastRotation ?? new THREE.Quaternion();

    const quat = prevRot.multiply(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, value < 0 ? -Math.PI / 16 : Math.PI / 16)
      )
    );

    renderer.xr.setReferenceSpace(
      baseReferenceSpace.getOffsetReferenceSpace(
        new XRRigidTransform({ x: 0, y: 0, z: 0 }, quat)
      )
    );

    renderer.xr.setReferenceSpace(
      renderer.xr
        .getReferenceSpace()
        .getOffsetReferenceSpace(
          new XRRigidTransform(
            lastTeleportPos ?? { x: 0, y: 0, z: 0 },
            undefined
          )
        )
    );

    lastRotation = quat;

    lastAxesValue = value;
    break;
  }

  if (teleportIntersection) {
    teleportMarker.position.copy(teleportIntersection);
    teleportMarker.position.y += 0.01;
  }

  teleportMarker.visible = teleportIntersection !== null;

  if (bunny) {
    bunny.rotation.z += 0.01;
  }

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

renderer.setAnimationLoop(animate);

window.addEventListener("resize", onWindowResize, false);
