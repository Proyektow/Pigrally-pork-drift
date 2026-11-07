import * as THREE from 'three';
import { AudioEngine } from './audio.js';
import { createOrganicPig } from './pigModels.js';

// --- ESTADO GLOBAL & ENTORNO ---
const audio = new AudioEngine();
let scene, camera, renderer;
let playerPig, playerRivalPigs = [];
let gyroEnabled = false;
let gyroSteer = 0;

// Variables de Carrera
let inRace = false;
let playerX = 0, playerZ = 13, playerYaw = Math.PI / 2;
let playerSpeed = 0, maxSpeed = 16.5;
let isDrifting = false, driftTime = 0, driftTier = 0;
let superOinkBar = 0;
let currentLap = 1, raceTime = 0;
const totalLaps = 3;

// Controles
const keys = { left: false, right: false, gas: false, drift: false };

// 1. Inicialización 3D
function initGraphics() {
  const container = document.getElementById('canvas-container');
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#94d2ff');
  scene.fog = new THREE.Fog('#94d2ff', 45, 120);

  camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 300);

  // Iluminación cálida de dibujos animados
  const hemi = new THREE.HemisphereLight('#ffffff', '#5c8042', 1.8);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#fff0be', 2.4);
  sun.position.set(-30, 50, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  buildEnvironment();
  setupPlayer();
}

// 2. Circuito Oval con Perfiles de Madera y Césped
function buildEnvironment() {
  // Terreno
  const groundGeo = new THREE.PlaneGeometry(240, 240);
  const groundMat = new THREE.MeshStandardMaterial({ color: '#7bb353', roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Pista de tierra compactada
  const trackShape = new THREE.RingGeometry(11, 19, 64);
  const trackMat = new THREE.MeshStandardMaterial({ color: '#825634', roughness: 0.85 });
  const trackMesh = new THREE.Mesh(trackShape, trackMat);
  trackMesh.rotation.x = -Math.PI / 2;
  trackMesh.position.y = 0.02;
  trackMesh.receiveShadow = true;
  scene.add(trackMesh);
}

// 3. Creación del Cerdito Corredor
function setupPlayer() {
  playerPig = createOrganicPig({ skin: '#ffa5be' });
  playerPig.position.set(playerX, 0, playerZ);
  scene.add(playerPig);
}

// 4. Giroscopio Móvil (DeviceOrientation API)
function setupSensors() {
  const gyroBtn = document.getElementById('btn-toggle-gyro');
  gyroBtn.onclick = async () => {
    audio.wake();
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const resp = await DeviceOrientationEvent.requestPermission();
        if (resp === 'granted') enableGyro();
      } catch (e) {
        console.warn('Permiso giroscopio denegado');
      }
    } else {
      enableGyro();
    }
  };
}

function enableGyro() {
  gyroEnabled = !gyroEnabled;
  const status = document.getElementById('gyro-status-text');
  const gyroBtn = document.getElementById('btn-toggle-gyro');
  status.textContent = `Giroscopio Móvil: ${gyroEnabled ? 'ACTIVADO (Inclina para girar)' : 'DESACTIVADO'}`;
  gyroBtn.classList.toggle('enabled', gyroEnabled);

  if (gyroEnabled) {
    window.addEventListener('deviceorientation', handleOrientation);
  } else {
    window.removeEventListener('deviceorientation', handleOrientation);
    gyroSteer = 0;
  }
}

function handleOrientation(e) {
  // Inclinación horizontal (gamma)
  const tilt = e.gamma || 0; // Grados aprox entre -90 y 90
  gyroSteer = THREE.MathUtils.clamp(-tilt / 25, -1, 1);
}

// 5. Manejo de Teclado y Botones Táctiles
function setupInputs() {
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'w') keys.gas = true;
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === ' ') {
      keys.drift = true;
      if (!isDrifting && playerSpeed > 5) startDrift();
    }
  });

  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowUp' || e.key === 'w') keys.gas = false;
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    if (e.key === ' ') {
      keys.drift = false;
      releaseDrift();
    }
  });

  // Táctiles
  const bindTouch = (id, prop) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[prop] = true; });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[prop] = false; });
  };
  bindTouch('btn-steer-left', 'left');
  bindTouch('btn-steer-right', 'right');
  bindTouch('btn-gas', 'gas');

  const driftBtn = document.getElementById('btn-drift');
  driftBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys.drift = true;
    startDrift();
  });
  driftBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys.drift = false;
    releaseDrift();
  });
}

