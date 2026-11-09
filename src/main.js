import * as THREE from 'three';
import { gameState, PIG_ROSTER, HATS_CATALOG } from './state.js';
import { SoundSystem } from './audio.js';
import { buildPigRacer } from './pigModels.js';
import { createCircuit } from './track.js';
import { ItemSystem } from './items.js';
import { RivalsController } from './ai.js';

const $ = id => document.getElementById(id);

// Sistemas principales
const sound = new SoundSystem(gameState.muted);
let renderer, scene, camera;
let circuit, itemSystem, rivalsCtrl;
let playerPig = null;
let podiumPlatform = null;

// Estados de Vista ('splash' | 'menu' | 'race')
let currentView = 'splash';
let raceActive = false;
let racePaused = false;
let garageOpen = false;

// Estado Cinemático del Jugador
const racer = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  speed: 0,
  steer: 0,
  drifting: false,
  driftDir: 0,
  driftTime: 0,
  sparkTier: 0,
  boostTimer: 0,
  boostPower: 0,
  spinTimer: 0,
  lap: 1,
  lastT: 0,
  totalProgress: 0,
  raceCoins: 0,
  elapsed: 0,
  heldItem: null,
  rollingItem: false
};

// Entradas de Control
const input = {
  keyLeft: false,
  keyRight: false,
  keyDrift: false,
  touchActive: false,
  touchOriginX: 0,
  touchOriginY: 0,
  touchSteer: 0,
  manualDriftBtn: false,
  gyroEnabled: false,
  gyroSteer: 0
};

// 1. INICIALIZAR ESCENA THREE.JS
function setupScene() {
  const container = $('webgl-container');
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#7ec8ff');
  scene.fog = new THREE.Fog('#7ec8ff', 52, 145);

  camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 260);

  // Luces
  const hemiLight = new THREE.HemisphereLight('#fffbe8', '#4d7c32', 1.75);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight('#fff2cc', 2.4);
  dirLight.position.set(-38, 58, 34);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.left = -55;
  dirLight.shadow.camera.right = 55;
  dirLight.shadow.camera.top = 55;
  dirLight.shadow.camera.bottom = -55;
  scene.add(dirLight);

  // Plataforma de exhibición para el menú / establo
  podiumPlatform = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.6, 0.45, 24),
    new THREE.MeshStandardMaterial({ color: '#ffca28', roughness: 0.4 })
  );
  podiumPlatform.position.set(0, 8.8, 0);
  podiumPlatform.receiveShadow = true;
  scene.add(podiumPlatform);

  circuit = createCircuit(scene);
  itemSystem = new ItemSystem(scene, sound);
  rivalsCtrl = new RivalsController(scene, circuit);
  rivalsCtrl.setVisible(false);

  rebuildPlayerPig();
}

function rebuildPlayerPig() {
  if (playerPig) scene.remove(playerPig);
  const p = gameState.pig;
  playerPig = buildPigRacer({
    skin: p.skin,
    snout: p.snout,
    ear: p.ear,
    hat: gameState.hat
  });
  scene.add(playerPig);
}

// 2. GESTIÓN DE VISTAS Y MENÚS
function switchView(target) {
  currentView = target;
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  const el = $(`view-${target}`);
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('active');
  }

  if (target === 'menu') {
    raceActive = false;
    podiumPlatform.visible = true;
    rivalsCtrl.setVisible(false);
    $('speed-lines-overlay').classList.add('hidden');
    refreshMenuUI();
  } else if (target === 'race') {
    podiumPlatform.visible = false;
    rivalsCtrl.setVisible(true);
  }
}

