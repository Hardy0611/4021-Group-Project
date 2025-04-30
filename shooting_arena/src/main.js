import * as THREE from "three";
import PlayerSprite from "./player.js";
import Map from "./map.js";

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

const playerSprite = PlayerSprite();
playerSprite.createPlayer("asset/player1_sprite.png", scene, camera);

const map = Map();
map.createMap(scene);

// Input handling
const keys = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    playerSprite.move(keys[e.key]);
  }
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    playerSprite.stop(keys[e.key]);
  }
});

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
  const position = playerSprite.getPlayerPosition();
  if (display) {
    display.textContent = `Position:
    X: ${position.x.toFixed(2)}
    Y: ${position.y.toFixed(2)}
    Z: ${position.z.toFixed(2)}`;
  }
}

// Modify the animate function to include position display update
function animate(now) {
  playerSprite.updatePlayerAnimation(now);
  playerSprite.updatePlayerPosition();
  updatePositionDisplay(); // Add this line
  renderer.render(scene, camera);
}

renderer.setAnimationLoop((now) => animate(now));

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
