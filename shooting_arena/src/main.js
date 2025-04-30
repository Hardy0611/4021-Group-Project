import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Setup
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

// Player state
const player = {
  position: new THREE.Vector3(0, 0, 0),
  speed: 0.15,
  sprite: null,
  currentFrame: 0,
  frameCount: 4, // Number of frames in your sprite sheet
  animationSpeed: 0.1,
  direction: 'down', // 'up', 'down', 'left', 'right'
  isMoving: false
};

// Create player sprite (using SVG for testing)
const createPlayerSprite = () => {
  // Create an SVG programmatically
  const svgSize = 256;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('viewBox', `0 0 ${svgSize} ${svgSize}`);
  svg.setAttribute('width', svgSize);
  svg.setAttribute('height', svgSize);
  
  // Create player character elements
  // Body
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  body.setAttribute('cx', svgSize/2);
  body.setAttribute('cy', svgSize/2);
  body.setAttribute('r', svgSize/3);
  body.setAttribute('fill', '#3498db');
  body.setAttribute('stroke', '#2980b9');
  body.setAttribute('stroke-width', '8');
  svg.appendChild(body);
  
  // Eyes
  const leftEye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  leftEye.setAttribute('cx', svgSize/2 - 30);
  leftEye.setAttribute('cy', svgSize/2 - 20);
  leftEye.setAttribute('r', 15);
  leftEye.setAttribute('fill', 'white');
  svg.appendChild(leftEye);
  
  const rightEye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  rightEye.setAttribute('cx', svgSize/2 + 30);
  rightEye.setAttribute('cy', svgSize/2 - 20);
  rightEye.setAttribute('r', 15);
  rightEye.setAttribute('fill', 'white');
  svg.appendChild(rightEye);
  
  // Eye pupils
  const leftPupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  leftPupil.setAttribute('cx', svgSize/2 - 30);
  leftPupil.setAttribute('cy', svgSize/2 - 20);
  leftPupil.setAttribute('r', 7);
  leftPupil.setAttribute('fill', 'black');
  svg.appendChild(leftPupil);
  
  const rightPupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  rightPupil.setAttribute('cx', svgSize/2 + 30);
  rightPupil.setAttribute('cy', svgSize/2 - 20);
  rightPupil.setAttribute('r', 7);
  rightPupil.setAttribute('fill', 'black');
  svg.appendChild(rightPupil);
  
  // Add directional indicator (always points forward/up)
  const directionIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  directionIndicator.setAttribute('points', `${svgSize/2},${svgSize/6} ${svgSize/2-20},${svgSize/3} ${svgSize/2+20},${svgSize/3}`);
  directionIndicator.setAttribute('fill', '#e74c3c');
  svg.appendChild(directionIndicator);
  
  // Convert SVG to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  
  // Create a Blob from the SVG string
  const svgBlob = new Blob([svgString], {type: 'image/svg+xml'});
  const svgUrl = URL.createObjectURL(svgBlob);
  
  // Load the SVG as a texture
  const texture = new THREE.TextureLoader().load(svgUrl);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  
  // Create a sprite with the SVG texture
  const spriteMaterial = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true
  });
  
  player.sprite = new THREE.Sprite(spriteMaterial);
  player.sprite.scale.set(3, 3, 1);
  player.sprite.position.set(0, 1.5, 0); // Adjust height as needed
  
  scene.add(player.sprite);
  
  // Store the directions object to update the character's appearance
  player.svgElements = {
    url: svgUrl
  };
};

// Call this after scene is loaded
createPlayerSprite();

// Load 3D map model
var map;
const loader = new GLTFLoader();
loader.load(
  "asset/map.glb",
  function (glb) {
    map = glb;
    scene.add(glb.scene);
  },
  // called while loading is progressing
  function (xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  // called when loading has errors
  function (error) {
    console.log("An error happened");
  }
);

// Add background
const spaceTexture = new THREE.TextureLoader().load("asset/space.jpg");
scene.background = spaceTexture;

// Add light
const ambientLight = new THREE.AmbientLight(0xffffff);
const dirLight = new THREE.DirectionalLight(0xffffff);
scene.add(ambientLight, dirLight);

// Initial camera position
camera.position.set(0, 10, 10);
camera.lookAt(player.position);

// Input handling
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

window.addEventListener('keydown', (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = true;
    player.isMoving = true;
    
    // Update direction
    if (e.key === 'ArrowUp') player.direction = 'up';
    else if (e.key === 'ArrowDown') player.direction = 'down';
    else if (e.key === 'ArrowLeft') player.direction = 'left';
    else if (e.key === 'ArrowRight') player.direction = 'right';
  }
});

window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = false;
    
    // Check if any movement key is still pressed
    player.isMoving = Object.values(keys).some(value => value === true);
  }
});

// Update player position
function updatePlayerPosition() {
  // Store previous position for comparison
  const previousPosition = player.position.clone();
  
  // Calculate movement based on which keys are pressed
  let moveX = 0;
  let moveZ = 0;
  
  if (keys.ArrowUp) moveZ -= player.speed;
  if (keys.ArrowDown) moveZ += player.speed;
  if (keys.ArrowLeft) moveX -= player.speed;
  if (keys.ArrowRight) moveX += player.speed;
  
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
      player.direction = moveZ < 0 ? 'up' : 'down';
    } else {
      // Moving more in X direction
      player.direction = moveX < 0 ? 'left' : 'right';
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
  
  camera.position.x += (cameraTargetX - camera.position.x) * cameraLerpFactor;
  camera.position.z += (cameraTargetZ - camera.position.z) * cameraLerpFactor;
  camera.lookAt(new THREE.Vector3(player.position.x, 0, player.position.z));
}

// Also update the animation function for better directional handling
function updateSpriteAnimation() {
  if (!player.sprite || !player.isMoving) return;
  
  // For the SVG character, we can simply rotate the sprite based on direction
  // This is a simple solution until you implement proper sprite animations
  switch (player.direction) {
    case 'up': 
      player.sprite.rotation.y = Math.PI;
      break;
    case 'down': 
      player.sprite.rotation.y = 0;
      break;
    case 'left': 
      player.sprite.rotation.y = Math.PI/2;
      break;
    case 'right': 
      player.sprite.rotation.y = -Math.PI/2;
      break;
  }
  
  // Skip the UV mapping updates since we're using an SVG
  // Keep the frame counter incrementing in case you want to use it
  player.currentFrame = (player.currentFrame + player.animationSpeed) % player.frameCount;
}

// Add coordinate axes helper
function addCoordinateIndicators() {
  
  // Add position display to screen
  const positionDisplay = document.createElement('div');
  positionDisplay.id = 'position-display';
  positionDisplay.style.position = 'absolute';
  positionDisplay.style.top = '10px';
  positionDisplay.style.left = '10px';
  positionDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  positionDisplay.style.color = 'white';
  positionDisplay.style.padding = '10px';
  positionDisplay.style.fontFamily = 'monospace';
  positionDisplay.style.fontSize = '16px';
  positionDisplay.style.borderRadius = '5px';
  document.body.appendChild(positionDisplay);
}

// Call this function after scene setup
addCoordinateIndicators();

// Update the position display in the animate function
function updatePositionDisplay() {
  const display = document.getElementById('position-display');
  if (display) {
    display.textContent = `Position: 
    X: ${player.position.x.toFixed(2)} 
    Y: ${player.position.y.toFixed(2)} 
    Z: ${player.position.z.toFixed(2)}`;
  }
}

// Modify the animate function to include position display update
function animate() {
  updatePlayerPosition();
  updateSpriteAnimation();
  updatePositionDisplay(); // Add this line
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