function refreshMenuUI() {
  const pig = gameState.pig;
  $('ui-pilot-emoji').textContent = pig.emoji;
  $('ui-level').textContent = gameState.level;
  $('ui-xp-fill').style.width = `${gameState.xp}%`;
  $('ui-coins').textContent = gameState.coins;
  $('ui-wins').textContent = gameState.wins;
  $('btn-mute').textContent = gameState.muted ? '🔇' : '🔊';
  $('ui-selected-summary').textContent = `${pig.name} · ${gameState.cc}cc`;

  document.querySelectorAll('.cc-pill').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.cc) === gameState.cc);
  });

  // Garaje
  $('garage-pig-name').textContent = pig.name;
  $('garage-pig-desc').textContent = pig.desc;

  const statLabels = [
    ['Velocidad', pig.stats.speed],
    ['Aceleración', pig.stats.accel],
    ['Peso / Choque', pig.stats.weight],
    ['Mini-Turbo', pig.stats.drift]
  ];
  $('garage-stats-container').innerHTML = statLabels.map(([label, val]) => `
    <div class="stat-line">
      <span>${label}</span>
      <div class="stat-bar-outer"><div class="stat-bar-inner" style="width:${val}%"></div></div>
      <strong>${val}</strong>
    </div>
  `).join('');

  $('garage-hats-list').innerHTML = HATS_CATALOG.map(hat => `
    <button class="hat-pill ${gameState.hat === hat ? 'active' : ''}" data-hat="${hat}">${hat}</button>
  `).join('');

  $('garage-hats-list').querySelectorAll('.hat-pill').forEach(btn => {
    btn.onclick = () => {
      sound.playClick();
      gameState.hat = btn.dataset.hat;
      rebuildPlayerPig();
      refreshMenuUI();
    };
  });
}

// 3. GIROSCOPIO Y CONTROLES HÍBRIDOS (MÓVIL + PC)
function bindControls() {
  // Splash Start
  $('btn-splash-start').onclick = () => {
    sound.unlock();
    sound.playClick();
    sound.startMusic();
    switchView('menu');
  };

  // Sonido Mute
  $('btn-mute').onclick = () => {
    const isMuted = gameState.toggleMute();
    sound.setMuted(isMuted);
    refreshMenuUI();
  };

  // Cilindrada
  document.querySelectorAll('.cc-pill').forEach(btn => {
    btn.onclick = () => {
      sound.playClick();
      gameState.cc = Number(btn.dataset.cc);
      refreshMenuUI();
    };
  });

  // Navegación Inferior & Establo
  document.querySelectorAll('.dock-btn').forEach(btn => {
    btn.onclick = () => {
      sound.playClick();
      document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetDrawer = btn.dataset.drawer;
      garageOpen = targetDrawer === 'garage';
      $('drawer-garage').classList.toggle('hidden', !garageOpen);
    };
  });

  $('btn-close-garage').onclick = () => {
    sound.playClick();
    garageOpen = false;
    $('drawer-garage').classList.add('hidden');
    document.querySelectorAll('.dock-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.drawer === 'none');
    });
  };

  $('btn-prev-pig').onclick = () => {
    sound.playClick();
    gameState.pigIndex -= 1;
    rebuildPlayerPig();
    refreshMenuUI();
  };

  $('btn-next-pig').onclick = () => {
    sound.playClick();
    gameState.pigIndex += 1;
    rebuildPlayerPig();
    refreshMenuUI();
  };

  // Giroscopio Móvil (Con soporte de permisos iOS 13+)
  $('btn-gyro').onclick = async () => {
    sound.playClick();
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === 'granted') toggleGyroState();
      } catch (e) {
        console.warn('Permiso de giroscopio rechazado.');
      }
    } else {
      toggleGyroState();
    }
  };

  // Lanzar Carrera
  $('btn-launch-race').onclick = () => {
    sound.playClick();
    startGrandPrix();
  };

  // Zona Táctil de Conducción (Swipe-to-steer + Auto-drift en giros pronunciados)
  const zone = $('touch-drive-zone');
  const guide = $('steer-visual-guide');
  const knob = $('steer-knob');

  zone.addEventListener('pointerdown', e => {
    input.touchActive = true;
    input.touchOriginX = e.clientX;
    input.touchOriginY = e.clientY;
    input.touchSteer = 0;

    guide.style.left = `${e.clientX}px`;
    guide.style.top = `${e.clientY}px`;
    knob.style.transform = `translate(-50%, -50%)`;
    guide.classList.remove('hidden');
  });

  zone.addEventListener('pointermove', e => {
    if (!input.touchActive) return;
    const dx = e.clientX - input.touchOriginX;
    const maxRadius = 62;
    const clampedDx = THREE.MathUtils.clamp(dx, -maxRadius, maxRadius);
    input.touchSteer = -clampedDx / maxRadius; // Izquierda positivo, Derecha negativo en yaw
    knob.style.transform = `translate(calc(-50% + ${clampedDx}px), -50%)`;
  });

  const releaseTouch = () => {
    if (!input.touchActive) return;
    input.touchActive = false;
    input.touchSteer = 0;
    guide.classList.add('hidden');
    if (racer.drifting && !input.manualDriftBtn && !input.keyDrift) {
      endDriftAndBoost();
    }
  };

  zone.addEventListener('pointerup', releaseTouch);
  zone.addEventListener('pointercancel', releaseTouch);

  // Botón dedicado de Derrape
  const driftBtn = $('btn-manual-drift');
  driftBtn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    input.manualDriftBtn = true;
  });
  const endManualDrift = () => {
    input.manualDriftBtn = false;
    if (racer.drifting) endDriftAndBoost();
  };
  driftBtn.addEventListener('pointerup', endManualDrift);
  driftBtn.addEventListener('pointercancel', endManualDrift);

  // Uso de Objeto
  $('btn-item-slot').onclick = () => useHeldItem();

  // Pausa y Final
  $('btn-pause').onclick = () => {
    if (!raceActive) return;
    racePaused = true;
    $('modal-pause').classList.remove('hidden');
  };
  $('btn-resume').onclick = () => {
    racePaused = false;
    $('modal-pause').classList.add('hidden');
  };
  $('btn-quit').onclick = () => {
    racePaused = false;
    $('modal-pause').classList.add('hidden');
    switchView('menu');
  };
  $('btn-finish-claim').onclick = () => {
    sound.playClick();
    $('modal-finish').classList.add('hidden');
    sound.startMusic();
    switchView('menu');
  };

  // Teclado para PC
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowleft') input.keyLeft = true;
    if (k === 'd' || k === 'arrowright') input.keyRight = true;
    if (k === ' ') input.keyDrift = true;
    if (k === 'e' || k === 'enter') useHeldItem();
    if (k === 'escape' && currentView === 'race') $('btn-pause').click();
  });

  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowleft') input.keyLeft = false;
    if (k === 'd' || k === 'arrowright') input.keyRight = false;
    if (k === ' ') {
      input.keyDrift = false;
      if (racer.drifting) endDriftAndBoost();
    }
  });
}

