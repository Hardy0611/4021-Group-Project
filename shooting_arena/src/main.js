import * as THREE from "three";
import PlayerSprite from "./player.js";
import Map from "./map.js";
import Socket from "./socket.js";

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const socket = Socket.getSocket();

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#map"),
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const playerSprite = PlayerSprite();
playerSprite.createPlayer("asset/player1_sprite.png", scene, camera);

// Helper to get current player state
function getPlayerState() {
  const position = playerSprite.getPlayerPosition();
  return {
    username: window.currentUser?.username,
    position: {
      x: position.x,
      y: position.y, // Make sure Y position is included
      z: position.z
    },
    direction: playerSprite.getPlayerDirection(),
    weapon: playerSprite.getPlayerWeapon(),
    health: playerSprite.getPlayerHealth(),
  };
}

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
    
    // Send updated state immediately after stopping
    if (socket && window.currentUser) {
      socket.emit("updateUser", JSON.stringify(getPlayerState()));
    }
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

// Store other players' sprites
const otherPlayers = {};

// Listen for updates from server
Socket.onUpdateUsers((users) => {
  // console.log("Received users from server:", users);
  Object.keys(users).forEach((username) => {
    if (username === window.currentUser?.username) return; // Skip self

    const userState = users[username];
    if (!otherPlayers[username]) {
      // Create sprite for new player
      const sprite = PlayerSprite();
      sprite.createPlayer("asset/player1_sprite.png", scene, camera);
      otherPlayers[username] = sprite;
      console.log("New player joined:", username);
    }
    // Update position/direction
    otherPlayers[username].setPosition(userState.position);
    otherPlayers[username].setDirection(userState.direction);
    // otherPlayers[username].setWeapon(userState.weapon);
    // otherPlayers[username].setHealth(userState.health); 
  });

  // Remove players who left
  Object.keys(otherPlayers).forEach((username) => {
    if (!users[username]) {
      scene.remove(otherPlayers[username].sprite);
      delete otherPlayers[username];
    }
  });
});

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
function animate(now, collideObjects) {
  playerSprite.updatePlayerAnimation(now);
  Object.values(otherPlayers).forEach((sprite) => {
    sprite.updatePlayerAnimation(now);
  });
  playerSprite.updatePlayerPosition(collideObjects);
  updatePositionDisplay(); // Add this line
  renderer.render(scene, camera);
}

var objectBBStatus = [];

function checkObjectCollision() {
  var collideObjects = [];
  if (map && playerSprite) {
    var mapBB = map.getBoundBoxArray();
    var playerBB = playerSprite.getBoundBox();
    if (!playerBB || mapBB.length == 0) {
      for (let i = 0; i < mapBB.length; i++)
        objectBBStatus[i].previousCollide = false;
      return [];
    }
    if (objectBBStatus.length == 0 && mapBB.length != 0) {
      for (let i = 0; i < mapBB.length; i++) {
        objectBBStatus.push({
          previousCollide: false,
          previousKeyPressCollide: null,
        });
      }
    }
    for (let i = 0; i < mapBB.length; i++) {
      if (playerBB.intersectsBox(mapBB[i])) {
        if (!objectBBStatus[i].previousCollide) {
          objectBBStatus[i].previousKeyPressCollide =
            playerSprite.getPlayerDirection();
        }
        objectBBStatus[i].previousCollide = true;
        collideObjects.push(objectBBStatus[i].previousKeyPressCollide);
      } else {
        objectBBStatus[i].previousCollide = false;
      }
    }
  }

  return collideObjects;
}

renderer.setAnimationLoop((now) => {
  var collideObjects = checkObjectCollision();
  animate(now, collideObjects);

  // Emit player state to server
  if (socket && window.currentUser) {
    socket.emit("updateUser", JSON.stringify(getPlayerState()));
  }
});

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
