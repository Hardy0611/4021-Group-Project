const Environment = function () {
  const position = [
    { x: 10, z: 40 },
    { x: -17, z: 45 },
    { x: 7, z: 21 },
    { x: -10, z: 19 },
    { x: 0, z: 35 },
    { x: 14, z: 10 },
    { x: -15, z: 10 },
    { x: -22, z: 4 },
    { x: 22, z: 2 },
    { x: 0, z: 13 },
    { x: 15.5, z: 2 },
    { x: 12, z: -12 },
    { x: -8, z: 12 },
    { x: -21, z: -24 },
    { x: 0, z: -15 },
    { x: -2, z: -34 },
    { x: -12, z: -37 },
    { x: -22, z: -40 },
    { x: -9, z: 45 },
    { x: 12, z: -24 },
    { x: 15, z: -43 },
    { x: 0, z: -46 },
    { x: 22, z: 24 },
    { x: -23, z: 40 },
    { x: -23, z: 25 },
    { x: -15, z: 8 },
    { x: -9, z: -10 },
    { x: 9, z: 16 },
    { x: 22, z: 11 },
    { x: -22, z: 12 },
    { x: 14, z: -10 },
  ];
  const maxGunNumber = 5;
  var idCounter = 0;

  var gunsPositions = [];
  const verticalTile = 8;

  const usedIndices = new Set();

  const initializeGunPosition = function () {
    if (gunsPositions.length) return;
    for (let i = 0; i < maxGunNumber; i++) {
      let posIndex;
      do {
        posIndex = Math.floor(Math.random() * position.length);
      } while (usedIndices.has(posIndex));
      usedIndices.add(posIndex);
      gunsPositions.push({
        id: idCounter,
        initialPosX: position[posIndex].x,
        initialPosZ: position[posIndex].z,
        offsetX: 0,
        offsetY: Math.floor(Math.random() * verticalTile) / verticalTile,
      });
      idCounter += 1;
    }
    return gunsPositions;
  };

  const removeGun = function (id) {
    // Remove gun
    let toBeRemoveGun = gunsPositions.filter((pos) => pos.id == id);
    if (toBeRemoveGun) {
      usedIndices.delete({
        x: toBeRemoveGun.initialPosX,
        z: toBeRemoveGun.initialPosZ,
      });
    }
    gunsPositions = gunsPositions.filter((pos) => pos.id != id);
    if (gunsPositions.length == maxGunNumber) return;

    // Add gun
    let posIndex;
    do {
      posIndex = Math.floor(Math.random() * position.length);
    } while (usedIndices.has(posIndex));
    usedIndices.add(posIndex);
    gunsPositions.push({
      id: idCounter,
      initialPosX: position[posIndex].x,
      initialPosZ: position[posIndex].z,
      offsetX: 0,
      offsetY: Math.floor(Math.random() * verticalTile) / verticalTile,
    });
    idCounter += 1;
    return gunsPositions;
  };

  const initializePlayerPosition = function () {
    let posIndex;
    do {
      posIndex = Math.floor(Math.random() * position.length);
    } while (usedIndices.has(posIndex));
    usedIndices.add(posIndex);
    return position[posIndex];
  };

  const getGunPosition = function () {
    return gunsPositions;
  };

  const getGunByID = function (id) {
    return gunsPositions.filter((pos) => pos.id == id)[0];
  };

  return {
    initializeGunPosition,
    removeGun,
    initializePlayerPosition,
    getGunPosition,
    getGunByID,
  };
};

export default Environment;