function toggleGyroState() {
  input.gyroEnabled = !input.gyroEnabled;
  $('btn-gyro').classList.toggle('active', input.gyroEnabled);
  $('ui-gyro-label').textContent = input.gyroEnabled
    ? 'Giroscopio: ACTIVADO (Inclina el móvil)'
    : 'Giroscopio: DESACTIVADO (Toca para activar)';

  if (input.gyroEnabled) {
    window.addEventListener('deviceorientation', onDeviceTilt);
  } else {
    window.removeEventListener('deviceorientation', onDeviceTilt);
    input.gyroSteer = 0;
  }
}

function onDeviceTilt(event) {
  const isLandscape = window.innerWidth > window.innerHeight;
  const rawAngle = isLandscape ? (event.beta || 0) : (event.gamma || 0);
  input.gyroSteer = THREE.MathUtils.clamp(-rawAngle / 24, -1, 1);
}

// 4. LÓGICA DE CARRERA, DERRAPE Y OBJETOS
function startGrandPrix() {
  switchView('race');
  circuit.resetPickups();
  itemSystem.clearAll();
  rivalsCtrl.resetForRace();

  const startFrame = circuit.getPointFrame(0, 0);
  racer.x = startFrame.pos.x;
  racer.y = startFrame.pos.y;
  racer.z = startFrame.pos.z;
  racer.yaw = startFrame.yaw;
  racer.speed = 0;
  racer.steer = 0;
  racer.drifting = false;
  racer.driftTime = 0;
  racer.sparkTier = 0;
  racer.boostTimer = 0;
  racer.spinTimer = 0;
  racer.lap = 1;
  racer.lastT = 0;
  racer.totalProgress = 0;
  racer.raceCoins = 0;
  racer.elapsed = 0;
  racer.heldItem = null;
  racer.rollingItem = false;

  updateItemButtonUI();
  $('hud-lap').textContent = '1 / 3';
  $('hud-time').textContent = '00:00.00';
  $('hud-race-corn').textContent = '0';
  $('hud-drift-badge').classList.add('hidden');
  $('modal-finish').classList.add('hidden');

  playerPig.position.set(racer.x, racer.y, racer.z);
  playerPig.rotation.y = racer.yaw;

  // Cuenta atrás 3, 2, 1, ¡YA!
  raceActive = false;
  racePaused = false;
  const cdEl = $('hud-countdown');
  cdEl.classList.remove('hidden');
  let counter = 3;
  cdEl.textContent = counter;
  sound.playCountdownBeep(false);

  const timer = setInterval(() => {
    counter -= 1;
    if (counter > 0) {
      cdEl.textContent = counter;
      sound.playCountdownBeep(false);
    } else if (counter === 0) {
      cdEl.textContent = '¡YA!';
      sound.playCountdownBeep(true);
      raceActive = true;
    } else {
      clearInterval(timer);
      cdEl.classList.add('hidden');
    }
  }, 800);
}

