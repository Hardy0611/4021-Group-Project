import * as THREE from "three";
import PlayerSprite from "./player.js";
import Map from "./map.js";
import Socket from "./socket.js";
import { GunSpriteArray } from "./gun.js";
import BulletSprite from "./bullet.js";
import { now } from "three/examples/jsm/libs/tween.module.js";

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
playerSprite.setReady(true);

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
  return playerSprite.getAllState();
}

// Handle bullet: create, animate, destroy
var bulletSpriteArray = [];
// Handle bullet: create, animate, destroy
function updateBulletAnimation() {
  // Create array of other player bounding boxes for collision detection
  const otherPlayerBB = [];
  for (let username in otherPlayers) {
    if (username !== window.currentUser?.username) {
      const bb = otherPlayers[username].getBoundBox();
      if (bb) {
        otherPlayerBB.push({
          username,
          BB: bb,
        });
      }
    }
  }

  // Process all bullets in the array
  for (let i = bulletSpriteArray.length - 1; i >= 0; i--) {
    // Skip invalid bullets
    if (!bulletSpriteArray[i]) {
      bulletSpriteArray.splice(i, 1);
      continue;
    }

    // Process destroyed bullets
    if (bulletSpriteArray[i].isDestroy()) {
      bulletSpriteArray.splice(i, 1);
      continue;
    }

    // Move the bullet and get hit status
    const hitPlayerStatus = bulletSpriteArray[i].moveBullet(
      playerSprite.getBoundBox(),
      otherPlayerBB
    );

    // Handle player hits
    if (hitPlayerStatus.currentUser) {
      // Show visual effects for being hit
      playerSprite.decreaseHealth();

      // Camera shake effect
      shakeCamera();

      // Screen flash effect
      flashScreen();

      // Remove the bullet
      bulletSpriteArray.splice(i, 1);

      socket.emit(
        "playerHit",
        JSON.stringify({ hitPlayer: window.currentUser?.username })
      );
    }
  }
}

// Add these helper functions to keep the code cleaner
function shakeCamera() {
  const originalPosition = camera.position.clone();
  let shakeIntensity = 0.2;
  let shakeCount = 0;

  const shakeInterval = setInterval(() => {
    if (shakeCount > 5) {
      clearInterval(shakeInterval);
      camera.position.copy(originalPosition);
      return;
    }

    camera.position.x += Math.random() * shakeIntensity - shakeIntensity / 2;
    camera.position.y += Math.random() * shakeIntensity - shakeIntensity / 2;

    shakeCount++;
    shakeIntensity *= 0.9;
  }, 50);
}

function flashScreen() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
  overlay.style.zIndex = "1000";
  overlay.style.pointerEvents = "none";

  document.body.appendChild(overlay);

  setTimeout(() => {
    document.body.removeChild(overlay);
  }, 200);
}

