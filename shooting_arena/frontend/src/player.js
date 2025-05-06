import * as THREE from "three";
import { GunSprite } from "./gun";

/**
 * Player sprite factory function
 * Creates and manages a player character with sprite animations
 * @returns {Object} - Player sprite controller object
 */
const PlayerSprite = function (username) {
  /**
   * ANIMATION DEFINITIONS
   */
  const sequences = {
    // Idle animations
    idleLeft: { uv: { u: 0, v: 0.75 }, count: 3, timing: 1000 },
    idleUp: { uv: { u: 0, v: 0.625 }, count: 1, timing: 1000 },
    idleRight: { uv: { u: 0, v: 0.5 }, count: 3, timing: 1000 },
    idleDown: { uv: { u: 0, v: 0.875 }, count: 3, timing: 1000 },

    // Movement animations
    moveLeft: { uv: { u: 0, v: 0.25 }, count: 10, timing: 50 },
    moveUp: { uv: { u: 0, v: 0.125 }, count: 10, timing: 50 },
    moveRight: { uv: { u: 0, v: 0 }, count: 10, timing: 50 },
    moveDown: { uv: { u: 0, v: 0.375 }, count: 10, timing: 50 },
  };

  const dropGunAudio = new Audio("sound/collect_gun.mov");
  // Sprite sheet configuration
  const horizontalTile = 10;
  const verticalTile = 8;

  /**
   * PLAYER STATE
   */
  let lastUpdate = 0;
  let index = 0;
  let boundingBox = null;

  const player = {
    camera: null,
    position: new THREE.Vector3(0, 0, 20),
    map: null,
    speed: 0.15,
    sprite: null,
    sequence: sequences.idleDown,
    animationSpeed: 0.1,
    health: 100,
    direction: "idle", // 'up', 'down', 'left', 'right', 'idle
    facing: "down",
    hasGun: false,
    gun: null,
  };

  /**
   * PLAYER INITIALIZATION
   */
  /**
   * Creates a player sprite with animations
   * @param {string} spriteTexture - Path to sprite sheet
   * @param {THREE.Scene} scene - Scene to add player to
   * @param {THREE.Camera} camera - Camera that follows the player
   */
  const createPlayer = function (spriteTexture, scene, camera) {
    // Load and configure texture
    player.map = new THREE.TextureLoader().load(spriteTexture);
    player.map.magFilter = THREE.NearestFilter;
    player.map.repeat.set(1 / horizontalTile, 1 / verticalTile);

    // Set initial animation frame
    player.map.offset.x = player.sequence.uv.u;
    player.map.offset.y = player.sequence.uv.v;

    // Create sprite material and mesh
    const spriteMaterial = new THREE.SpriteMaterial({
      map: player.map,
      transparent: true,
    });

    player.sprite = new THREE.Sprite(spriteMaterial);
    player.sprite.scale.set(2, 2, 1);
    player.sprite.position.set(player.position.x, 1.5, player.position.z);

    scene.add(player.sprite);

    // Configure camera
    player.camera = camera;
    player.camera.position.set(0, 10, 10);
    player.camera.lookAt(player.position);

    // Setup collision detection
    boundingBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    boundingBox.setFromObject(player.sprite);

    // Temporary increase BB size for easy shooting TO DO: REMOVE OR ADJUST
    boundingBox.min.z -= 1;
    boundingBox.max.z += 1;
  };

  /**
   * ANIMATION MANAGEMENT
   */
  /**
   * Sets the current animation sequence
   * @param {Object} newSequence - Animation sequence to set
   */
  const setSequence = function (newSequence) {
    index = 0;
    lastUpdate = 0;
    player.sequence = newSequence;
  };

  /**
   * Updates the sprite animation based on time
   * @param {number} time - Current time from animation loop
   */
  const updatePlayerAnimation = function (time) {
    if (lastUpdate === 0) lastUpdate = time;
    if (lastUpdate === time || time - lastUpdate >= player.sequence.timing) {
      index = (index + 1) % player.sequence.count;
      player.map.offset.x = index / horizontalTile;
      player.map.offset.y = player.sequence.uv.v;
      lastUpdate = time;
    }
  };

  /**
   * MOVEMENT CONTROLS
   */
  /**
   * Starts moving the player in the specified direction
   * @param {string} dir - Direction: "up", "down", "left", "right"
   */
  const move = function (dir) {
    if (dir !== player.direction) {
      switch (dir) {
        case "left":
          player.facing = "left";
          setSequence(sequences.moveLeft);
          break;
        case "up":
          player.facing = "up";
          setSequence(sequences.moveUp);
          break;
        case "right":
          player.facing = "right";
          setSequence(sequences.moveRight);
          break;
        case "down":
          player.facing = "down";
          setSequence(sequences.moveDown);
          break;
      }
      player.direction = dir;
    }
  };

  /**
   * Stops the player's movement in the specified direction
   * @param {string} dir - Direction that was previously active
   */
  const stop = function (dir) {
    if (player.direction === dir) {
      switch (dir) {
        case "left":
          setSequence(sequences.idleLeft);
          break;
        case "up":
          setSequence(sequences.idleUp);
          break;
        case "right":
          setSequence(sequences.idleRight);
          break;
        case "down":
          setSequence(sequences.idleDown);
          break;
      }
      player.direction = "idle"; // Set to idle state
    }
  };

  /**
   * Updates player position based on current direction and collisions
   * @param {Array} collideObjects - Array of directions with collisions
   */
  const updatePlayerPosition = function (collideObjects) {
    // Skip if player is idle
    if (player.direction === "idle") return;

    // Calculate movement based on current direction
    let moveX = 0;
    let moveZ = 0;

    // Determine movement vector based on direction
    switch (player.direction) {
      case "left":
        moveX = -player.speed;
        if (collideObjects && collideObjects.includes("left")) {
          moveX = 0;
        }
        break;

      case "up":
        moveZ = -player.speed;
        if (collideObjects && collideObjects.includes("up")) {
          moveZ = 0;
        }
        break;

      case "right":
        moveX = player.speed;
        if (collideObjects && collideObjects.includes("right")) {
          moveX = 0;
        }
        break;

      case "down":
        moveZ = player.speed;
        if (collideObjects && collideObjects.includes("down")) {
          moveZ = 0;
        }
        break;
    }

    // Normalize diagonal movement
    if (moveX !== 0 && moveZ !== 0) {
      const normalizer = 1 / Math.sqrt(2);
      moveX *= normalizer;
      moveZ *= normalizer;
    }

    // Apply movement
    player.position.x += moveX;
    player.position.z += moveZ;

    // Update sprite position
    if (player.sprite) {
      player.sprite.position.x = player.position.x;
      player.sprite.position.z = player.position.z;
    }

    // Update bounding box for collision detection
    if (boundingBox) {
      boundingBox
        .copy(player.sprite.geometry.boundingBox)
        .applyMatrix4(player.sprite.matrixWorld);
    }

    // Smooth camera following
    updateCameraPosition();
  };

  /**
   * Updates camera position to follow player with smooth motion
   */
  const updateCameraPosition = function () {
    const cameraTargetX = player.position.x;
    const cameraTargetZ = player.position.z + 15; // Position camera behind player
    const cameraLerpFactor = 0.1; // Smoothing factor (0-1)

    player.camera.position.x +=
      (cameraTargetX - player.camera.position.x) * cameraLerpFactor;
    player.camera.position.z +=
      (cameraTargetZ - player.camera.position.z) * cameraLerpFactor;

    // Look at player
    player.camera.lookAt(
      new THREE.Vector3(player.position.x, 0, player.position.z)
    );
  };

  /**
   * GETTERS AND SETTERS
   */

  const updateGunStatus = function (gunForPlayer) {
    player.hasGun = true;
    player.gun = gunForPlayer;
  };

  const updateGunPosition = function () {
    if (player.hasGun) {
      player.gun.updateGunPosition();
    } else if (player.gun) {
      player.gun.removeGun();
      player.gun = null;
    }
  };

  const getPlayerSprite = function () {
    return player.sprite;
  };

  const getPlayerPosition = function () {
    return player.position;
  };

  const getBoundBox = function () {
    return boundingBox;
  };

  const getPlayerSequence = function () {
    return player.sequence;
  };

  const getPlayerDirection = function () {
    return player.direction;
  };

  const getHasGun = function () {
    return player.hasGun;
  };

  const getGun = function () {
    return player.gun;
  };

  const getPlayerFacingDirection = function () {
    return player.facing;
  };

  const getPlayerHealth = function () {
    return player.health;
  };

  const getUsername = function () {
    return username;
  };

  // Handle player's gun
  const createGun = function (scene, gunInfo) {
    player.gun = GunSprite();
    player.gun.createGun(
      scene,
      player.position.x,
      player.position.z,
      gunInfo.offsetX,
      gunInfo.offsetY
    );
    player.gun.attachGunToPlayer(player.sprite);
    player.hasGun = true;
  };

  const dropGun = function () {
    if (player.hasGun) {
      if (dropGunAudio) {
        dropGunAudio.play();
      }
      player.hasGun = false;
      player.gun.removeGun();
      player.gun = null;
    }
  };

  /**
   * Sets the player's position
   * @param {Object} pos - Position object with x, y, z coordinates
   */

  const setAll = function (userState) {
    setPosition(userState.position);
    setDirection(userState.direction);
    setSequence(userState.sequence);
    player.health = userState.health;
    player.hasGun = userState.hasGun;
  };

  const setPosition = function (pos) {
    if (player.sprite) {
      player.position.x = pos.x;
      player.position.y = pos.y || 1.5; // Default to 1.5 if not provided
      player.position.z = pos.z;
      player.sprite.position.set(
        player.position.x,
        player.position.y,
        player.position.z
      );
    }
  };

  /**
   * Sets the player's direction and corresponding animation
   * @param {string} dir - Direction: "up", "down", "left", "right", "idle"
   */
  const setDirection = function (dir) {
    if (dir && dir !== player.direction) {
      player.direction = dir;
      switch (dir) {
        case "left":
          setSequence(sequences.moveLeft);
          break;
        case "up":
          setSequence(sequences.moveUp);
          break;
        case "right":
          setSequence(sequences.moveRight);
          break;
        case "down":
          setSequence(sequences.moveDown);
          break;
        case "idle":
        default:
          setSequence(sequences.idleDown);
          break;
      }
    }
  };

  /**
   * PUBLIC API
   */
  return {
    createPlayer,
    move,
    stop,
    updatePlayerPosition,
    updatePlayerAnimation,
    updateGunStatus,
    updateGunPosition,
    getPlayerSprite,
    getPlayerPosition,
    getBoundBox,
    getPlayerDirection,
    getPlayerHealth,
    getHasGun,
    getUsername,
    getGun,
    getPlayerSequence,
    getPlayerFacingDirection,
    setAll,
    createGun,
    dropGun,
  };
};

export default PlayerSprite;
