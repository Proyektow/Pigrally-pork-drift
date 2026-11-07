import * as THREE from 'three';
import { gameState, PIGS, HATS } from './state.js';
import { AudioController } from './audio.js';
import { createOrganicPig } from './pigModels.js';
import { createTrack } from './track.js';
import { ItemManager } from './items.js';
import { RivalPigsManager } from './ai.js';

// --- ELEMENTOS DOM ---
const $ = id => document.getElementById(id);
const screens = {
  loading: $('screen-loading'),
  menu: $('screen-menu'),
  race: $('screen-race')
};

// --- MOTOR AUDIO & ESCENA ---
const audio = new AudioController();
let renderer, scene, camera;
let track, itemManager, rivalManager;
let playerPigMesh = null;

// --- VARIABLES DE FÍSICAS Y DRIFT ---
let inRace = false;
let playerX = 0, playerZ = 16, playerYaw = Math.PI / 2;
let playerSpeed = 0;
let steerInput = 0;
let isDrifting = false, driftTimer = 0, currentSparkTier = 0;
let boostTimer = 0, spinTimer = 0;
let gyroEnabled = false, gyroSteer = 0;

// Carrera & Vuelta
let lap = 1, currentLapAngle = 0, lastAngle = 0, raceTimer = 0;
let heldItem = null;
let itemRouletteActive = false;

// 1. INICIALIZACIÓN GRÁFICA
function initWebGL() {
  const container = $('game-stage');
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#94d2ff');
  scene.fog = new THREE.Fog('#94d2ff', 45, 130);

  camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 300);

  const hemi = new THREE.HemisphereLight('#ffffff', '#5c8042', 1.8);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#fff0be', 2.5);
  sun.position.set(-35, 55, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  track = createTrack(THREE, scene);
  itemManager = new ItemManager(scene, audio);
  rivalManager = new RivalPigsManager(THREE, scene, track);

  spawnPlayerPig();
}

function spawnPlayerPig() {
  if (playerPigMesh) scene.remove(playerPigMesh);
  const cfg = gameState.currentPig;
  playerPigMesh = createOrganicPig(THREE, { skin: cfg.skin, hat: gameState.hat });
  scene.add(playerPigMesh);
}

// 2. ENLACE DE VISTAS Y MENÚS
function setupMenuUI() {
  // Datos piloto
  $('val-corn').textContent = gameState.corn;
  $('val-level').textContent = gameState.level;
  $('val-xp').style.width = `${gameState.xp}%`;

  // Mute toggle
  $('btn-audio-toggle').onclick = () => {
    const s = gameState.toggleSound();
    audio.setMute(!s);
    $('btn-audio-toggle').textContent = s ? '🔊' : '🔇';
  };

  // Botón Jugar / Empezar
  $('btn-enter-game').onclick = () => {
    audio.wake();
    screens.loading.classList.remove('active');
    screens.menu.classList.remove('hidden');
    screens.menu.classList.add('active');
    audio.startMusic();
  };

  $('btn-start-race').onclick = () => {
    screens.menu.classList.add('hidden');
    screens.menu.classList.remove('active');
    screens.race.classList.remove('hidden');
    screens.race.classList.add('active');
    startRaceSequence();
  };

  // Control Giroscopio
  $('btn-gyro-toggle').onclick = async () => {
    audio.wake();
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const resp = await DeviceOrientationEvent.requestPermission();
        if (resp === 'granted') toggleGyro();
      } catch (e) {}
    } else {
      toggleGyro();
    }
  };

  // Garaje Drawer
  const drawer = $('garage-drawer');
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.view === 'garage') {
        drawer.classList.remove('hidden');
        renderGarage();
      } else {
        drawer.classList.add('hidden');
      }
    };
  });
  $('btn-close-garage').onclick = () => drawer.classList.add('hidden');

  $('btn-prev-pig').onclick = () => { gameState.pigIndex--; renderGarage(); spawnPlayerPig(); };
  $('btn-next-pig').onclick = () => { gameState.pigIndex++; renderGarage(); spawnPlayerPig(); };

  // Dificultad cc
  document.querySelectorAll('.cc-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.cc-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      gameState.cc = Number(b.dataset.cc);
    };
  });

  // Pausa e ítems
  $('btn-pause').onclick = () => { inRace = !inRace; };
  $('btn-use-item').onclick = triggerPlayerItem;
  $('btn-finish-continue').onclick = () => {
    $('results-modal').classList.add('hidden');
    screens.race.classList.add('hidden');
    screens.race.classList.remove('active');
    screens.menu.classList.remove('hidden');
    screens.menu.classList.add('active');
    $('val-corn').textContent = gameState.corn;
    audio.startMusic();
  };
}

