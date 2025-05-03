import * as THREE from "three";

const GunSprite = function () {
  const horizontalTile = 4;
  const verticalTile = 4;

  const gun = { map: null, sprite: null, attachedPlayer: null };
  var boundingBox = null;

  const createGun = function (spriteTexture, scene, x, z) {
    // Create Gun
    gun.map = new THREE.TextureLoader().load(spriteTexture);
    gun.map.magFilter = THREE.NearestFilter;
    gun.map.repeat.set(1 / horizontalTile, 1 / verticalTile);

    gun.map.offset.x = Math.floor(Math.random() * 3) / horizontalTile;
    gun.map.offset.y = Math.floor(Math.random() * 3) / verticalTile;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: gun.map,
      transparent: true,
    });

    gun.sprite = new THREE.Sprite(spriteMaterial);
    gun.sprite.scale.set(2.5, 2.5, 1);
    gun.sprite.position.set(x, 1, z);

    scene.add(gun.sprite);

    // Create Bounding box
    boundingBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    boundingBox.setFromObject(gun.sprite);
    boundingBox.min.z -= 0.5;
    boundingBox.max.z += 0.5;
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
    return boundingBox;
  };

  return {
    createGun: createGun,
    attachGunToPlayer: attachGunToPlayer,
    updateGunPosition: updateGunPosition,
    getBoundBox: getBoundBox,
  };
};

export default GunSprite;
