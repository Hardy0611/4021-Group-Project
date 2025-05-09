import * as THREE from "three";
import Socket from "./socket.js";

const BulletSprite = function () {
  // Socket reference
  const socket = Socket.getSocket();

  // Sprite configuration
  const horizontalTile = 4;
  const verticalTile = 1;
  const bulletLocation = { right: 0, left: 0.25, up: 0.5, down: 0.75 };
  const spriteTexture = "asset/bullet.png";

  // Sound effect
  const bulletShootAudio = new Audio("sound/shoot_bullet.mp3");

  // Bullet state variables
  var boundingBox = null;
  var mapBBArray = null;
  const bullet = {
    id: null,
    map: null,
    sprite: null,
    speed: 0.4,
    direction: null,
    initialX: null,
    initialZ: null,
    destroy: false,
    creationTime: null,
    shooterUsername: null
  };

  /**
   * Creates a bullet sprite and adds it to the scene
   * @param {string} id - Unique ID for this bullet
   * @param {THREE.Scene} scene - The scene to add the bullet to
   * @param {number} x - Initial X position
   * @param {number} z - Initial Z position
   * @param {string} direction - Direction: 'left', 'right', 'up', 'down'
   * @param {Array} mapBB - Array of map bounding boxes for collision detection
   * @param {boolean} isLocalPlayer - Whether this bullet was fired by the local player
   */
  const createBullet = function (
    id,
    scene,
    x,
    z,
    direction,
    mapBB,
    isLocalPlayer = false,
    shooterUsername = null
  ) {
    // Don't create if already destroyed
    if (bullet.destroy) return;

    // Store map collision data
    mapBBArray = mapBB;

    // Flag to determine if this bullet came from current player
    bullet.isCurrentPlayerBullet = isLocalPlayer;

    // Store shooter's username
    bullet.shooterUsername = shooterUsername;

    // Play sound effect
    if (bulletShootAudio) {
      bulletShootAudio.currentTime = 0; // Reset to start
      bulletShootAudio
        .play()
        .catch((e) => console.log("Audio play failed:", e));
    }

    // Store bullet ID
    bullet.id = id;

    // Set creation time for lifespan calculation
    bullet.creationTime = Date.now();

    // Create sprite texture
    bullet.map = new THREE.TextureLoader().load(spriteTexture);
    bullet.map.magFilter = THREE.NearestFilter;
    bullet.map.repeat.set(1 / horizontalTile, 1 / verticalTile);

    // Set texture offset based on direction
    bullet.map.offset.x = bulletLocation[direction];
    bullet.map.offset.y = 0;

    // Create sprite material with the texture
    const spriteMaterial = new THREE.SpriteMaterial({
      map: bullet.map,
      transparent: true,
    });

    // Create the sprite with the material
    bullet.sprite = new THREE.Sprite(spriteMaterial);
    bullet.sprite.scale.set(0.75, 0.75, 1);

    // Set initial position
    var initialX = x;
    var initialZ = z;
    var initialY = 1;

    // Adjust start position based on direction (offset from player)
    const bulletOffset = 2;
    switch (direction) {
      case "left":
        initialX -= bulletOffset;
        initialY += 0.45;
        break;
      case "right":
        initialX += bulletOffset;
        initialY += 0;
        break;
      case "up":
        initialZ -= bulletOffset;
        initialX += 0.6;
        initialY += 0;
        break;
      case "down":
        initialZ += bulletOffset;
        initialX -= 0.75;
        initialY += 0;
        break;
    }

    // Set the sprite position and add to scene
    bullet.sprite.position.set(initialX, initialY, initialZ);
    scene.add(bullet.sprite);

    // Store direction and initial position
    bullet.direction = direction;
    bullet.initialX = initialX;
    bullet.initialZ = initialZ;

    // Create and configure bounding box for collision detection
    boundingBox = new THREE.Box3();
    updateBoundingBox();
  };

  /**
   * Update the bullet's bounding box based on its current position
   */
  const updateBoundingBox = function () {
    if (!bullet.sprite || bullet.destroy) return;

    // Create a new bounding box around the sprite
    boundingBox = new THREE.Box3().setFromObject(bullet.sprite);

    // Expand the bounding box slightly to improve hit detection
    boundingBox.min.x -= 0.5;
    boundingBox.max.x += 0.5;
    boundingBox.min.z -= 0.5;
    boundingBox.max.z += 0.5;
  };

  /**
   * Remove the bullet from the scene and clean up
   */
  const removeBullet = function () {
    bullet.destroy = true;
    if (bullet.sprite && bullet.sprite.parent) {
      bullet.sprite.parent.remove(bullet.sprite);
      bullet.sprite = null;
    }
    boundingBox = null;
    mapBBArray = null;
  };

  /**
   * Check if the bullet has collided with any map objects
   * @returns {boolean} True if the bullet hit an object
   */
  const collideObject = function () {
    if (bullet.destroy || !mapBBArray || !boundingBox) return false;

    for (let i = 0; i < mapBBArray.length; i++) {
      if (boundingBox.intersectsBox(mapBBArray[i])) {
        removeBullet();
        return true;
      }
    }
    return false;
  };

  /**
   * Move the bullet and check for collisions
   * @param {THREE.Box3} currentPlayerBB - Bounding box of the current player
   * @param {Array} otherPlayerBB - Array of other players' bounding boxes
   * @returns {Object} Hit status information
   */
  const moveBullet = function (currentPlayerBB, otherPlayerBB) {
    // Don't process if already destroyed
    if (bullet.destroy) {
      return {
        currentUser: false,
        hitOtherPlayer: false,
        otherPlayerUsername: null,
        shooterUsername: null
      };
    }

    // Check bullet lifetime (destroy after 1.5 seconds)
    const currentTime = Date.now();
    if (bullet.creationTime && currentTime - bullet.creationTime > 1500) {
      removeBullet();
      return {
        currentUser: false,
        hitOtherPlayer: false,
        otherPlayerUsername: null,
        shooterUsername: null
      };
    }

    // Move the bullet based on direction
    switch (bullet.direction) {
      case "left":
        bullet.initialX -= bullet.speed;
        break;
      case "up":
        bullet.initialZ -= bullet.speed;
        break;
      case "right":
        bullet.initialX += bullet.speed;
        break;
      case "down":
        bullet.initialZ += bullet.speed;
        break;
    }

    // Update sprite position
    if (bullet.sprite) {
      bullet.sprite.position.set(
        bullet.initialX,
        bullet.sprite.position.y,
        bullet.initialZ
      );

      // Update bounding box after movement
      updateBoundingBox();
    }

    // Check for collision with environment
    if (collideObject()) {
      return {
        currentUser: false,
        hitOtherPlayer: false,
        otherPlayerUsername: null,
        shooterUsername: null
      };
    }

    // Check if bullet hit the current player - ONLY for bullets fired by others
    if (
      currentPlayerBB &&
      boundingBox &&
      !bullet.isCurrentPlayerBullet &&
      boundingBox.intersectsBox(currentPlayerBB)
    ) {
      removeBullet();
      return {
        currentUser: true,
        hitOtherPlayer: false,
        otherPlayerUsername: null,
        shooterUsername: bullet.shooterUsername
      };
    }

    // No hits
    return {
      currentUser: false,
      hitOtherPlayer: false,
      otherPlayerUsername: null,
      shooterUsername: null
    };
  };

  /**
   * Checks if the bullet has been destroyed
   * @returns {boolean} True if the bullet is destroyed
   */
  const isDestroy = function () {
    return bullet.destroy;
  };

  /**
   * Gets the bullet's ID
   * @returns {string} Bullet ID
   */
  const getID = function () {
    return bullet.id;
  };

  // Add getter for shooter username
  const getShooterUsername = function() {
    return bullet.shooterUsername;
  };

  // Public API
  return {
    createBullet,
    removeBullet,
    moveBullet,
    isDestroy,
    getID,
    getShooterUsername
  };
};

export default BulletSprite;