function flashFreezeScreen() {
  const overlay = document.createElement("div");
  overlay.id = "freezeOverlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 255, 0.3)";
  overlay.style.zIndex = "1000";
  overlay.style.pointerEvents = "none";

  document.body.appendChild(overlay);

  setTimeout(() => {
    document.body.removeChild(overlay);
  }, 2000);
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
  // Player under freeze cannot move
  if (playerSprite.getFreeze()) {
    return;
  }

  if (keys.hasOwnProperty(e.key)) {
    playerSprite.move(keys[e.key]);
    // Send updated state immediately after press
    if (socket && window.currentUser) {
      socket.emit("uploadUser", JSON.stringify(getPlayerState()));
    }
  } else if (e.key === " ") {
    var direction = playerSprite.getPlayerFacingDirection();
    var position = playerSprite.getPlayerPosition();
    if (playerSprite.getHasGun()) {
      playerSprite.decreaseAmmo();
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
  } else if (e.key === "f") {
    socket.emit(
      "freezeOtherUser",
      JSON.stringify({username: window.currentUser?.username})
    );
  }
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    playerSprite.stop(keys[e.key]);

    // Send updated state immediately after stopping
    if (socket && window.currentUser) {
      socket.emit("uploadUser", JSON.stringify(getPlayerState()));
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
    // Skip updating our own character unless we go freeze
    if (username === window.currentUser?.username){
      if (users[username].freeze){
        flashFreezeScreen();
        playerSprite.setFreeze();
      }
      return;
    }

    const userState = users[username];

    // Handle new player joining
    if (!otherPlayers[username]) {
      const sprite = PlayerSprite(username);
      sprite.createPlayer("asset/player1_sprite.png", scene, camera);
      otherPlayers[username] = sprite;
      console.log("New player joined:", username);

      // Add a ready flag and set it to false initially
      otherPlayers[username].isReady = false;

      // Set a timeout to start animations after resources have loaded
      setTimeout(() => {
        otherPlayers[username].isReady = true;
      }, 1000); // Give it 1 second to fully initialize
    }

    // Check if this player has the hit animation flag
    if (
      userState.hitAnimation &&
      otherPlayers[username] &&
      otherPlayers[username].playHitAnimation
    ) {
      console.log("Playing hit animation for:", username);
      otherPlayers[username].playHitAnimation();
    }

    if (userState.freeze && otherPlayers[username]) {
      console.log(`${userState.username} got freeze`);
      otherPlayers[username].playFreezeAnimation();
    }

    // Update existing player state
    otherPlayers[username].setAll(userState);
  });

  // Remove players who left the game
  Object.keys(otherPlayers).forEach((username) => {
    if (!users[username]) {
      cleanupPlayer(username);
    }
    else if (users[username].isdead){ // isdead not null
      cleanupPlayer(username);
    }
  });
});

// And when receiving bullet creation events (in your socket.on handler):
socket.on("addBullet", (data) => {
  const bulletInfo = JSON.parse(data);
  const bulletSprite = BulletSprite();

  // Check if this is the current player's bullet
  const isLocalBullet = bulletInfo.shooterID === socket.id;

  bulletSprite.createBullet(
    bulletInfo.id,
    scene,
    bulletInfo.initialX,
    bulletInfo.initialZ,
    bulletInfo.direction,
    map.getBoundBoxArray(),
    isLocalBullet // Pass the flag to identify local bullets
  );
  bulletSpriteArray.push(bulletSprite);
});

function updatePlayerStatus() {
  const healthDisplay = document.getElementById("player-health");
  if (healthDisplay) {
    const playerHealth = playerSprite.getPlayerHealth();
    healthDisplay.textContent = playerHealth;

    if (playerHealth <= 0){
      const timing = Date.now();
      playerSprite.setDead(timing);
      playerSprite.setReady(false);

      socket.emit("playerDead", 
        JSON.stringify({
          username: window.currentUser?.username,
          deadtime: timing,
        }))
      // Stop the animation loop
      renderer.setAnimationLoop(null);
      
      // Clean up the scene
      scene.remove(playerSprite.getPlayerSprite());
      if (playerSprite.getHasGun()) {
        playerSprite.dropGun();
      }
      

      // Show game over screen with jQuery animation
      $("#game-over").fadeIn(500);
    }
  }

  const ammoDisplay = document.getElementById("player-ammo");
  if (ammoDisplay) {
    const playerAmmo = playerSprite.getAmmo();
    ammoDisplay.textContent = playerAmmo;
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
    // only start update when other player fully loaded
    if (sprite && sprite.isReady) {
      sprite.updatePlayerAnimation(now);
      sprite.updateGunPosition();
    }
  });
  updateBulletAnimation();

  // Update physics and state
  playerSprite.updatePlayerPosition(collideObjects);
  updatePlayerStatus();
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
};


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
    socket.emit("uploadUser", JSON.stringify(getPlayerState()));
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