function endDriftAndBoost() {
  const achievedTier = racer.sparkTier;
  racer.drifting = false;
  racer.driftTime = 0;
  racer.sparkTier = 0;
  $('hud-drift-badge').classList.add('hidden');

  if (achievedTier > 0) {
    sound.playMiniTurboRelease(achievedTier);
    const durations = [0, 0.85, 1.45, 2.25];
    const powers = [0, 4.2, 6.5, 9.2];
    const labels = ['', '⚡ ¡MINI-TURBO!', '🔥 ¡SÚPER MINI-TURBO!', '🟣 ¡ULTRA MINI-TURBO!'];

    racer.boostTimer = durations[achievedTier];
    racer.boostPower = powers[achievedTier];
    triggerToast(labels[achievedTier]);
  }
}

function triggerItemRoulette() {
  if (racer.heldItem || racer.rollingItem) return;
  racer.rollingItem = true;
  const rank = computeCurrentRank();

  let ticks = 0;
  const rollInterval = setInterval(() => {
    ticks++;
    const preview = itemSystem.pickRandomItem(rank);
    $('hud-item-icon').textContent = preview.icon;
    $('hud-item-name').textContent = 'GIRANDO...';
    sound.playRouletteTick();

    if (ticks >= 11) {
      clearInterval(rollInterval);
      racer.rollingItem = false;
      racer.heldItem = itemSystem.pickRandomItem(rank);
      sound.playItemLocked();
      updateItemButtonUI();
    }
  }, 85);
}

function updateItemButtonUI() {
  const btn = $('btn-item-slot');
  if (racer.heldItem) {
    btn.disabled = false;
    $('hud-item-icon').textContent = racer.heldItem.icon;
    $('hud-item-name').textContent = racer.heldItem.name;
  } else {
    btn.disabled = true;
    $('hud-item-icon').textContent = '❓';
    $('hud-item-name').textContent = 'SIN OBJETO';
  }
}

function useHeldItem() {
  if (!raceActive || racePaused || !racer.heldItem) return;
  const res = itemSystem.activateItem(racer.heldItem, racer, rivalsCtrl.rivals);
  if (res) {
    if (res.type === 'boost') {
      racer.boostTimer = res.duration;
      racer.boostPower = res.bonusSpeed;
    }
    if (res.banner) triggerToast(res.banner);
  }
  racer.heldItem = null;
  updateItemButtonUI();
}

