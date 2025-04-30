import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const Map = function () {
  var map = null;
  const createMap = function (scene) {
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
  };

  return { createMap: createMap };
};

export default Map;