function startDrift() {
  if (playerSpeed < 4) return;
  isDrifting = true;
  driftTime = 0;
  driftTier = 0;
}

function releaseDrift() {
  if (!isDrifting) return;
  isDrifting = false;
  if (driftTier > 0) {
    audio.playMiniTurbo(driftTier);
    // Impulso de aceleración tipo Mario Kart
    playerSpeed = Math.min(maxSpeed + driftTier * 3, playerSpeed + 4 * driftTier);
    superOinkBar = Math.min(100, superOinkBar + driftTier * 15);
    updateNitroUI();
  }
  driftTier = 0;
}

function updateNitroUI() {
  document.getElementById('nitro-fill').style.width = `${superOinkBar}%`;
  const nitroBtn = document.getElementById('btn-use-nitro');
  nitroBtn.disabled = superOinkBar < 100;
}

// 6. Ciclo de Actualización Física y Cámara
function updateRace(dt, time) {
  if (!inRace) return;

  raceTime += dt;
  document.getElementById('hud-timer').textContent = formatTimer(raceTime);

  // Dirección combinada (Teclas o Giroscopio)
  let steer = 0;
  if (gyroEnabled && Math.abs(gyroSteer) > 0.08) {
    steer = gyroSteer;
  } else {
    steer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
  }

  // Aceleración y rozamiento
  if (keys.gas) {
    playerSpeed += 8.5 * dt;
    audio.playHoof(playerSpeed);
  } else {
    playerSpeed -= 5.0 * dt;
  }
  playerSpeed = THREE.MathUtils.clamp(playerSpeed, 0, maxSpeed);

  // Derrape escalonado
  if (isDrifting && playerSpeed > 4) {
    driftTime += dt;
    if (driftTime > 2.0) driftTier = 3;
    else if (driftTime > 1.0) driftTier = 2;
    else if (driftTime > 0.4) driftTier = 1;
  }

  // Rotación y movimiento
  playerYaw += steer * dt * (isDrifting ? 2.5 : 1.8);
  playerX += Math.cos(playerYaw) * playerSpeed * dt;
  playerZ += Math.sin(playerYaw) * playerSpeed * dt;

  playerPig.position.set(playerX, 0, playerZ);
  playerPig.rotation.y = -playerYaw + Math.PI / 2;
  playerPig.userData.animate(time, playerSpeed, isDrifting, steer);

  // Cámara en 3ª persona deportiva (estilo Tour con seguimiento suave)
  const camDist = 5.2 + playerSpeed * 0.08;
  const camHeight = 3.2;
  const targetCamX = playerX - Math.cos(playerYaw) * camDist;
  const targetCamZ = playerZ - Math.sin(playerYaw) * camDist;

  camera.position.lerp(new THREE.Vector3(targetCamX, camHeight, targetCamZ), 0.15);
  camera.lookAt(playerX, 1.2, playerZ);
}

function formatTimer(s) {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s * 100) % 100);
  return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
}

// 7. Bucle de Render
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.getElapsedTime();

  updateRace(dt, time);
  renderer.render(scene, camera);
}

// Enlace de Botones de Menú & Inicio
document.getElementById('tap-to-start').onclick = () => {
  audio.wake();
  document.getElementById('loader-screen').classList.add('hidden');
  document.getElementById('menu-hud').classList.remove('hidden');
  audio.startBGM();
};

document.getElementById('btn-start-race').onclick = () => {
  document.getElementById('menu-hud').classList.add('hidden');
  document.getElementById('race-hud').classList.remove('hidden');
  startCountdown();
};

function startCountdown() {
  const cd = document.getElementById('countdown-banner');
  cd.classList.remove('hidden');
  let count = 3;
  cd.textContent = count;
  audio.playTone(440, 0.15, 'sine', 0.2);

  const itv = setInterval(() => {
    count--;
    if (count > 0) {
      cd.textContent = count;
      audio.playTone(440, 0.15, 'sine', 0.2);
    } else {
      clearInterval(itv);
      cd.textContent = '¡OINK!';
      audio.oink(1.4);
      setTimeout(() => cd.classList.add('hidden'), 600);
      inRace = true;
    }
  }, 800);
}

// Inicialización
window.onload = () => {
  initGraphics();
  setupInputs();
  setupSensors();
  tick();

  // Simulación de carga fluida
  let progress = 0;
  const bar = document.getElementById('loading-bar');
  const timer = setInterval(() => {
    progress += 25;
    bar.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(timer);
      document.getElementById('tap-to-start').classList.remove('hidden');
    }
  }, 120);
};
