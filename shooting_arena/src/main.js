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

// Player state
const player = {
  position: new THREE.Vector3(0, 0, 0),
  speed: 0.15,
  sprite: null,
  currentFrame: 0,
  frameCount: 4, // Number of frames in your sprite sheet
  animationSpeed: 0.1,
  direction: "down", // 'up', 'down', 'left', 'right'
  isMoving: false,
};

// Create player sprite
const createPlayerSprite = () => {
  const spriteMap = new THREE.TextureLoader().load("asset/player1_sprite.png");
  const spriteMaterial = new THREE.SpriteMaterial({
    map: spriteMap,
    transparent: true,
  });

  player.sprite = new THREE.Sprite(spriteMaterial);
  player.sprite.scale.set(5, 5, 1);
  player.sprite.position.set(0, 3, 0); // Adjust height as needed

  scene.add(player.sprite);
};

// Call this after scene is loaded
createPlayerSprite();

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

// Initial camera position
camera.position.set(0, 10, 10);
camera.lookAt(player.position);

// Input handling
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = true;
    player.isMoving = true;

    // Update direction
    if (e.key === "ArrowUp") player.direction = "up";
    else if (e.key === "ArrowDown") player.direction = "down";
    else if (e.key === "ArrowLeft") player.direction = "left";
    else if (e.key === "ArrowRight") player.direction = "right";
  }
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = false;

    // Check if any movement key is still pressed
    player.isMoving = Object.values(keys).some((value) => value === true);
  }
});

// Update player position
function updatePlayerPosition() {
  if (keys.ArrowUp) {
    player.position.z -= player.speed;
  }
  if (keys.ArrowDown) {
    player.position.z += player.speed;
  }
  if (keys.ArrowLeft) {
    player.position.x -= player.speed;
  }
  if (keys.ArrowRight) {
    player.position.x += player.speed;
  }

  // Update sprite position to match player position
  if (player.sprite) {
    player.sprite.position.x = player.position.x;
    player.sprite.position.z = player.position.z;
  }

  // Update camera to follow player
  camera.position.x = player.position.x;
  camera.position.z = player.position.z + 40;
  camera.lookAt(new THREE.Vector3(player.position.x, 0, player.position.z));
}

// Update sprite animation
function updateSpriteAnimation() {
  if (!player.sprite || !player.isMoving) return;

  // Advance frame counter
  player.currentFrame =
    (player.currentFrame + player.animationSpeed) % player.frameCount;

  // Calculate UV offset based on direction and current frame
  let rowIndex;
  switch (player.direction) {
    case "down":
      rowIndex = 0;
      break;
    case "left":
      rowIndex = 1;
      break;
    case "right":
      rowIndex = 2;
      break;
    case "up":
      rowIndex = 3;
      break;
    default:
      rowIndex = 0;
  }

  const frameIndex = Math.floor(player.currentFrame);

  // Update sprite texture coordinates (assuming a 4x4 spritesheet)
  const material = player.sprite.material;
  material.map.offset.x = frameIndex / 4;
  material.map.offset.y = rowIndex / 4;
  material.map.repeat.set(1 / 4, 1 / 4);
}

// Add coordinate axes helper
function addCoordinateIndicators() {
  // Add position display to screen
  const positionDisplay = document.createElement("div");
  positionDisplay.id = "position-display";
  positionDisplay.style.position = "absolute";
  positionDisplay.style.top = "10px";
  positionDisplay.style.left = "10px";
  positionDisplay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  positionDisplay.style.color = "white";
  positionDisplay.style.padding = "10px";
  positionDisplay.style.fontFamily = "monospace";
  positionDisplay.style.fontSize = "16px";
  positionDisplay.style.borderRadius = "5px";
  document.body.appendChild(positionDisplay);
}

// Call this function after scene setup
addCoordinateIndicators();

// Update the position display in the animate function
function updatePositionDisplay() {
  const display = document.getElementById("position-display");
  if (display) {
    display.textContent = `Position: 
    X: ${player.position.x.toFixed(2)} 
    Y: ${player.position.y.toFixed(2)} 
    Z: ${player.position.z.toFixed(2)}`;
  }
}

// Modify the animate function to include position display update
function animate() {
  updatePlayerPosition();
  updateSpriteAnimation();
  updatePositionDisplay(); // Add this line
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
