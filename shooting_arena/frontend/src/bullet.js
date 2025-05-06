import * as THREE from "three";
import Socket from "./socket";

const socket = Socket.getSocket();

const BulletSprite = function () {
  const horizontalTile = 4;
  const verticalTile = 1;
  const bulletLocation = { right: 0, left: 0.25, up: 0.5, down: 0.75 };
  const spriteTexture = "asset/bullet.png";

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
  };

  const bulletShootAudio = new Audio("sound/shoot_bullet.mp3");

  const createBullet = function (id, scene, x, z, direction, mapBB) {
    if (bullet.destroy) return;
    mapBBArray = mapBB;

    if (bulletShootAudio) {
      bulletShootAudio.play();
    }

    // Create Bullet
    bullet.map = new THREE.TextureLoader().load(spriteTexture);
    bullet.map.magFilter = THREE.NearestFilter;
    bullet.map.repeat.set(1 / horizontalTile, 1 / verticalTile);

    bullet.map.offset.x = bulletLocation[direction];
    bullet.map.offset.y = 0;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: bullet.map,
      transparent: true,
    });

    bullet.sprite = new THREE.Sprite(spriteMaterial);
    bullet.sprite.scale.set(0.75, 0.75, 1);

    var initialX = x;
    var initialZ = z;
    var initialY = 1;

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

    bullet.sprite.position.set(initialX, initialY, initialZ);

    scene.add(bullet.sprite);

    bullet.direction = direction;
    bullet.initialX = initialX;
    bullet.initialZ = initialZ;

    // Create Bounding box
    boundingBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    boundingBox.setFromObject(bullet.sprite);
    boundingBox.min.z -= 1;
    boundingBox.max.z += 1;
  };

  const removeBullet = function () {
    bullet.destroy = true;
    if (bullet.sprite && bullet.sprite.parent) {
      bullet.sprite.parent.remove(bullet.sprite); // Remove the sprite from the scene
      bullet.sprite = null; // Clear the reference
    }
    boundingBox = null;
    mapBBArray = null;
  };

  const hitPlayer = function (currentPlayerBB, otherPlayerBB) {
    if (bullet.destroy || !currentPlayerBB || !otherPlayerBB) {
      return {
        hitCurrentPlayer: false,
        hitOtherPlayer: false,
        otherPlayerUsername: null,
      };
    }

    if (boundingBox.intersectsBox(currentPlayerBB)) {
      removeBullet();
      return {
        hitCurrentPlayer: true,
        hitOtherPlayer: false,
        otherPlayerUsername: null,
      };
    }

    for (let i = 0; i < otherPlayerBB.length; i++) {
      if (boundingBox.intersectsBox(otherPlayerBB[i].BB)) {
        removeBullet();
        return {
          hitCurrentPlayer: false,
          hitOtherPlayer: true,
          otherPlayerUsername: otherPlayerBB[i].username,
        };
      }
    }

    return {
      hitCurrentPlayer: false,
      hitOtherPlayer: false,
      otherPlayerUsername: null,
    };
  };

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

  const moveBullet = function (currentPlayerBB, otherPlayerBB) {
    if (bullet.destroy) return;
    const duration = 500;
    const startTime = Date.now();
    var hitPlayerStatus = {
      hitCurrentPlayer: false,
      hitOtherPlayer: false,
      otherPlayerUsername: null,
    };

    const updateBulletPosition = () => {
      const elapsedTime = Date.now() - startTime;

      if (elapsedTime < duration && !bullet.destroy) {
        if (collideObject()) {
          clearInterval(intervalId);
          return;
        }

        // Calculate the new position
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

        // Update the bullet sprite's position
        bullet.sprite.position.set(
          bullet.initialX,
          bullet.sprite.position.y,
          bullet.initialZ
        );

        // Update bounding box
        if (boundingBox) {
          boundingBox
            .copy(bullet.sprite.geometry.boundingBox)
            .applyMatrix4(bullet.sprite.matrixWorld);
        }

        hitPlayerStatus = hitPlayer(currentPlayerBB, otherPlayerBB);
        console.log(hitPlayerStatus);
        if (
          hitPlayerStatus.hitCurrentPlayer ||
          hitPlayerStatus.hitOtherPlayer
        ) {
          clearInterval(intervalId);
          return;
        }
      } else {
        // Stop moving the bullet after 5 seconds
        clearInterval(intervalId);
        removeBullet();
      }
    };

    // Start the movement loop
    const intervalId = setInterval(updateBulletPosition, 1000 / 60);

    return hitPlayerStatus;
  };

  const isDestroy = function () {
    return bullet.destroy;
  };

  const getID = function () {
    return bullet.id;
  };

  return {
    createBullet,
    removeBullet,
    moveBullet,
    isDestroy,
    hitPlayer,
    getID,
  };
};

export default BulletSprite;
