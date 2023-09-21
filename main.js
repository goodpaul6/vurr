import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import { OrbitControls } from "three/addons/controls/OrbitControls";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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
scene.add(new THREE.AmbientLight(0xfcebc3, 0.1));
scene.add(new THREE.AxesHelper(5));

const loader = new GLTFLoader();

let bunny = null;

loader.load("public/bunny.glb", function (gltf) {
  bunny = gltf.scene.children[0];
  bunny.castShadow = true;
  scene.add(bunny);
});

loader.load("public/ground.glb", function (gltf) {
  const ground = gltf.scene.children[0];
  ground.receiveShadow = true;
  scene.add(ground);
});

const controls = new OrbitControls(camera, renderer.domElement);

camera.position.set(0, 3, 3);
controls.update();

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  if (bunny) {
    bunny.rotation.z += 0.01;
  }

  renderer.render(scene, camera);
}

animate();