function renderGarage() {
  const p = gameState.currentPig;
  $('garage-pig-name').textContent = p.name;
  $('garage-pig-perk').textContent = p.desc;

  const matrix = $('stats-bars');
  matrix.innerHTML = `
    <div class="stat-item"><span>Velocidad</span><div class="stat-track"><i style="width:${p.speed}%"></i></div><b>${p.speed}</b></div>
    <div class="stat-item"><span>Aceleración</span><div class="stat-track"><i style="width:${p.accel}%"></i></div><b>${p.accel}</b></div>
    <div class="stat-item"><span>Peso</span><div class="stat-track"><i style="width:${p.weight}%"></i></div><b>${p.weight}</b></div>
    <div class="stat-item"><span>Derrape</span><div class="stat-track"><i style="width:${p.drift}%"></i></div><b>${p.drift}</b></div>
  `;

  const hatsList = $('hats-list');
  hatsList.innerHTML = HATS.map(h => `
    <button class="hat-chip ${gameState.hat === h ? 'active' : ''}">${h}</button>
  `).join('');

  hatsList.querySelectorAll('.hat-chip').forEach(btn => {
    btn.onclick = () => {
      gameState.hat = btn.textContent;
      renderGarage();
      spawnPlayerPig();
    };
  });
}

function toggleGyro() {
  gyroEnabled = !gyroEnabled;
  $('btn-gyro-toggle').classList.toggle('active', gyroEnabled);
  $('txt-gyro').textContent = `Giroscopio: ${gyroEnabled ? 'ACTIVADO' : 'DESACTIVADO'}`;
  if (gyroEnabled) {
    window.addEventListener('deviceorientation', handleOrientation);
  } else {
    window.removeEventListener('deviceorientation', handleOrientation);
    gyroSteer = 0;
  }
}

function handleOrientation(e) {
  const tilt = e.gamma || 0;
  gyroSteer = THREE.MathUtils.clamp(-tilt / 22, -1, 1);
}

// 3. CONTROLES TÁCTILES Y DERRAPE ESTILO TOUR
function setupControls() {
  let touchStartX = 0;
  let isTouching = false;
  const zone = $('touch-zone');

  zone.addEventListener('touchstart', e => {
    e.preventDefault();
    audio.wake();
    isTouching = true;
    touchStartX = e.touches[0].clientX;
    // Si ya estamos a buena velocidad, comenzar derrape
    if (playerSpeed > 5) {
      isDrifting = true;
      driftTimer = 0;
      currentSparkTier = 0;
      $('drift-meter').classList.remove('hidden');
    }
  }, { passive: false });

  zone.addEventListener('touchmove', e => {
    if (!isTouching) return;
    const currentX = e.touches[0].clientX;
    const delta = (currentX - touchStartX) / (window.innerWidth * 0.35);
    steerInput = THREE.MathUtils.clamp(delta, -1, 1);
  }, { passive: false });

  const endTouch = () => {
    isTouching = false;
    steerInput = 0;
    if (isDrifting) {
      releaseMiniTurbo();
    }
  };
  zone.addEventListener('touchend', endTouch);
  zone.addEventListener('touchcancel', endTouch);

  // Teclado para PC / Debug
  window.addEventListener('keydown', e => {
    if (e.key === 'a' || e.key === 'ArrowLeft') steerInput = 1;
    if (e.key === 'd' || e.key === 'ArrowRight') steerInput = -1;
    if (e.key === ' ' && !isDrifting && playerSpeed > 5) {
      isDrifting = true;
      driftTimer = 0;
      currentSparkTier = 0;
      $('drift-meter').classList.remove('hidden');
    }
    if (e.key === 'e') triggerPlayerItem();
  });
  window.addEventListener('keyup', e => {
    if (['a', 'd', 'ArrowLeft', 'ArrowRight'].includes(e.key)) steerInput = 0;
    if (e.key === ' ' && isDrifting) releaseMiniTurbo();
  });
}