let toastTimeout = null;
function triggerToast(message) {
  const el = $('hud-toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), 1350);
}

// 5. ACTUALIZACIÓN FÍSICA DE LA CARRERA
function updateRacePhysics(dt, elapsedTime) {
  if (!raceActive || racePaused) return;

  racer.elapsed += dt;
  $('hud-time').textContent = formatClock(racer.elapsed);

  const pigStats = gameState.pig.stats;
  const ccFactor = gameState.cc === 150 ? 1.18 : gameState.cc === 50 ? 0.84 : 1.0;
  const baseTopSpeed = (16.5 + (pigStats.speed - 70) * 0.08) * ccFactor;
  const accelRate = 8.5 + (pigStats.accel - 70) * 0.08;

  // Combinar dirección Teclado / Táctil / Giroscopio
  const keySteer = (input.keyLeft ? 1 : 0) - (input.keyRight ? 1 : 0);
  let rawSteer = keySteer;
  if (input.touchActive) rawSteer = input.touchSteer;
  else if (input.gyroEnabled && Math.abs(input.gyroSteer) > 0.06) rawSteer = input.gyroSteer;

  racer.steer = THREE.MathUtils.lerp(racer.steer, rawSteer, Math.min(1, dt * 10));

  // Comprobar proyección sobre la pista
  const trackInfo = circuit.projectToTrack(racer.x, racer.z);
  const interactions = circuit.checkInteractions(racer.x, racer.z, elapsedTime, {
    onItemBox: () => triggerItemRoulette(),
    onCorn: () => {
      racer.raceCoins += 1;
      gameState.addCoins(1);
      $('hud-race-corn').textContent = racer.raceCoins;
      sound.playCoin();
    }
  });

  // Control de velocidad y estados de choque/turbo
  if (racer.spinTimer > 0) {
    racer.spinTimer -= dt;
    racer.speed = Math.max(2, racer.speed - 24 * dt);
  } else {
    let targetMax = baseTopSpeed;
    if (racer.boostTimer > 0) {
      racer.boostTimer -= dt;
      targetMax += racer.boostPower;
      racer.speed += 22 * dt;
    } else {
      racer.speed += accelRate * dt;
    }

    if (trackInfo.isOffroad || interactions.inMud) {
      targetMax *= 0.62;
    }
    racer.speed = Math.min(racer.speed, targetMax);
  }

  $('speed-lines-overlay').classList.toggle('hidden', racer.boostTimer <= 0);

  // Lógica de Derrape (Manual con botón/Espacio o Automático en curva cerrada táctil)
  const wantsDrift = input.keyDrift || input.manualDriftBtn || (input.touchActive && Math.abs(racer.steer) > 0.58);
  if (wantsDrift && racer.speed > 7.5 && Math.abs(racer.steer) > 0.18 && racer.spinTimer <= 0) {
    if (!racer.drifting) {
      racer.drifting = true;
      racer.driftDir = Math.sign(racer.steer);
      racer.driftTime = 0;
    }
    racer.driftTime += dt * (0.85 + pigStats.drift * 0.003);

    // Niveles de Mini-Turbo (0.7s Azul, 1.8s Naranja, 3.0s Morado)
    if (racer.driftTime >= 3.0) racer.sparkTier = 3;
    else if (racer.driftTime >= 1.8) racer.sparkTier = 2;
    else if (racer.driftTime >= 0.7) racer.sparkTier = 1;
    else racer.sparkTier = 0;

    sound.playDriftSpark(racer.sparkTier);
    updateDriftBadgeUI();
  } else if (racer.drifting && !wantsDrift) {
    endDriftAndBoost();
  }

  // Rotación y desplazamiento sobre el terreno
  const turnAgility = racer.drifting ? 2.15 : 1.65;
  racer.yaw += racer.steer * turnAgility * dt;

  racer.x += Math.sin(racer.yaw) * racer.speed * dt;
  racer.z += Math.cos(racer.yaw) * racer.speed * dt;

  // Suave fuerza de retorno si se aleja demasiado de los límites de la pista
  if (trackInfo.distanceFromCenter > circuit.width * 0.72) {
    racer.x = THREE.MathUtils.lerp(racer.x, trackInfo.centerPos.x, dt * 3.5);
    racer.z = THREE.MathUtils.lerp(racer.z, trackInfo.centerPos.z, dt * 3.5);
  }

  const groundFrame = circuit.getPointFrame(trackInfo.t, 0);
  racer.y = THREE.MathUtils.lerp(racer.y, groundFrame.pos.y, 0.25);

  // Conteo de vueltas
  if (racer.lastT > 0.85 && trackInfo.t < 0.15) {
    racer.lap += 1;
    if (racer.lap > 3) {
      concludeRace();
      return;
    }
    $('hud-lap').textContent = `${racer.lap} / 3`;
    triggerToast(`🏁 ¡VUELTA ${racer.lap} / 3!`);
  } else if (racer.lastT < 0.15 && trackInfo.t > 0.85) {
    racer.lap = Math.max(1, racer.lap - 1);
  }
  racer.lastT = trackInfo.t;
  racer.totalProgress = (racer.lap - 1) + trackInfo.t;

  // Actualizar malla del cerdo jugador
  playerPig.position.set(racer.x, racer.y, racer.z);
  playerPig.rotation.y = racer.spinTimer > 0 ? racer.yaw + elapsedTime * 15 : racer.yaw;
  const slipAngle = racer.drifting ? racer.driftDir * 0.42 : 0;
  playerPig.userData.updateAnimation(elapsedTime, racer.speed, racer.steer, slipAngle, racer.sparkTier, false);

  sound.playHoofStep(racer.speed);

  // Actualizar Rivales, Objetos y Colisiones
  circuit.updatePickups(elapsedTime);
  rivalsCtrl.update(dt, elapsedTime, racer.totalProgress, ccFactor);
  rivalsCtrl.resolveCollisions(racer, () => sound.playBump());

  itemSystem.update(dt, playerPig.position, rivalsCtrl.rivals, () => {
    if (racer.spinTimer <= 0) {
      racer.spinTimer = 1.3;
      sound.playBump();
      triggerToast('💥 ¡TROMPO POR IMPACTO!');
    }
  });

  // Actualizar HUD de Velocidad y Posición
  $('hud-speed').textContent = Math.round(racer.speed * 5.8);
  const rank = computeCurrentRank();
  $('hud-pos').textContent = rank;

  drawMinimap();
}

function updateDriftBadgeUI() {
  const badge = $('hud-drift-badge');
  badge.classList.remove('hidden', 'tier-1', 'tier-2', 'tier-3');
  if (racer.sparkTier > 0) badge.classList.add(`tier-${racer.sparkTier}`);

  const labels = ['CARGANDO DERRAPE...', '✨ MINI-TURBO AZUL', '🔥 SÚPER TURBO NARANJA', '🟣 ¡ULTRA TURBO MORADO!'];
  $('hud-drift-text').textContent = labels[racer.sparkTier];
  const pct = Math.min(100, (racer.driftTime / 3.0) * 100);
  $('hud-drift-bar').style.width = `${pct}%`;
}

function computeCurrentRank() {
  let rank = 1;
  for (const r of rivalsCtrl.rivals) {
    const rProg = r.laps + r.t;
    if (rProg > racer.totalProgress) rank++;
  }
  return rank;
}

function concludeRace() {
  raceActive = false;
  $('speed-lines-overlay').classList.add('hidden');
  sound.stopMusic();

  const finalRank = computeCurrentRank();
  const rewardTable = [100, 65, 40, 25];
  const earnedCoins = rewardTable[finalRank - 1] + racer.raceCoins * 2;
  gameState.recordRaceResult(finalRank, earnedCoins);

  sound.playFanfare(finalRank === 1);

  const medals = ['🥇', '🥈', '🥉', '🐽'];
  const titles = ['¡CAMPEÓN SUPREMO!', '¡PLATA BRILLANTE!', '¡PODIO DE BRONCE!', '¡BUEN INTENTO!'];
  $('finish-medal').textContent = medals[finalRank - 1];
  $('finish-title').textContent = titles[finalRank - 1];
  $('finish-desc').textContent = `Completaste las 3 vueltas en ${formatClock(racer.elapsed)}.`;
  $('finish-reward').textContent = `+${earnedCoins} 🌽`;

  // Tabla de clasificación
  const entries = [
    { name: `${gameState.pig.name} (Tú)`, prog: racer.totalProgress, isPlayer: true },
    ...rivalsCtrl.rivals.map(r => ({ name: r.name, prog: r.laps + r.t, isPlayer: false }))
  ].sort((a, b) => b.prog - a.prog);

  $('finish-scoreboard').innerHTML = entries.map((e, i) => `
    <div class="score-row ${e.isPlayer ? 'is-player' : ''}">
      <span>${i + 1}º · ${e.name}</span>
      <span>${i === 0 ? formatClock(racer.elapsed) : '+ ' + ((entries[0].prog - e.prog) * 8.4).toFixed(2) + 's'}</span>
    </div>
  `).join('');

  spawnConfetti();
  $('modal-finish').classList.remove('hidden');
}

// 6. MINIMAPA RADAR EN TIEMPO REAL
const mapCanvas = $('minimap-canvas');
const mapCtx = mapCanvas.getContext('2d');

function drawMinimap() {
  const w = mapCanvas.width;
  const h = mapCanvas.height;
  mapCtx.clearRect(0, 0, w, h);

  const scaleX = 1.32;
  const scaleZ = 1.45;
  const cx = w * 0.5;
  const cy = h * 0.5;

  // Trazado de la pista
  mapCtx.beginPath();
  circuit.lookupSamples.forEach((s, i) => {
    const px = cx + s.pos.x * scaleX;
    const py = cy + s.pos.z * scaleZ;
    if (i === 0) mapCtx.moveTo(px, py);
    else mapCtx.lineTo(px, py);
  });
  mapCtx.closePath();
  mapCtx.strokeStyle = 'rgba(255, 240, 210, 0.85)';
  mapCtx.lineWidth = 5;
  mapCtx.stroke();

  // Rivales
  rivalsCtrl.rivals.forEach(r => {
    mapCtx.fillStyle = '#ffee58';
    mapCtx.beginPath();
    mapCtx.arc(cx + r.pos.x * scaleX, cy + r.pos.z * scaleZ, 3.8, 0, Math.PI * 2);
    mapCtx.fill();
  });

  // Jugador
  mapCtx.fillStyle = '#ff3d00';
  mapCtx.strokeStyle = '#ffffff';
  mapCtx.lineWidth = 2;
  mapCtx.beginPath();
  mapCtx.arc(cx + racer.x * scaleX, cy + racer.z * scaleZ, 5.2, 0, Math.PI * 2);
  mapCtx.fill();
  mapCtx.stroke();
}

// 7. CÁMARA Y BUCLE PRINCIPAL DE ANIMACIÓN
function updateCamera(dt, elapsedTime) {
  if (currentView === 'menu' || currentView === 'splash') {
    // Cerdo sobre el podio giratorio en las alturas del valle
    playerPig.position.set(0, 9.05, 0);
    playerPig.rotation.y = elapsedTime * 0.85;
    playerPig.userData.updateAnimation(elapsedTime, 4.5, 0, 0, 0, false);

    const camOffset = garageOpen ? new THREE.Vector3(0, 10.6, 4.4) : new THREE.Vector3(0, 11.2, 5.8);
    camera.position.lerp(camOffset, Math.min(1, dt * 5));
    camera.lookAt(0, 9.8, 0);
    camera.fov = THREE.MathUtils.lerp(camera.fov, 50, dt * 4);
    camera.updateProjectionMatrix();
  } else if (currentView === 'race') {
    const chaseDist = 5.4 + racer.speed * 0.055;
    const chaseHeight = 2.95 + racer.speed * 0.02;
    const desiredCamPos = new THREE.Vector3(
      racer.x - Math.sin(racer.yaw) * chaseDist,
      racer.y + chaseHeight,
      racer.z - Math.cos(racer.yaw) * chaseDist
    );

    camera.position.lerp(desiredCamPos, Math.min(1, dt * 7.5));
    const lookTarget = new THREE.Vector3(
      racer.x + Math.sin(racer.yaw) * 3.2,
      racer.y + 1.15,
      racer.z + Math.cos(racer.yaw) * 3.2
    );
    camera.lookAt(lookTarget);

    const targetFov = racer.boostTimer > 0 ? 72 : 58 + Math.max(0, racer.speed - 12) * 0.45;
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, Math.min(1, dt * 6));
    camera.updateProjectionMatrix();
  }
}

