import * as THREE from "three";
import PlayerSprite from "./player.js";
import Map from "./map.js";
import Socket from "./socket.js";
import { GunSpriteArray } from "./gun.js";
import BulletSprite from "./bullet.js";

/**
 * GAME INITIALIZATION
 */
// Setup scene and renderer
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

// Create player character
const playerSprite = PlayerSprite(window.currentUser?.username);
playerSprite.createPlayer("asset/player1_sprite.png", scene, camera);

// Create game map
const map = Map();
map.createMap(scene);

// Reference to socket
const socket = Socket.getSocket();

// Store other players' sprites
const otherPlayers = {};

// Initialize Gun for players
const unarmGunArray = GunSpriteArray(scene);
socket.emit("getGun");



/**
 * PLAYER STATE MANAGEMENT
 */
// Helper to get current player state
function getPlayerState() {
  const position = playerSprite.getPlayerPosition();
  return {
    username: window.currentUser?.username,
    position: {
      x: position.x,
      y: position.y,
      z: position.z,
    },
    sequence: playerSprite.getPlayerSequence(),
    direction: playerSprite.getPlayerDirection(),
    hasGun: playerSprite.getHasGun(),
    health: playerSprite.getPlayerHealth(),
  };
}

// Handle bullet: create, animate, destroy
var bulletSpriteArray = [];
function updateBulletAnimation() {
  const otherPlayerBB = [];
  for (let username in otherPlayers) {
    otherPlayerBB.push({ username, BB: otherPlayers[username].getBoundBox() });
  }

  if (bulletSpriteArray.length == 0) return;
  if (!bulletSpriteArray[0].isDestroy()) {
    const hitPlayerStatus = bulletSpriteArray[0].moveBullet(
      playerSprite.getBoundBox(),
      otherPlayerBB
    );

    console.log(hitPlayerStatus);

    // update the hitPlayer
  }
  bulletSpriteArray.shift();
}

// Cleanup function to remove player from scene
function cleanupPlayer(username) {
  if (otherPlayers[username]) {
    const sprite = otherPlayers[username].getPlayerSprite();
    if (sprite) {
      scene.remove(sprite);
    }
    delete otherPlayers[username];
    console.log("Player removed:", username);
  }
}

window.cleanupPlayer = cleanupPlayer;

/**
 * INPUT HANDLING
 */
const keys = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    playerSprite.move(keys[e.key]);
  } else if (e.key === " ") {
    var direction = playerSprite.getPlayerFacingDirection();
    var position = playerSprite.getPlayerPosition();
    if (playerSprite.getHasGun()) {
      socket.emit(
        "addBullet",
        JSON.stringify({
          direction,
          initialX: position.x,
          initialZ: position.z,
        })
      );
    }
  } else if (e.key === "d") {
    // Drop the gun
    playerSprite.dropGun();
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

/**
 * MULTIPLAYER NETWORKING
 */
// Listen for updates from server
Socket.onUpdateUsers((users) => {
  // Process each connected user
  Object.keys(users).forEach((username) => {
    // Skip updating our own character
    if (username === window.currentUser?.username) return;

    const userState = users[username];

    // Handle new player joining
    if (!otherPlayers[username]) {
      const sprite = PlayerSprite(username);
      sprite.createPlayer("asset/player1_sprite.png", scene, camera);
      otherPlayers[username] = sprite;
      console.log("New player joined:", username);
    }

    // Update existing player state
    otherPlayers[username].setAll(userState);
  });

  // Remove players who left the game
  Object.keys(otherPlayers).forEach((username) => {
    if (!users[username]) {
      cleanupPlayer(username);
    }
  });
});

socket.on("addBullet", (data) => {
  const bulletInfo = JSON.parse(data);
  const bulletSprite = BulletSprite();
  bulletSprite.createBullet(
    bulletInfo.id,
    scene,
    bulletInfo.initialX,
    bulletInfo.initialZ,
    bulletInfo.direction,
    map.getBoundBoxArray()
  );
  bulletSpriteArray.push(bulletSprite);
});

/**
 * UI ELEMENTS
 */
// Add coordinate display to screen
function addCoordinateIndicators() {
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
addCoordinateIndicators();

// Update the position display
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

var objectBBStatus = [];

function checkObjectCollision() {
  const collideObjects = [];

  if (map && playerSprite) {
    const mapBB = map.getBoundBoxArray();
    const playerBB = playerSprite.getBoundBox();

    // Skip if bounding boxes aren't ready
    if (!playerBB || mapBB.length === 0) {
      objectBBStatus.forEach((status) => (status.previousCollide = false));
      return [];
    }

    // Initialize collision status array if needed
    if (objectBBStatus.length === 0 && mapBB.length !== 0) {
      for (let i = 0; i < mapBB.length; i++) {
        objectBBStatus.push({
          previousCollide: false,
          previousKeyPressCollide: null,
        });
      }
    }

    // Check collisions with each object
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

/**
 * GAME LOOP
 */
// Animation and update loop
function animate(now, collideObjects) {
  // Update animations
  playerSprite.updatePlayerAnimation(now);
  Object.values(otherPlayers).forEach((sprite) => {
    sprite.updatePlayerAnimation(now);
    sprite.updateGunPosition();
  });
  updateBulletAnimation();

  // Update physics and state
  playerSprite.updatePlayerPosition(collideObjects);
  updatePositionDisplay();
  if (playerSprite.getHasGun()) {
    playerSprite.updateGunPosition();
  }

  // Render the scene
  renderer.render(scene, camera);
}

function collectGuns() {
  if (playerSprite.getHasGun()) return;
  var playerBB = playerSprite.getBoundBox();
  var gunBBArray = unarmGunArray.getBoundBoxArray();
  if (!playerBB || gunBBArray.length == 0) {
    return;
  }

  for (let i = 0; i < gunBBArray.length; i++) {
    if (playerBB.intersectsBox(gunBBArray[i].BB)) {
      const gunForPlayer = unarmGunArray.playerCollectGun(
        gunBBArray[i].id,
        playerSprite.getPlayerSprite(),
        playerSprite.getUsername()
      );
      playerSprite.updateGunStatus(gunForPlayer);
      return;
    }
  }
}

socket.on("updatePlayerGun", (data) => {
  const playerInfo = JSON.parse(data);
  if (window.currentUser?.username == playerInfo.username) return;
  if (!otherPlayers[playerInfo.username]) return;
  // Create a gun for the other user
  otherPlayers[playerInfo.username].createGun(scene, playerInfo.gun);
});

renderer.setAnimationLoop((now) => {
  var collideObjects = checkObjectCollision();
  collectGuns();
  animate(now, collideObjects);

  // Emit player state to server
  if (socket && window.currentUser) {
    socket.emit("updateUser", JSON.stringify(getPlayerState()));
  }
});

/**
 * WINDOW EVENTS
 */
// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