function releaseMiniTurbo() {
  isDrifting = false;
  $('drift-meter').classList.add('hidden');
  if (currentSparkTier > 0) {
    audio.miniTurbo(currentSparkTier);
    boostTimer = currentSparkTier * 0.75;
    showToast(['¡MINI-TURBO!', '¡SÚPER TURBO!', '¡ULTRA OINK TURBO!'][currentSparkTier - 1]);
  }
  currentSparkTier = 0;
}

function showToast(txt) {
  const t = $('hud-toast');
  t.textContent = txt;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1200);
}

// 4. SECUENCIA DE SALIDA Y CARRERA
function startRaceSequence() {
  inRace = false;
  playerX = 0; playerZ = 16; playerYaw = Math.PI / 2;
  playerSpeed = 0; lap = 1; raceTimer = 0;
  lastAngle = 0; heldItem = null;
  updateItemSlotUI();

  rivalManager.reset();

  const countOverlay = $('race-countdown');
  countOverlay.classList.remove('hidden');
  let count = 3;
  countOverlay.textContent = count;
  audio.playTone(440, 0.15, 'sine', 0.2);

  const itv = setInterval(() => {
    count--;
    if (count > 0) {
      countOverlay.textContent = count;
      audio.playTone(440, 0.15, 'sine', 0.2);
    } else {
      clearInterval(itv);
      countOverlay.textContent = '¡OINK!';
      audio.oink(1.3);
      setTimeout(() => countOverlay.classList.add('hidden'), 600);
      inRace = true;
    }
  }, 850);
}

// 5. CAJAS DE OBJETOS Y RULETA
function onHitItemBox() {
  if (heldItem || itemRouletteActive) return;
  itemRouletteActive = true;
  audio.wake();

  let spins = 0;
  const rouletteInterval = setInterval(() => {
    spins++;
    const temp = itemManager.rollRandomItem();
    $('item-icon').textContent = temp.icon;
    audio.rouletteTick();

    if (spins > 12) {
      clearInterval(rouletteInterval);
      itemRouletteActive = false;
      heldItem = temp;
      updateItemSlotUI();
      audio.itemReady();
    }
  }, 90);
}

function updateItemSlotUI() {
  const btn = $('btn-use-item');
  if (heldItem) {
    btn.disabled = false;
    $('item-icon').textContent = heldItem.icon;
  } else {
    btn.disabled = true;
    $('item-icon').textContent = '❓';
  }
}

function triggerPlayerItem() {
  if (!heldItem || !inRace) return;
  const action = itemManager.useItem(heldItem, { x: playerX, z: playerZ }, playerYaw, true);
  if (action && action.type === 'boost') {
    boostTimer = action.time;
    showToast('¡SUPER MAÍZ!');
  }
  heldItem = null;
  updateItemSlotUI();
}

