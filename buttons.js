import * as THREE from "three";
import { scene } from "./scene.js";

export let button = null;

export function init() {
  const geometry = new THREE.CylinderGeometry( 5, 5, 20, 32 ); 
  const material = new THREE.MeshStandardMaterial( {color: 0xd04247} ); 
  button = new THREE.Mesh( geometry, material ); scene.add( button );
}

