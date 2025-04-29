import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#map"),
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// Load 3D map model
var map;
const loader = new GLTFLoader();
loader.load(
  "asset/map.glb",
  function (glb) {
    map = glb;
    scene.add(glb.scene);
  },
  // called while loading is progressing
  function (xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  // called when loading has errors
  function (error) {
    console.log("An error happened");
  }
);

// Add background
const spaceTexture = new THREE.TextureLoader().load("asset/space.jpg");
scene.background = spaceTexture;

// Add light
const ambientLight = new THREE.AmbientLight(0xffffff);
const dirLight = new THREE.DirectionalLight(0xffffff);
scene.add(ambientLight, dirLight);

camera.position.z = 60;
camera.position.y = 20;

// Animate
function animate() {
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