// 6. CICLO FÍSICO IN-GAME
function updatePhysics(dt, time) {
  if (!inRace) return;
  raceTimer += dt;
  $('hud-timer').textContent = formatTime(raceTimer);

  const cfg = gameState.currentPig;
  const maxSpd = (16.0 + (cfg.speed - 50) * 0.1) * (gameState.cc / 100);

  // Giro: Giroscopio o Táctil
  const activeSteer = (gyroEnabled && Math.abs(gyroSteer) > 0.05) ? gyroSteer : steerInput;

  // Auto-Aceleración estilo Tour
  if (spinTimer > 0) {
    spinTimer -= dt;
    playerSpeed = Math.max(0, playerSpeed - 18 * dt);
  } else {
    playerSpeed += (cfg.accel * 0.12) * dt * 10;
    if (boostTimer > 0) {
      boostTimer -= dt;
      playerSpeed = maxSpd + 6.0;
    } else {
      playerSpeed = Math.min(playerSpeed, maxSpd);
    }
  }

  // Fricción fuera de pista
  const offDist = track.getRoadDistance(playerX, playerZ);
  if (offDist > track.width / 2) {
    playerSpeed -= 14 * dt;
  }

  // Acumulación de Derrape
  if (isDrifting && playerSpeed > 5) {
    driftTimer += dt;
    audio.skidSound();
    const meter = $('drift-meter');
    meter.className = 'drift-indicator';

    if (driftTimer > 2.8) {
      currentSparkTier = 3;
      meter.classList.add('purple');
    } else if (driftTimer > 1.5) {
      currentSparkTier = 2;
      meter.classList.add('orange');
    } else if (driftTimer > 0.6) {
      currentSparkTier = 1;
      meter.classList.add('blue');
    }
  }

  // Movimiento y orientación
  const turnRate = (cfg.drift * 0.02) * (isDrifting ? 2.3 : 1.7);
  playerYaw += activeSteer * dt * turnRate;
  playerX += Math.cos(playerYaw) * playerSpeed * dt;
  playerZ += Math.sin(playerYaw) * playerSpeed * dt;

  playerPigMesh.position.set(playerX, 0, playerZ);
  playerPigMesh.rotation.y = -playerYaw + Math.PI / 2;
  playerPigMesh.userData.animate(time, playerSpeed, isDrifting, activeSteer);

  audio.hoofBeat(playerSpeed);

  // Vueltas y Checkpoints
  const theta = track.getAngle(playerX, playerZ);
  if (lastAngle > 5.2 && theta < 1.0) {
    lap++;
    if (lap > 3) {
      finishRace();
      return;
    }
    $('hud-lap').textContent = `${lap}/3`;
    showToast(`¡VUELTA ${lap}!`);
  }
  lastAngle = theta;
  currentLapAngle = (lap - 1) * Math.PI * 2 + theta;

  // Actualizar IA, objetos y colisiones
  track.checkPickups(playerX, playerZ, time, onHitItemBox, () => {
    gameState.addCorn(1);
    $('val-corn').textContent = gameState.corn;
    audio.playTone(880, 0.08, 'triangle', 0.15, 60);
  });
  track.update(time);

  itemManager.update(dt, playerX, playerZ, () => {
    spinTimer = 1.2;
    audio.bump();
    showToast('¡IMPACTO!');
  });

  rivalManager.update(dt, time, currentLapAngle, playerSpeed, gameState.cc / 100);
  rivalManager.checkPigCollisions(playerX, playerZ, (bx, bz) => {
    // Retroceso por empujón
    const pushAngle = Math.atan2(playerZ - bz, playerX - bx);
    playerX += Math.cos(pushAngle) * 0.8;
    playerZ += Math.sin(pushAngle) * 0.8;
    audio.bump();
  });

  // Posición actual
  const rank = rivalManager.getRankList(currentLapAngle);
  $('hud-position').textContent = rank;

  // Cámara en 3ª persona tipo Nintendo
  const cDist = 5.2 + playerSpeed * 0.06;
  const camX = playerX - Math.cos(playerYaw) * cDist;
  const camZ = playerZ - Math.sin(playerYaw) * cDist;
  camera.position.lerp(new THREE.Vector3(camX, 3.4, camZ), 0.15);
  camera.lookAt(playerX, 1.1, playerZ);
}

function finishRace() {
  inRace = false;
  audio.stopMusic();
  const rank = rivalManager.getRankList(currentLapAngle);
  const reward = rank === 1 ? 60 : rank === 2 ? 35 : 20;

  gameState.addWin(reward);

  $('res-trophy').textContent = ['🥇', '🥈', '🥉', '🐽'][rank - 1];
  $('res-title').textContent = rank === 1 ? '¡VICTORIA REAL!' : '¡BUEN TROTAR!';
  $('res-time-val').textContent = formatTime(raceTimer);
  $('res-reward-val').textContent = `+${reward} 🌽`;
  $('results-modal').classList.remove('hidden');

  audio.playTone(523, 0.2, 'triangle', 0.25, 100);
  setTimeout(() => audio.playTone(783, 0.4, 'triangle', 0.3, 200), 200);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec * 100) % 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

// 7. BUCLE PRINCIPAL
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.getElapsedTime();

  updatePhysics(dt, time);
  renderer.render(scene, camera);
}

// 8. ARRANQUE
window.onload = () => {
  initWebGL();
  setupMenuUI();
  setupControls();
  loop();

  // Simulación de barra de progreso en splash
  let p = 0;
  const bar = $('progress-bar');
  const itv = setInterval(() => {
    p += 20;
    bar.style.width = `${p}%`;
    if (p >= 100) {
      clearInterval(itv);
      $('btn-enter-game').classList.remove('hidden');
    }
  }, 100);
};

window.onresize = () => {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};