function formatClock(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec * 100) % 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function spawnConfetti() {
  const holder = $('confetti-holder');
  holder.innerHTML = '';
  const colors = ['#ff5e2b', '#ffca28', '#4cd964', '#00d2ff', '#e040fb'];
  for (let i = 0; i < 36; i++) {
    const piece = document.createElement('div');
    const col = colors[i % colors.length];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const dur = 1.5 + Math.random() * 1.4;
    piece.style.cssText = `
      position:absolute; top:-16px; left:${left}%; width:10px; height:14px;
      background:${col}; border-radius:3px;
      animation: fallConfetti ${dur}s ${delay}s ease-in forwards;
    `;
    holder.appendChild(piece);
  }
  if (!document.getElementById('confetti-keyframes')) {
    const st = document.createElement('style');
    st.id = 'confetti-keyframes';
    st.textContent = `@keyframes fallConfetti { to { top: 105%; transform: rotate(540deg) translateX(28px); } }`;
    document.head.appendChild(st);
  }
}

// Bucle Principal
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();

  updateRacePhysics(dt, elapsed);
  updateCamera(dt, elapsed);
  renderer.render(scene, camera);
}

// Arranque y Simulación de Carga Inicial
window.addEventListener('DOMContentLoaded', () => {
  setupScene();
  bindControls();
  refreshMenuUI();
  animate();

  let loadPct = 0;
  const fillEl = $('load-fill');
  const runnerEl = $('load-pig-runner');
  const loadTimer = setInterval(() => {
    loadPct = Math.min(100, loadPct + 25);
    fillEl.style.width = `${loadPct}%`;
    runnerEl.style.left = `${loadPct}%`;
    if (loadPct >= 100) {
      clearInterval(loadTimer);
      $('btn-splash-start').classList.remove('hidden');
    }
  }, 150);
});

window.addEventListener('resize', () => {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
