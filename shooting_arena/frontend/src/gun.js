import * as THREE from "three";
import Socket from "./socket";

const socket = Socket.getSocket();

const GunSpriteArray = function (scene) {
  const horizontalTile = 4;
  const verticalTile = 8;
  const gunNumber = 5;
  const spriteTexture = "asset/gun.png";

  var gunsArray = [];

  socket.on("updateGun", (data) => {
    const gunPositionArray = JSON.parse(data);

    const newGunArray = [];
    for (let i = 0; i < gunPositionArray.length; i++) {
      let alreadyExist = false;
      for (let j = 0; j < gunsArray.length; j++) {
        if (gunPositionArray[i] == gunsArray[j]) {
          newGunArray.push(gunsArray[j]);
          alreadyExist = true;
          break;
        }
      }
      if (!alreadyExist) {
        newGunArray.push({
          id: gunPositionArray[i].id,
          offsetX: gunPositionArray[i].offsetX,
          offsetY: gunPositionArray[i].offsetY,
          initialPosX: gunPositionArray[i].initialPosX,
          initialPosZ: gunPositionArray[i].initialPosZ,
          gunSprite: null,
        });
      }
    }

    gunsArray = newGunArray;
    updateMapGun();
  });

  const updateMapGun = function () {
    if (gunsArray.length == 0) return;
    for (let i = 0; i < gunsArray.length; i++) {
      if (!gunsArray[i].gunSprite) {
        gunsArray[i].gunSprite = new GunSprite();
        gunsArray[i].gunSprite.createGun(
          spriteTexture,
          scene,
          gunsArray[i].initialPosX,
          gunsArray[i].initialPosZ,
          gunsArray[i].offsetX,
          gunsArray[i].offsetY
        );
      }
    }
  };

  return { updateMapGun };
};

const GunSprite = function () {
  const horizontalTile = 4;
  const verticalTile = 8;

  const gun = {
    map: null,
    sprite: null,
    attachedPlayer: null,
    boundingBox: null,
  };

  const createGun = function (spriteTexture, scene, x, z, offsetX, offsetY) {
    // Create Gun
    gun.map = new THREE.TextureLoader().load(spriteTexture);
    gun.map.magFilter = THREE.NearestFilter;
    gun.map.repeat.set(1 / horizontalTile, 1 / verticalTile);

    gun.map.offset.x = offsetX;
    gun.map.offset.y = offsetY;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: gun.map,
      transparent: true,
    });

    gun.sprite = new THREE.Sprite(spriteMaterial);
    gun.sprite.scale.set(2.5, 2.5, 1);
    gun.sprite.position.set(x, 1, z);

    scene.add(gun.sprite);

    // Create Bounding box
    gun.boundingBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    gun.boundingBox.setFromObject(gun.sprite);
    gun.boundingBox.min.z -= 0.5;
    gun.boundingBox.max.z += 0.5;
  };

  const attachGunToPlayer = function (playerSprite) {
    gun.attachedPlayer = playerSprite;
  };

  const updateGunPosition = function () {
    if (gun.attachedPlayer) {
      // Update the gun's position to follow the player
      gun.sprite.position
        .copy(gun.attachedPlayer.position)
        .add(new THREE.Vector3(0, 0, 1)); // Adjust as needed
    }
  };

  const getBoundBox = function () {
    return gun.boundingBox;
  };

  return {
    createGun: createGun,
    attachGunToPlayer: attachGunToPlayer,
    updateGunPosition: updateGunPosition,
    getBoundBox: getBoundBox,
  };
};

export default GunSpriteArray;
