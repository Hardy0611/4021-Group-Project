import * as THREE from "three";

const PlayerSprite = function () {
  // Constant Parameters
  const sequences = {
    idleLeft: { uv: { u: 0, v: 0.75 }, count: 3, timing: 1000 },
    idleUp: { uv: { u: 0, v: 0.625 }, count: 1, timing: 1000 },
    idleRight: { uv: { u: 0, v: 0.5 }, count: 3, timing: 1000 },
    idleDown: { uv: { u: 0, v: 0.875 }, count: 3, timing: 1000 },

    moveLeft: { uv: { u: 0, v: 0.25 }, count: 10, timing: 50 },
    moveUp: { uv: { u: 0, v: 0.125 }, count: 10, timing: 50 },
    moveRight: { uv: { u: 0, v: 0 }, count: 10, timing: 50 },
    moveDown: { uv: { u: 0, v: 0.375 }, count: 10, timing: 50 },
  };

  const horizontalTile = 10;
  const verticalTile = 8;
  // Global Parameters
  var lastUpdate = 0;
  var index = 0;

  const player = {
    camera: null,
    position: new THREE.Vector3(0, 0, 0),
    map: null,
    speed: 0.15,
    sprite: null,
    sequence: sequences["idleDown"],
    animationSpeed: 0.1,
    direction: "idle", // 'up', 'down', 'left', 'right', 'idle
  };

  const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  };

  const createPlayer = function (spriteTexture, scene, camera) {
    // Create Player
    player.map = new THREE.TextureLoader().load(spriteTexture);
    player.map.magFilter = THREE.NearestFilter;
    player.map.repeat.set(1 / horizontalTile, 1 / verticalTile);

    // Starting position is IdleDown
    player.map.offset.x = player.sequence.uv.u;
    player.map.offset.y = player.sequence.uv.v;

    // Create a sprite with the SVG texture
    const spriteMaterial = new THREE.SpriteMaterial({
      map: player.map,
      transparent: true,
    });

    player.sprite = new THREE.Sprite(spriteMaterial);
    player.sprite.scale.set(2, 2, 1);
    player.sprite.position.set(0, 3, 0); // Adjust height as needed

    scene.add(player.sprite);

    // Set Camera to Player
    player.camera = camera;
    player.camera.position.set(0, 10, 10);
    player.camera.lookAt(player.position);
  };

  // This function sets the sprite sequence
  const setSequence = function (newSequence) {
    console.log("change sequence");
    console.log(newSequence);
    index = 0;
    lastUpdate = 0;
    player.sequence = newSequence;
  };

  // This function sets the player's moving direction.
  const move = function (dir) {
    if (dir != player.direction) {
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
      }
      player.direction = dir;
    }
  };

  // This function stops the player from moving.
  const stop = function (dir) {
    if (player.direction == dir) {
      player.direction = "idle";
      console.log("make idle");
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
    }
  };

  // Update player position
  const updatePlayerPosition = function () {
    if (player.direction == "idle") return;
    // Store previous position for comparison
    // const previousPosition = player.position.clone();

    // Calculate movement based on which keys are pressed
    let moveX = 0;
    let moveZ = 0;

    switch (player.direction) {
      case "left":
        moveX -= player.speed;
        break;
      case "up":
        moveZ -= player.speed;
        break;
      case "right":
        moveX += player.speed;
        break;
      case "down":
        moveZ += player.speed;
        break;
    }

    // Normalize diagonal movement so it's not faster
    if (moveX !== 0 && moveZ !== 0) {
      const normalizer = 1 / Math.sqrt(2);
      moveX *= normalizer;
      moveZ *= normalizer;
    }

    // Apply movement
    player.position.x += moveX;
    player.position.z += moveZ;

    // Update direction only when actually moving
    if (moveX !== 0 || moveZ !== 0) {
      // Priority: first key pressed determines direction for animation
      if (Math.abs(moveZ) > Math.abs(moveX)) {
        // Moving more in Z direction
        player.direction = moveZ < 0 ? "up" : "down";
      } else {
        // Moving more in X direction
        player.direction = moveX < 0 ? "left" : "right";
      }
    }

    // Update sprite position to match player position
    if (player.sprite) {
      player.sprite.position.x = player.position.x;
      player.sprite.position.z = player.position.z;
    }

    // Update camera to follow player (with smoother movement)
    const cameraTargetX = player.position.x;
    const cameraTargetZ = player.position.z + 15; // Reduced camera distance
    const cameraLerpFactor = 0.1; // Adjust for smoother camera following

    player.camera.position.x +=
      (cameraTargetX - player.camera.position.x) * cameraLerpFactor;
    player.camera.position.z +=
      (cameraTargetZ - player.camera.position.z) * cameraLerpFactor;
    player.camera.lookAt(
      new THREE.Vector3(player.position.x, 0, player.position.z)
    );
  };

  const updatePlayerAnimation = function (time) {
    if (lastUpdate == 0) lastUpdate = time;
    if (lastUpdate == time || time - lastUpdate >= player.sequence.timing) {
      index = (index + 1) % player.sequence.count;
      player.map.offset.x = index / horizontalTile;
      player.map.offset.y = player.sequence.uv.v;
      lastUpdate = time;
    }
  };

  const getPlayerPosition = function () {
    return player.position;
  };

  return {
    createPlayer: createPlayer,
    move: move,
    stop: stop,
    updatePlayerPosition: updatePlayerPosition,
    updatePlayerAnimation: updatePlayerAnimation,
    getPlayerPosition: getPlayerPosition,
  };
};

export default PlayerSprite;
