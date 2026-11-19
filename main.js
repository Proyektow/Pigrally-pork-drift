import * as THREE from 'three';
import { PIG_CATALOG, createPigMesh, animatePigGallop, DustSystem } from './entities.js';
import { TRACK_CATALOG, FarmTrack } from './tracks.js';
import { SoundEngine } from './audio.js';
import { CC_CLASSES, SHOP_ITEMS, loadSave, saveGame, addCoins, buyOrEquip, recordBestTime } from './store.js';

const GAME_MODES = [
  { id: 'grandprix', name: '🏆 Grand Prix (Copa Granja)', desc: '3 circuitos seguidos con puntos contra 11 cerdos.' },
  { id: 'vs', name: '🏁 Carrera Competitiva (VS)', desc: '12 cerdos, cajas dobles, vuelos y monedas en tu mapa.' },
  { id: 'timetrial', name: '⏱️ Contrarreloj', desc: 'Solo tú en pista con 3 Trufas Turbo y récord por cc.' },
  { id: 'knockout', name: '💥 Eliminación (Knockout)', desc: 'Los últimos cerdos caen eliminados en cada vuelta.' }
];

const LOADING_TIPS = [
  'Mantén Shift (o Derrape) al girar: las chispas pasan de Azul a Naranja y Rosa para un Ultra Mini-Turbo.',
  'Las cajas rosas (??) situadas en los bordes exteriores te otorgan DOS objetos a la vez.',
  'En los barrancos, apunta al centro de la rampa azul para desplegar las alas y atravesar los aros dorados.',
  'Si te caes de un puente o barranco, la nube de rescate te devolverá al centro de la pista.',
  'En 200cc puedes tocar el freno mientras derrapas para tomar curvas cerradas sin salirte.',
  'Activa el Volante Inteligente si quieres evitar caídas accidentales en Granja Estelar.'
];

const ITEMS_DEF = {
  truffle: { icon: '🍄', name: 'TRUFA' },
  acorn: { icon: '🌰', name: 'BELLOTA' },
  pumpkin: { icon: '🎃', name: 'CALABAZA' },
  shield: { icon: '🛡️', name: 'ESCUDO' },
  lightning: { icon: '⚡', name: 'RAYO' }
};
const ITEM_KEYS = Object.keys(ITEMS_DEF);
const CUP_POINTS = [15, 12, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0];

// === RENDERER ===
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.3, 1400);
const sound = new SoundEngine();
const save = loadSave();

const hemiLight = new THREE.HemisphereLight('#fff6e5', '#3e542a', 0.92);
scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight('#fff0d4', 2.05);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 280;
const sb = 70;
sunLight.shadow.camera.left = -sb; sunLight.shadow.camera.right = sb;
sunLight.shadow.camera.top = sb; sunLight.shadow.camera.bottom = -sb;
scene.add(sunLight);
scene.add(sunLight.target);

// === ESTADO ===
let mode = 'LOADING'; // LOADING | SPLASH | MENU | COUNTDOWN | RACING | PAUSED | FINISHED
let selectedModeId = 'grandprix';
let selectedPigIdx = 0;
let selectedTrackIdx = 0;
let activeShopCat = 'wings';
let previewWings = false;

let currentTrack = null;
let dustSystem = null;
let racers = [];
let playerRacer = null;
let raceTime = 0;
let totalLaps = 3;
let countdownTimers = [];
let farmerBubbleTimer = null;
let eventBannerTimer = null;
let cupState = { active: false, raceIndex: 0, trackOrder: [0, 1, 2], standings: {} };

const garageGroup = new THREE.Group();
scene.add(garageGroup);
let previewPigRig = null;

// === INPUTS ===
const keys = { left: false, right: false, up: false, down: false, turbo: false, drift: false, rearView: false };
const touch = { left: false, right: false, brake: false, turbo: false, drift: false, rearView: false };
const gyro = { enabled: false, rawTilt: 0, zeroOffset: 0, steer: 0 };

function handleOrientation(e) {
  if (!gyro.enabled) return;
  const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  let tilt = angle === 90 ? (e.beta || 0) : (angle === -90 || angle === 270) ? -(e.beta || 0) : (e.gamma || 0);
  gyro.rawTilt = tilt;
  const adj = tilt - gyro.zeroOffset;
  const deadzone = 4.5; // Zona muerta más cómoda para evitar giros involuntarios
  if (Math.abs(adj) < deadzone) {
    gyro.steer = 0;
  } else {
    const raw = (adj - Math.sign(adj) * deadzone) / 34; // Sensibilidad suave
    gyro.steer = THREE.MathUtils.clamp(Math.sign(raw) * Math.pow(Math.abs(raw), 1.25), -1, 1);
  }
}

async function toggleGyro() {
  if (gyro.enabled) {
    gyro.enabled = false;
    window.removeEventListener('deviceorientation', handleOrientation);
  } else {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return;
      } catch { alert('El giroscopio requiere HTTPS en el móvil.'); return; }
    }
    gyro.enabled = true;
    gyro.zeroOffset = gyro.rawTilt;
    window.addEventListener('deviceorientation', handleOrientation);
  }
  document.getElementById('gyro-status').textContent = gyro.enabled ? 'ON' : 'OFF';
  document.getElementById('btn-gyro-toggle').classList.toggle('active', gyro.enabled);
  document.getElementById('btn-calibrate').classList.toggle('hidden', !gyro.enabled);
}

// === PANTALLA DE CARGA ESTILO MARIO KART 8 DELUXE ===
function drawTrackSilhouette(canvasEl, trackDef) {
  const ctx = canvasEl.getContext('2d');
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  if (!trackDef) return;

  const vecs = trackDef.points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vecs, true);
  const pts = curve.getPoints(90);

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  pts.forEach((p) => {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
  });
  const pad = 18;
  const scale = Math.min((canvasEl.width - pad * 2) / (maxX - minX), (canvasEl.height - pad * 2) / (maxZ - minZ));
  const ox = (canvasEl.width - (maxX - minX) * scale) / 2;
  const oz = (canvasEl.height - (maxZ - minZ) * scale) / 2;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255, 123, 28, 0.35)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = ox + (p.x - minX) * scale;
    const y = oz + (p.z - minZ) * scale;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Punto de meta
  ctx.fillStyle = '#38b86b';
  ctx.beginPath();
  ctx.arc(ox + (pts[0].x - minX) * scale, oz + (pts[0].z - minZ) * scale, 5.5, 0, Math.PI * 2);
  ctx.fill();
}

function showMK8Loading({ title, subtitle, badges, trackDef, duration = 950 }, onComplete) {
  const screen = document.getElementById('loading-screen');
  const bar = document.getElementById('loading-bar-fill');
  const pct = document.getElementById('loading-percent');

  document.getElementById('loading-title').textContent = title;
  document.getElementById('loading-subtitle').textContent = subtitle;
  document.getElementById('loading-tip').textContent = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
  document.getElementById('loading-badges').innerHTML = badges
    .map((b, i) => `<span class="mk-pill ${i === 0 ? 'accent' : ''}">${b}</span>`)
    .join('');

  drawTrackSilhouette(document.getElementById('loading-track-canvas'), trackDef || TRACK_CATALOG[0]);
  bar.style.width = '0%';
  pct.textContent = '0%';
  screen.classList.remove('hidden');

  const start = performance.now();
  function tick(now) {
    const ratio = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - ratio, 2);
    bar.style.width = `${Math.round(eased * 100)}%`;
    pct.textContent = `${Math.round(eased * 100)}%`;
    if (ratio < 1) {
      requestAnimationFrame(tick);
    } else {
      setTimeout(() => {
        screen.classList.add('hidden');
        if (onComplete) onComplete();
      }, 150);
    }
  }
  requestAnimationFrame(tick);
}

// === INTERFAZ DEL MENÚ ===
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}

function buildMenuUI() {
  document.getElementById('menu-coins').textContent = save.coins;
  document.getElementById('splash-coins').textContent = save.coins;

  // Cilindrada
  document.querySelectorAll('.cc-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cc === save.settings.cc);
  });

  // Ajustes de conducción
  document.getElementById('collision-status').textContent = save.settings.collisions ? 'ON' : 'OFF';
  document.getElementById('btn-collision-toggle').classList.toggle('active', save.settings.collisions);
  document.getElementById('smart-status').textContent = save.settings.smartSteer ? 'ON' : 'OFF';
  document.getElementById('btn-smart-toggle').classList.toggle('active', save.settings.smartSteer);
  document.getElementById('autoaccel-status').textContent = save.settings.autoAccel ? 'ON' : 'OFF';
  document.getElementById('btn-autoaccel-toggle').classList.toggle('active', save.settings.autoAccel);

  // Modos
  const modeList = document.getElementById('mode-list');
  modeList.innerHTML = '';
  GAME_MODES.forEach((m) => {
    const btn = document.createElement('button');
    btn.className = `select-card ${m.id === selectedModeId ? 'selected' : ''}`;
    btn.innerHTML = `<div class="card-title"><span>${m.name}</span></div><div class="card-sub">${m.desc}</div>`;
    btn.onclick = () => { sound.init(); sound.playBeep(false); selectedModeId = m.id; buildMenuUI(); };
    modeList.appendChild(btn);
  });

  // Cerdos
  const pigList = document.getElementById('pig-list');
  pigList.innerHTML = '';
  PIG_CATALOG.forEach((pig, idx) => {
    const btn = document.createElement('button');
    btn.className = `select-card ${idx === selectedPigIdx ? 'selected' : ''}`;
    btn.innerHTML = `<div class="card-title"><span>${pig.name}</span><span>🐷</span></div><div class="card-sub">${pig.subtitle}</div>`;
    btn.onclick = () => {
      sound.init(); sound.playOink(0.88 + (idx % 4) * 0.1);
      selectedPigIdx = idx;
      buildMenuUI();
      updateGaragePreview();
    };
    pigList.appendChild(btn);
  });

  const pig = PIG_CATALOG[selectedPigIdx];
  document.getElementById('selected-pig-name').textContent = pig.name;
  document.getElementById('selected-pig-desc').textContent = pig.desc;
  document.getElementById('stat-speed').style.width = `${pig.stats.speed}%`;
  document.getElementById('stat-accel').style.width = `${pig.stats.accel}%`;
  document.getElementById('stat-grip').style.width = `${pig.stats.grip}%`;
  document.getElementById('stat-boost').style.width = `${pig.stats.boost}%`;

  const wName = SHOP_ITEMS.wings.find((x) => x.id === save.equipped.wings)?.name || '';
  const hName = SHOP_ITEMS.hats.find((x) => x.id === save.equipped.hats)?.name || '';
  document.getElementById('equipped-summary').textContent = `🪽 ${wName} • 🎩 ${hName}`;

  // Tienda
  const shopList = document.getElementById('shop-list');
  shopList.innerHTML = '';
  SHOP_ITEMS[activeShopCat].forEach((item) => {
    const owned = save.owned.includes(item.id);
    const equipped = save.equipped[activeShopCat] === item.id;
    const btn = document.createElement('button');
    btn.className = `select-card ${equipped ? 'selected' : ''}`;
    const tag = equipped ? '<span class="price-tag owned">EQUIPADO</span>' : owned ? '<span class="price-tag owned">USAR</span>' : `<span class="price-tag">🪙 ${item.price}</span>`;
    btn.innerHTML = `<div class="card-title"><span>${item.name}</span>${tag}</div><div class="card-sub">${item.desc}</div>`;
    btn.onclick = () => {
      sound.init();
      const res = buyOrEquip(save, activeShopCat, item);
      if (res.status === 'poor') { sound.playHit(); showBanner('¡Necesitas más monedas!'); return; }
      if (res.status === 'bought') sound.playCoin(); else sound.playBeep(true);
      buildMenuUI();
      updateGaragePreview();
    };
    shopList.appendChild(btn);
  });

  // Mapas
  const trackList = document.getElementById('track-list');
  trackList.innerHTML = '';
  TRACK_CATALOG.forEach((tr, idx) => {
    const btn = document.createElement('button');
    btn.className = `select-card ${idx === selectedTrackIdx ? 'selected' : ''}`;
    btn.innerHTML = `<div class="card-title"><span>${tr.name}</span><span>${tr.lengthLabel}</span></div><div class="card-sub">${tr.desc}</div>`;
    btn.onclick = () => { sound.init(); sound.playBeep(false); selectedTrackIdx = idx; buildMenuUI(); };
    trackList.appendChild(btn);
  });

  const tr = TRACK_CATALOG[selectedTrackIdx];
  const rec = save.bestTimes[`${tr.id}_${save.settings.cc}`];
  document.getElementById('record-box').textContent = `Récord ${save.settings.cc} (${tr.name}): ${rec ? formatTime(rec) : '--:--.-'}`;
}

function setupGarageScene() {
  garageGroup.clear();
  const podium = new THREE.Mesh(
    new THREE.CylinderGeometry(2.7, 3.1, 0.5, 28),
    new THREE.MeshStandardMaterial({ color: '#5c4028', roughness: 0.92 })
  );
  podium.position.y = -0.25;
  podium.receiveShadow = true;
  garageGroup.add(podium);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshStandardMaterial({ color: '#395726', roughness: 0.96 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.5;
  garageGroup.add(floor);

  scene.background = new THREE.Color('#1f3121');
  scene.fog = new THREE.Fog('#1f3121', 12, 34);
  sunLight.position.set(8, 14, 10);
  sunLight.target.position.set(0, 1, 0);
  updateGaragePreview();
}

function updateGaragePreview() {
  if (previewPigRig) garageGroup.remove(previewPigRig.root);
  previewPigRig = createPigMesh(PIG_CATALOG[selectedPigIdx], save.equipped);
  previewPigRig.antenna.visible = save.settings.smartSteer;
  garageGroup.add(previewPigRig.root);
}

// === NOTIFICACIONES ===
function showFarmerQuote(quote) {
  const el = document.getElementById('farmer-bubble');
  document.getElementById('farmer-name').textContent = quote.name;
  document.getElementById('farmer-text').textContent = quote.text;
  el.classList.remove('hidden');
  clearTimeout(farmerBubbleTimer);
  farmerBubbleTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

function showBanner(text, ms = 1400) {
  const el = document.getElementById('event-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(eventBannerTimer);
  eventBannerTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

function clearCountdownTimers() {
  countdownTimers.forEach((t) => clearTimeout(t));
  countdownTimers = [];
  document.getElementById('countdown').classList.add('hidden');
}

// === CARGA Y ARRANQUE DE CARRERA ===
function startModeFlow() {
  if (selectedModeId === 'grandprix') {
    cupState = {
      active: true,
      raceIndex: 0,
      trackOrder: [selectedTrackIdx, (selectedTrackIdx + 1) % TRACK_CATALOG.length, (selectedTrackIdx + 2) % TRACK_CATALOG.length],
      standings: {}
    };
    launchRaceWithLoading(cupState.trackOrder[0]);
  } else {
    cupState.active = false;
    launchRaceWithLoading(selectedTrackIdx);
  }
}

function launchRaceWithLoading(trackIdx) {
  const tr = TRACK_CATALOG[trackIdx];
  const modeName = GAME_MODES.find((m) => m.id === selectedModeId)?.name || 'Carrera';
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');

  showMK8Loading(
    {
      title: tr.name.toUpperCase(),
      subtitle: tr.desc,
      badges: [save.settings.cc, modeName.replace(/^[^\w]+/, ''), save.settings.collisions ? 'CHOQUES ON' : 'FANTASMA'],
      trackDef: tr,
      duration: 900
    },
    () => startRace(trackIdx)
  );
}

function startRace(trackIdx) {
  sound.init();
  clearCountdownTimers();
  garageGroup.visible = false;
  clearRaceObjects();

  const trackDef = TRACK_CATALOG[trackIdx];
  scene.background = new THREE.Color(trackDef.fogColor);
  scene.fog = new THREE.FogExp2(trackDef.fogColor, trackDef.isNight ? 0.0012 : 0.0018);
  sunLight.color.set(trackDef.sunColor);

  currentTrack = new FarmTrack(scene, trackDef);
  dustSystem = new DustSystem(scene, 180);

  const isTimeTrial = selectedModeId === 'timetrial';
  const racerCount = isTimeTrial ? 1 : 12;
  document.getElementById('hud-total').textContent = `/${racerCount}`;
  document.getElementById('hud-cc-badge').textContent = save.settings.cc;

  racers = [];
  const startSample = currentTrack.samples[0];
  const baseHeading = Math.atan2(startSample.tangent.x, startSample.tangent.z);

  for (let i = 0; i < racerCount; i++) {
    const isPlayer = i === 0;
    const def = isPlayer ? PIG_CATALOG[selectedPigIdx] : PIG_CATALOG[(selectedPigIdx + i) % PIG_CATALOG.length];
    const custom = isPlayer
      ? save.equipped
      : {
          wings: SHOP_ITEMS.wings[i % SHOP_ITEMS.wings.length].id,
          hats: SHOP_ITEMS.hats[i % SHOP_ITEMS.hats.length].id,
          tattoos: SHOP_ITEMS.tattoos[i % SHOP_ITEMS.tattoos.length].id
        };

    const rig = createPigMesh(def, custom);
    rig.antenna.visible = isPlayer && save.settings.smartSteer;
    scene.add(rig.root);

    const row = Math.floor(i / 3);
    const col = ((i % 3) - 1) * 3.8;
    const spawnPos = startSample.pos
      .clone()
      .addScaledVector(startSample.tangent, -4 - row * 4.4)
      .addScaledVector(startSample.right, col);

    const racer = {
      id: i,
      name: isPlayer ? `${def.name} (TÚ)` : `${def.name} #${i}`,
      isPlayer, def, rig,
      pos: spawnPos, heading: baseHeading,
      speed: 0, vy: 0, steer: 0,
      turbo: 100, boostTimer: 0, shieldTimer: 0, spinTimer: 0, shrinkTimer: 0, invulnTimer: 0,
      respawnTimer: 0, respawnTarget: null, respawnStart: null,
      driftDir: 0, driftTime: 0, slipstreamTime: 0, wrongWayTime: 0, bumpCooldown: 0,
      airborne: false, isGliding: false, trickUsed: false,
      coins: 0,
      items: isTimeTrial ? ['truffle', 'truffle'] : [],
      extraTruffle: isTimeTrial ? 1 : 0,
      itemRouletteTimer: 0,
      onMud: false, lap: 1, trackIndex: currentTrack.sampleCount - 2,
      progress: 0, finished: false, eliminated: false, finishTime: 0,
      aiLaneOffset: (Math.random() - 0.5) * (trackDef.roadWidth * 0.52),
      aiSkill: 0.88 + Math.random() * 0.14,
      aiItemDelay: 2.8
    };

    rig.root.position.copy(racer.pos);
    rig.root.rotation.y = racer.heading;
    racers.push(racer);
    if (isPlayer) playerRacer = racer;
  }

  raceTime = 0;
  document.getElementById('hud-screen').classList.remove('hidden');
  document.getElementById('wrong-way-banner').classList.add('hidden');
  updateItemHUD();
  runCountdown();
}

function runCountdown() {
  clearCountdownTimers();
  mode = 'COUNTDOWN';
  const el = document.getElementById('countdown');
  el.classList.remove('hidden');
  let rocketWindow = false;

  const steps = [
    { delay: 0, text: '3', high: false },
    { delay: 850, text: '2', high: false },
    { delay: 1700, text: '1', high: false, openRocket: true },
    { delay: 2550, text: '¡OINK!', high: true, go: true },
    { delay: 3300, hide: true }
  ];

  steps.forEach((st) => {
    const id = setTimeout(() => {
      if (st.hide) { el.classList.add('hidden'); return; }
      el.textContent = st.text;
      sound.playBeep(st.high);
      if (st.openRocket) rocketWindow = true;
      if (st.go) {
        sound.playOink(1.12);
        mode = 'RACING';
        if (rocketWindow && (keys.up || keys.turbo || touch.turbo)) {
          playerRacer.boostTimer = 1.5;
          playerRacer.speed = playerRacer.def.physics.maxSpeed * CC_CLASSES[save.settings.cc].speedMult;
          showBanner('🚀 ¡SALIDA TURBO!');
        }
      }
    }, st.delay);
    countdownTimers.push(id);
  });
}

function clearRaceObjects() {
  racers.forEach((r) => scene.remove(r.rig.root));
  racers = [];
  if (currentTrack) { currentTrack.dispose(scene); currentTrack = null; }
  if (dustSystem) { dustSystem.particles.forEach((p) => scene.remove(p.mesh)); dustSystem = null; }
}

// === DOBLE RANURA DE OBJETOS ===
function updateItemHUD() {
  const icon1 = document.getElementById('hud-item-1-icon');
  const name1 = document.getElementById('hud-item-1-name');
  const icon2 = document.getElementById('hud-item-2-icon');
  if (!playerRacer) return;

  if (playerRacer.itemRouletteTimer > 0) {
    const rnd = ITEMS_DEF[ITEM_KEYS[Math.floor(performance.now() / 80) % ITEM_KEYS.length]];
    icon1.textContent = rnd.icon;
    name1.textContent = 'RULETA...';
    icon2.textContent = playerRacer.items.length > 1 ? '?' : '·';
  } else {
    const primary = playerRacer.items[0];
    const secondary = playerRacer.items[1];
    if (primary) {
      icon1.textContent = ITEMS_DEF[primary].icon;
      name1.textContent = ITEMS_DEF[primary].name;
    } else {
      icon1.textContent = '—';
      name1.textContent = 'OBJETO';
    }
    icon2.textContent = secondary ? ITEMS_DEF[secondary].icon : '·';
  }
}

function useItem(r) {
  if (!r.items.length || r.itemRouletteTimer > 0 || r.eliminated || r.respawnTimer > 0) return;
  const item = r.items.shift();
  if (r.extraTruffle > 0) { r.items.push('truffle'); r.extraTruffle--; }

  if (item === 'truffle') {
    r.boostTimer = Math.max(r.boostTimer, 2.1);
    r.turbo = 100;
    if (r.isPlayer) { sound.playOink(1.28); showBanner('🍄 ¡TRUFA TURBO!'); }
  } else if (item === 'shield') {
    r.shieldTimer = 5.0;
    r.boostTimer = Math.max(r.boostTimer, 1.0);
    if (r.isPlayer) { sound.playBeep(true); showBanner('🛡️ ¡ESCUDO DE BARRO!'); }
  } else if (item === 'pumpkin') {
    const behind = r.pos.clone().add(new THREE.Vector3(-Math.sin(r.heading) * 2.8, 0, -Math.cos(r.heading) * 2.8));
    currentTrack.dropPumpkinTrap(behind, r.id);
    if (r.isPlayer) { sound.playBeep(false); showBanner('🎃 ¡CALABAZA LANZADA!'); }
  } else if (item === 'acorn') {
    const sorted = [...racers].filter((x) => !x.eliminated).sort((a, b) => b.progress - a.progress);
    const rank = sorted.findIndex((x) => x.id === r.id);
    const target = rank > 0 ? sorted[rank - 1] : null;
    if (target && target.shieldTimer <= 0 && target.invulnTimer <= 0) {
      target.spinTimer = 1.3;
      target.speed *= 0.35;
      if (r.isPlayer) { sound.playHit(); showBanner(`🌰 ¡Impacto a ${target.name}!`); }
      else if (target.isPlayer) { sound.playHit(); showBanner('🌰 ¡TE DIERON CON UNA BELLOTA!'); }
    }
  } else if (item === 'lightning') {
    racers.forEach((other) => {
      if (other.id !== r.id && other.shieldTimer <= 0 && other.invulnTimer <= 0) {
        other.shrinkTimer = 3.5;
        other.speed *= 0.55;
      }
    });
    if (r.isPlayer) { sound.playHit(); showBanner('⚡ ¡RAYO DEL GRANERO!'); }
    else showBanner('⚡ ¡RAYO EN PISTA!');
  }

  if (r.isPlayer) updateItemHUD();
}

// === RESCATE / RESURRECCIÓN TIPO LAKITU ===
function triggerRespawn(r) {
  if (r.respawnTimer > 0) return;
  const safe = currentTrack.findSafeRespawnSample(r.trackIndex);
  r.respawnTimer = 1.35;
  r.respawnStart = r.pos.clone();
  r.respawnTarget = safe.sample.pos.clone();
  r.trackIndex = safe.index;
  r.heading = Math.atan2(safe.sample.tangent.x, safe.sample.tangent.z);
  r.speed = 0;
  r.vy = 0;
  r.airborne = false;
  r.isGliding = false;
  r.driftDir = 0;
  r.driftTime = 0;
  r.coins = Math.max(0, r.coins - 2);
  r.invulnTimer = 2.4;
  r.rig.rescueCloud.visible = true;
  if (r.isPlayer) {
    sound.playRespawn();
    showBanner('☁️ ¡RESCATE AL CIRCUITO!', 1500);
  }
}

// === FÍSICA MEJORADA (MANEJABILIDAD + CILINDRADA + VUELO) ===
function updateRacer(r, dt) {
  if (r.eliminated) return;

  // Animación de resurrección en curso
  if (r.respawnTimer > 0) {
    r.respawnTimer -= dt;
    const p = 1 - Math.max(0, r.respawnTimer / 1.35);
    const arcY = Math.sin(p * Math.PI) * 5.0;
    r.pos.lerpVectors(r.respawnStart, r.respawnTarget, p);
    r.pos.y += arcY;
    r.rig.root.position.copy(r.pos);
    r.rig.root.rotation.y = r.heading;
    animatePigGallop(r.rig, dt, 0, 0, false, false, false);
    if (r.respawnTimer <= 0) {
      r.pos.copy(r.respawnTarget);
      r.rig.rescueCloud.visible = false;
    }
    return;
  }

  const cc = CC_CLASSES[save.settings.cc] || CC_CLASSES['150cc'];
  const proj = currentTrack.projectPoint(r.pos, r.trackIndex);

  // Vuelta completa
  if (r.trackIndex > currentTrack.sampleCount * 0.82 && proj.index < currentTrack.sampleCount * 0.18) {
    r.lap++;
    if (selectedModeId === 'knockout' && r.isPlayer && r.lap <= totalLaps) {
      const alive = racers.filter((x) => !x.eliminated).sort((a, b) => b.progress - a.progress);
      const cut = Math.max(2, Math.floor(alive.length / 3));
      alive.slice(-cut).forEach((loser) => {
        loser.eliminated = true;
        loser.rig.root.visible = false;
        if (loser.isPlayer) { showBanner('💥 ¡ELIMINADO!'); finishRace(); }
      });
      if (!playerRacer.eliminated) showBanner(`💥 ${cut} cerdos eliminados`);
    }
    if (r.lap > totalLaps && !r.finished) {
      r.finished = true;
      r.finishTime = raceTime;
      if (r.isPlayer) finishRace();
    } else if (r.isPlayer) {
      if (r.lap === totalLaps) { sound.playFinalLap(); showBanner('🔥 ¡ÚLTIMA VUELTA!', 1800); }
      else sound.playBeep(true);
    }
  }
  r.trackIndex = proj.index;
  r.progress = (r.lap - 1) * currentTrack.sampleCount + proj.index;

  // Timers
  if (r.boostTimer > 0) r.boostTimer -= dt;
  if (r.shieldTimer > 0) r.shieldTimer -= dt;
  if (r.spinTimer > 0) r.spinTimer -= dt;
  if (r.shrinkTimer > 0) r.shrinkTimer -= dt;
  if (r.invulnTimer > 0) r.invulnTimer -= dt;
  if (r.bumpCooldown > 0) r.bumpCooldown -= dt;
  if (r.itemRouletteTimer > 0) {
    r.itemRouletteTimer -= dt;
    if (r.isPlayer) updateItemHUD();
  }

  // Parpadeo de invulnerabilidad tras rescate
  r.rig.bodyGroup.visible = r.invulnTimer > 0 ? Math.floor(performance.now() / 90) % 2 === 0 : true;
  r.rig.shieldMesh.visible = r.shieldTimer > 0;
  const targetScale = r.def.scale * (r.shrinkTimer > 0 ? 0.62 : 1);
  r.rig.root.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), dt * 6);

  // Entradas de control
  let throttle = 0, steerInput = 0, wantTurbo = false, wantDrift = false, wantBrake = false;
  if (r.isPlayer && !r.finished) {
    const autoGas = save.settings.autoAccel || gyro.enabled || touch.left || touch.right;
    wantBrake = keys.down || touch.brake;
    throttle = keys.up ? 1 : wantBrake ? -0.65 : autoGas ? 1 : 0;

    if (keys.left || touch.left) steerInput += 1;
    if (keys.right || touch.right) steerInput -= 1;
    if (gyro.enabled && Math.abs(gyro.steer) > 0.01) steerInput = -gyro.steer;

    wantTurbo = (keys.turbo || touch.turbo) && r.turbo > 5;
    wantDrift = (keys.drift || touch.drift) && !r.airborne && r.speed > 14;
  } else {
    // IA inteligente: se centra al acercarse a puentes o barrancos
    const lookIdx = (proj.index + 14) % currentTrack.sampleCount;
    const ts = currentTrack.samples[lookIdx];
    const dangerAhead = ts.isGap || ts.isBridge || proj.isBridge;
    const lane = dangerAhead ? r.aiLaneOffset * 0.25 : r.aiLaneOffset;
    const targetPos = ts.pos.clone().addScaledVector(ts.right, lane);
    const toTarget = targetPos.sub(r.pos);
    let diff = Math.atan2(toTarget.x, toTarget.z) - r.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    steerInput = THREE.MathUtils.clamp(diff * 1.9, -1, 1);
    throttle = Math.abs(diff) > 0.72 ? 0.65 : 1.0;

    const gap = playerRacer.progress - r.progress;
    throttle *= r.aiSkill * cc.aiMult * THREE.MathUtils.clamp(1 + gap * 0.002, 0.87, 1.12);

    if (r.items.length && r.itemRouletteTimer <= 0) {
      r.aiItemDelay -= dt;
      if (r.aiItemDelay <= 0) { useItem(r); r.aiItemDelay = 3 + Math.random() * 3.5; }
    }
  }

  // Volante Inteligente (MK8D): ayuda suave en bordes y puentes
  const halfW = currentTrack.def.roadWidth * 0.5;
  if (r.isPlayer && save.settings.smartSteer && !r.airborne && Math.abs(proj.lateral) > halfW * 0.72) {
    const dirToCenter = -Math.sign(proj.lateral);
    const fwd = new THREE.Vector3(Math.sin(r.heading), 0, Math.cos(r.heading));
    const align = fwd.dot(proj.tangent);
    if (align > 0.2) steerInput = THREE.MathUtils.clamp(steerInput + dirToCenter * 0.65, -1, 1);
  }

  // Derrape estilo MK8 con bloqueo de dirección + Brake-Drifting en 200cc
  if (wantDrift) {
    if (r.driftDir === 0 && Math.abs(steerInput) > 0.12) {
      r.driftDir = Math.sign(steerInput);
    }
    if (r.driftDir !== 0) {
      r.driftTime += dt;
    }
  } else if (r.driftTime > 0) {
    if (r.driftTime > 2.3) { r.boostTimer = Math.max(r.boostTimer, 1.8); if (r.isPlayer) showBanner('🩷 ¡ULTRA MINI-TURBO!'); }
    else if (r.driftTime > 1.35) { r.boostTimer = Math.max(r.boostTimer, 1.15); if (r.isPlayer) showBanner('🧡 ¡SÚPER MINI-TURBO!'); }
    else if (r.driftTime > 0.6) { r.boostTimer = Math.max(r.boostTimer, 0.65); if (r.isPlayer) showBanner('💙 ¡MINI-TURBO!'); }
    r.driftTime = 0;
    r.driftDir = 0;
  } else {
    r.driftDir = 0;
  }

  // Rebufo (Slipstream)
  let drafting = false;
  if (!r.airborne && r.speed > 20) {
    for (const o of racers) {
      if (o.id === r.id || o.eliminated || o.respawnTimer > 0) continue;
      const toO = new THREE.Vector3().subVectors(o.pos, r.pos);
      const dist = toO.length();
      if (dist > 2.6 && dist < 11.5) {
        const fwd = new THREE.Vector3(Math.sin(r.heading), 0, Math.cos(r.heading));
        if (toO.normalize().dot(fwd) > 0.93) { drafting = true; break; }
      }
    }
  }
  r.slipstreamTime = drafting ? r.slipstreamTime + dt : Math.max(0, r.slipstreamTime - dt * 2);
  if (r.slipstreamTime > 1.6) {
    r.boostTimer = Math.max(r.boostTimer, 1.1);
    r.slipstreamTime = 0;
    if (r.isPlayer) showBanner('💨 ¡REBUFO!');
  }

  // Comprobar superficies y elementos
  const offRoad = !proj.isBridge && !proj.isGap && Math.abs(proj.lateral) > halfW && !r.airborne;
  r.onMud = !r.airborne && currentTrack.mudZones.some((m) => r.pos.distanceToSquared(m.pos) < m.radius * m.radius);

  for (const pad of currentTrack.boostPads) {
    if (!r.airborne && r.pos.distanceToSquared(pad.pos) < pad.radius * pad.radius) {
      r.boostTimer = Math.max(r.boostTimer, 0.9);
      r.turbo = Math.min(100, r.turbo + 35 * dt);
    }
  }

  // Rampas azules de planeo
  if (!r.airborne && r.speed > 10) {
    for (const ramp of currentTrack.ramps) {
      if (r.pos.distanceToSquared(ramp.pos) < ramp.radius * ramp.radius) {
        r.airborne = true;
        r.isGliding = true;
        r.vy = 14.2 + r.speed * 0.14;
        r.trickUsed = false;
        r.boostTimer = Math.max(r.boostTimer, 1.2); // Empuje inicial para cruzar bien incluso en 50cc
        if (r.isPlayer) {
          sound.playJump();
          if (keys.turbo || touch.turbo) {
            r.trickUsed = true;
            showBanner('🤸 ¡TRUCO AÉREO!');
          }
        }
        break;
      }
    }
  }

  // Aros dorados aéreos durante el planeo
  if (r.airborne) {
    for (const ring of currentTrack.skyRings) {
      if (r.pos.distanceToSquared(ring.pos) < ring.radius * ring.radius && r.boostTimer < 1.3) {
        r.boostTimer = 1.6;
        r.vy = Math.max(r.vy, 5.2); // Empuje extra de sustentación
        if (r.isPlayer) { sound.playRingBoost(); showBanner('✨ ¡ARO AÉREO +TURBO!'); }
      }
    }
  }

  // Cajas de objetos (? y Dobles ??)
  if (r.items.length < 2 && r.itemRouletteTimer <= 0 && selectedModeId !== 'timetrial') {
    for (const b of currentTrack.itemBoxes) {
      if (b.active && r.pos.distanceToSquared(b.pos) < 6.2) {
        b.active = false;
        b.mesh.visible = false;
        b.respawnTimer = 5.5;
        const count = b.isDouble ? Math.min(2 - r.items.length, 2) : 1;
        for (let k = 0; k < count; k++) {
          r.items.push(ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)]);
        }
        r.itemRouletteTimer = 0.95;
        if (r.isPlayer) {
          sound.playCoin();
          if (b.isDouble && count === 2) showBanner('🎁 ¡CAJA DOBLE!');
        }
        break;
      }
    }
  }

  // Monedas
  for (const c of currentTrack.coins) {
    if (c.active && r.pos.distanceToSquared(c.pos) < 5.0) {
      c.active = false;
      c.mesh.visible = false;
      c.respawnTimer = 10.0;
      r.coins = Math.min(10, r.coins + 1);
      if (r.isPlayer) sound.playCoin();
    }
  }

  // Calabazas trampa
  for (let i = currentTrack.traps.length - 1; i >= 0; i--) {
    const tr = currentTrack.traps[i];
    if (tr.ownerId === r.id && tr.grace > 0) continue;
    if (r.pos.distanceToSquared(tr.pos) < 4.2) {
      currentTrack.group.remove(tr.mesh);
      currentTrack.traps.splice(i, 1);
      if (r.shieldTimer <= 0 && r.invulnTimer <= 0) {
        r.spinTimer = 1.25;
        r.speed *= 0.35;
        if (r.isPlayer) { sound.playHit(); showBanner('🎃 ¡CALABAZA!'); }
      }
    }
  }

  // Granjeros parlanchines
  if (r.isPlayer) {
    for (const f of currentTrack.farmers) {
      if (f.cooldown <= 0 && r.pos.distanceToSquared(f.pos) < 820) {
        f.cooldown = 20;
        showFarmerQuote(f.quote);
        break;
      }
    }
  }

  // Velocidad escalada por Cilindrada (50cc / 150cc / 200cc)
  const isBoosting = wantTurbo || r.boostTimer > 0;
  if (wantTurbo) r.turbo = Math.max(0, r.turbo - 34 * dt);
  else r.turbo = Math.min(100, r.turbo + (wantDrift ? 18 : 6.5) * dt);

  const phys = r.def.physics;
  const coinBonus = 1 + r.coins * 0.01;
  let maxSpd = phys.maxSpeed * cc.speedMult * coinBonus * (isBoosting ? phys.boostMult : 1);
  if (r.isGliding) maxSpd = Math.max(maxSpd, 32 * cc.speedMult); // Velocidad mínima de sustentación en vuelo
  if (r.shrinkTimer > 0) maxSpd *= 0.66;
  if (offRoad && !isBoosting && r.shieldTimer <= 0) maxSpd *= 0.64;
  if (r.onMud && !isBoosting && r.shieldTimer <= 0) maxSpd *= 0.6 + (phys.grip - 0.85) * 1.4;

  const brakeDrift = r.driftDir !== 0 && wantBrake;
  if (r.spinTimer > 0) {
    r.speed *= 1 - 2.3 * dt;
  } else if (brakeDrift) {
    // Frenado suave en 200cc sin perder el derrape
    r.speed = Math.max(12, r.speed - phys.accel * 0.9 * dt);
  } else if (throttle > 0) {
    r.speed += phys.accel * cc.accelMult * throttle * (isBoosting ? 1.65 : 1) * dt;
  } else if (throttle < 0) {
    r.speed += phys.accel * 1.5 * throttle * dt;
  } else {
    r.speed *= 1 - 1.5 * dt;
  }
  r.speed = THREE.MathUtils.clamp(r.speed, -8, maxSpd);

  // Dirección suave y progresiva (adiós sensibilidad extrema)
  let targetSteer = steerInput;
  if (r.driftDir !== 0) {
    targetSteer = r.driftDir * 0.68 + steerInput * 0.44;
  }
  const steerSmooth = r.isGliding ? 4.2 : 6.2;
  r.steer = THREE.MathUtils.lerp(r.steer, targetSteer, Math.min(1, dt * steerSmooth));

  const speedFactor = 0.48 + Math.min(0.65, Math.abs(r.speed) / 26);
  const baseTurn = r.driftDir !== 0 ? 1.48 : r.isGliding ? 1.0 : 1.24;
  r.heading += r.steer * baseTurn * cc.turnMult * speedFactor * dt * (r.speed >= 0 ? 1 : -1);

  r.pos.x += Math.sin(r.heading) * r.speed * dt;
  r.pos.z += Math.cos(r.heading) * r.speed * dt;

  // Suelo, puentes abiertos, vuelo con alas y caídas con resurrección
  const overEdgeOnBridge = proj.isBridge && Math.abs(proj.lateral) > halfW + 0.7;
  const hasSolidGround = !proj.isGap && !overEdgeOnBridge;

  if (!hasSolidGround && !r.airborne) {
    // Empezar a caer si te sales de un puente o entras a un barranco sin rampa
    r.airborne = true;
    r.vy = -1.5;
  }

  if (r.airborne) {
    // Desplegar alas si venimos de rampa o estamos altos
    if (r.vy < 4.5 && r.isGliding) {
      // Permitir ajustar levemente el planeo en PC (arriba pica un poco, abajo flota más)
      const glideGravity = (r.isPlayer && keys.down) ? -4.2 : -5.6;
      r.vy += glideGravity * dt;
    } else {
      r.vy += -23.0 * dt;
    }
    r.pos.y += r.vy * dt;

    if (hasSolidGround && r.pos.y <= proj.groundY) {
      r.pos.y = proj.groundY;
      r.vy = 0;
      r.airborne = false;
      r.isGliding = false;
      if (r.trickUsed) { r.boostTimer = Math.max(r.boostTimer, 1.15); r.trickUsed = false; }
    } else if (r.pos.y < proj.groundY - 9.5 || r.pos.y < currentTrack.def.waterY + 0.5) {
      triggerRespawn(r);
      return;
    }
  } else {
    r.pos.y = THREE.MathUtils.lerp(r.pos.y, proj.groundY, Math.min(1, dt * 15));
  }

  // Vallas suaves solo en tramos con valla (no en puentes ni barrancos)
  if (!proj.isBridge && !proj.isGap) {
    const maxLat = halfW + 4.8;
    if (Math.abs(proj.lateral) > maxLat) {
      const push = Math.sign(proj.lateral) * (Math.abs(proj.lateral) - maxLat);
      r.pos.addScaledVector(proj.right, -push * 0.6);
      r.speed *= 0.93;
    }
  }

  // Aviso de dirección contraria
  if (r.isPlayer) {
    const fwd = new THREE.Vector3(Math.sin(r.heading), 0, Math.cos(r.heading));
    if (fwd.dot(proj.tangent) < -0.45 && r.speed > 4) r.wrongWayTime += dt;
    else r.wrongWayTime = 0;
    document.getElementById('wrong-way-banner').classList.toggle('hidden', r.wrongWayTime < 0.75);
  }

  // Actualizar malla 3D
  r.rig.root.position.copy(r.pos);
  r.rig.root.rotation.y = r.heading + (r.spinTimer > 0 ? r.spinTimer * 13 : 0);
  animatePigGallop(r.rig, dt, r.speed, r.steer, isBoosting, r.isGliding, false);

  // Partículas
  if (!r.airborne && Math.abs(r.speed) > 9 && Math.random() < 0.42) {
    let pCol = r.onMud ? '#3d2511' : offRoad ? '#537332' : currentTrack.def.isNight ? '#00e5ff' : '#9c7a54';
    if (r.driftTime > 2.3) pCol = '#ff40c8';
    else if (r.driftTime > 1.35) pCol = '#ff8c00';
    else if (r.driftTime > 0.6) pCol = '#00ccff';
    dustSystem.emit(r.pos, pCol, isBoosting ? 2.1 : 1.2);
  }

  if (r.isPlayer) sound.updateGallop(dt, Math.abs(r.speed) / (phys.maxSpeed * cc.speedMult), r.onMud, r.airborne);
}

// === COLISIONES HITBOX ENTRE CERDOS (CON OPCIÓN ON/OFF) ===
function resolvePigCollisions() {
  if (!save.settings.collisions) return;
  for (let i = 0; i < racers.length; i++) {
    for (let j = i + 1; j < racers.length; j++) {
      const a = racers[i], b = racers[j];
      if (a.eliminated || b.eliminated || a.respawnTimer > 0 || b.respawnTimer > 0) continue;
      if (Math.abs(a.pos.y - b.pos.y) > 2.1) continue;

      const radA = a.def.scale * 1.05;
      const radB = b.def.scale * 1.05;
      const minDist = radA + radB;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const dSq = dx * dx + dz * dz;

      if (dSq > 0.001 && dSq < minDist * minDist) {
        const d = Math.sqrt(dSq);
        const ov = minDist - d;
        const nx = dx / d, nz = dz / d;
        const wA = b.def.physics.weight / (a.def.physics.weight + b.def.physics.weight);
        const wB = 1 - wA;
        const pushForce = 1.15;

        a.pos.x -= nx * ov * wA * pushForce;
        a.pos.z -= nz * ov * wA * pushForce;
        b.pos.x += nx * ov * wB * pushForce;
        b.pos.z += nz * ov * wB * pushForce;

        // Empuje extra si uno lleva Escudo o Turbo
        if (a.shieldTimer > 0 && b.shieldTimer <= 0) b.speed *= 0.72;
        if (b.shieldTimer > 0 && a.shieldTimer <= 0) a.speed *= 0.72;

        if ((a.isPlayer || b.isPlayer) && a.bumpCooldown <= 0 && b.bumpCooldown <= 0) {
          sound.playOink(0.85);
          dustSystem.emit(a.pos, '#ffffff', 2.0);
          a.bumpCooldown = 0.45;
          b.bumpCooldown = 0.45;
        }
      }
    }
  }
}

function updateHUD() {
  const sorted = [...racers].sort((a, b) => (b.eliminated ? -1 : b.progress) - (a.eliminated ? -1 : a.progress));
  const pos = sorted.findIndex((r) => r.isPlayer) + 1;

  document.getElementById('hud-pos').textContent = pos;
  document.getElementById('hud-lap').textContent = `${Math.min(playerRacer.lap, totalLaps)}/${totalLaps}`;
  document.getElementById('hud-speed').textContent = Math.round(Math.abs(playerRacer.speed) * 1.65);
  document.getElementById('hud-turbo-fill').style.width = `${playerRacer.turbo}%`;
  document.getElementById('hud-coins').textContent = playerRacer.coins;
  document.getElementById('hud-time').textContent = formatTime(raceTime);
  document.getElementById('hud-state-label').textContent = playerRacer.isGliding
    ? '🪽 PLANEANDO'
    : playerRacer.driftDir !== 0
      ? '🔥 DERRAPANDO'
      : 'OINK TURBO';

  drawMinimap();
}

function drawMinimap() {
  const mm = document.getElementById('minimap-canvas');
  const ctx = mm.getContext('2d');
  ctx.clearRect(0, 0, mm.width, mm.height);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const s of currentTrack.samples) {
    if (s.pos.x < minX) minX = s.pos.x; if (s.pos.x > maxX) maxX = s.pos.x;
    if (s.pos.z < minZ) minZ = s.pos.z; if (s.pos.z > maxZ) maxZ = s.pos.z;
  }
  const pad = 10;
  const scale = Math.min((mm.width - pad * 2) / (maxX - minX), (mm.height - pad * 2) / (maxZ - minZ));
  const mx = (x) => pad + (x - minX) * scale;
  const mz = (z) => pad + (z - minZ) * scale;

  ctx.strokeStyle = 'rgba(255,255,255,0.44)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  currentTrack.samples.forEach((s, i) => (i === 0 ? ctx.moveTo(mx(s.pos.x), mz(s.pos.z)) : ctx.lineTo(mx(s.pos.x), mz(s.pos.z))));
  ctx.closePath();
  ctx.stroke();

  racers.forEach((r) => {
    if (r.eliminated) return;
    ctx.fillStyle = r.isPlayer ? '#ff7b1c' : '#8df0b4';
    ctx.beginPath();
    ctx.arc(mx(r.pos.x), mz(r.pos.z), r.isPlayer ? 4.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function finishRace() {
  mode = 'FINISHED';
  document.getElementById('wrong-way-banner').classList.add('hidden');
  const sorted = [...racers].sort((a, b) => (a.eliminated ? -9999 : a.progress) < (b.eliminated ? -9999 : b.progress) ? 1 : -1);
  const rank = sorted.findIndex((r) => r.isPlayer) + 1;

  const ccMult = CC_CLASSES[save.settings.cc].coinBonus;
  const earned = Math.round((Math.max(10, (13 - rank) * 6) + playerRacer.coins * 3) * ccMult);
  addCoins(save, earned);

  const rewardEl = document.getElementById('modal-reward');
  rewardEl.textContent = `+${earned} 🪙 Monedas ganadas (${save.settings.cc}) • Total: ${save.coins} 🪙`;
  rewardEl.classList.remove('hidden');

  if (selectedModeId === 'timetrial') {
    const isRec = recordBestTime(save, currentTrack.def.id, save.settings.cc, raceTime);
    document.getElementById('modal-title').textContent = isRec ? '⏱️ ¡NUEVO RÉCORD!' : '⏱️ CONTRARRELOJ TERMINADA';
    document.getElementById('modal-subtitle').textContent = `${save.settings.cc} • Tiempo: ${formatTime(raceTime)}`;
    document.getElementById('btn-next-cup').classList.add('hidden');
  } else if (cupState.active) {
    sorted.forEach((r, idx) => {
      cupState.standings[r.name] = (cupState.standings[r.name] || 0) + (CUP_POINTS[idx] || 0);
    });
    const isLast = cupState.raceIndex >= cupState.trackOrder.length - 1;
    document.getElementById('modal-title').textContent = isLast ? '🏆 FIN DE LA COPA GRANJA' : `🏁 CARRERA ${cupState.raceIndex + 1}/3`;
    document.getElementById('modal-subtitle').textContent = `Has quedado ${rank}º • +${CUP_POINTS[rank - 1] || 0} pts`;
    document.getElementById('btn-next-cup').classList.toggle('hidden', isLast);
  } else {
    document.getElementById('modal-title').textContent = rank === 1 ? '🏆 ¡VICTORIA EN LA GRANJA!' : '🏁 CARRERA TERMINADA';
    document.getElementById('modal-subtitle').textContent = `Posición: ${rank}º/${racers.length} • Tiempo: ${formatTime(raceTime)}`;
    document.getElementById('btn-next-cup').classList.add('hidden');
  }

  document.getElementById('btn-resume').classList.add('hidden');
  const list = document.getElementById('modal-results');
  if (cupState.active) {
    const cupSorted = Object.entries(cupState.standings).sort((a, b) => b[1] - a[1]);
    list.innerHTML = cupSorted
      .map(([name, pts], i) => `<div class="result-row ${name.includes('(TÚ)') ? 'player' : ''}"><span>${i + 1}º ${name}</span><span>${pts} pts</span></div>`)
      .join('');
  } else {
    list.innerHTML = sorted
      .map((r, i) => `<div class="result-row ${r.isPlayer ? 'player' : ''}"><span>${i + 1}º ${r.name}</span><span>${r.eliminated ? 'Eliminado' : `🪙 ${r.coins}`}</span></div>`)
      .join('');
  }
  document.getElementById('modal-overlay').classList.remove('hidden');
}

// === BUCLE PRINCIPAL ===
const clock = new THREE.Clock();
let camPos = new THREE.Vector3();
let camLook = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (mode === 'LOADING' || mode === 'SPLASH' || mode === 'MENU') {
    if (previewPigRig) {
      previewPigRig.root.rotation.y = elapsed * 0.55;
      animatePigGallop(previewPigRig, dt, 12, 0, false, false, previewWings);
    }
    camera.position.set(0, 2.25, 4.9);
    camera.lookAt(0, 0.95, 0);
  } else if (mode === 'COUNTDOWN' || mode === 'RACING' || mode === 'FINISHED') {
    currentTrack.updateAnimatedProps(dt, elapsed);
    if (mode === 'RACING') {
      raceTime += dt;
      racers.forEach((r) => updateRacer(r, dt));
      resolvePigCollisions();
      dustSystem.update(dt);
      updateHUD();
    }

    // Cámara tercera persona con soporte de Retrovisor (C o botón 🪞)
    const lookBack = keys.rearView || touch.rearView;
    const sign = lookBack ? -1 : 1;
    const backDist = playerRacer.isGliding ? 9.5 : playerRacer.boostTimer > 0 ? 8.6 : 7.6;

    const idealCam = new THREE.Vector3(
      playerRacer.pos.x - Math.sin(playerRacer.heading) * backDist * sign,
      playerRacer.pos.y + (playerRacer.isGliding ? 4.3 : 3.5),
      playerRacer.pos.z - Math.cos(playerRacer.heading) * backDist * sign
    );
    const idealLook = new THREE.Vector3(
      playerRacer.pos.x + Math.sin(playerRacer.heading) * 6.5 * sign,
      playerRacer.pos.y + 1.35,
      playerRacer.pos.z + Math.cos(playerRacer.heading) * 6.5 * sign
    );

    camPos.lerp(idealCam, lookBack ? 1 : Math.min(1, dt * 7.5));
    camLook.lerp(idealLook, lookBack ? 1 : Math.min(1, dt * 9.5));
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    const targetFov = playerRacer.boostTimer > 0 || keys.turbo || touch.turbo ? 72 : 60;
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt * 6);
    camera.updateProjectionMatrix();

    const sp = currentTrack.def.sunPos;
    sunLight.position.set(playerRacer.pos.x + sp[0] * 0.4, playerRacer.pos.y + sp[1] * 0.6, playerRacer.pos.z + sp[2] * 0.4);
    sunLight.target.position.copy(playerRacer.pos);
  }

  renderer.render(scene, camera);
}

// === EVENTOS ===
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
  if (e.code === 'KeyC') keys.rearView = true;
  if (e.code === 'Space') {
    keys.turbo = true;
    if (mode === 'RACING' && playerRacer && playerRacer.turbo > 15) sound.playOink(1.2);
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.drift = true;
  if (e.code === 'KeyE' || e.code === 'Enter') {
    if (mode === 'RACING' && playerRacer) useItem(playerRacer);
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
  if (e.code === 'KeyC') keys.rearView = false;
  if (e.code === 'Space') keys.turbo = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.drift = false;
});

function bindTouch(id, prop, onDown = null) {
  const el = document.getElementById(id);
  const start = (e) => { e.preventDefault(); if (prop) touch[prop] = true; if (onDown) onDown(); };
  const end = (e) => { e.preventDefault(); if (prop) touch[prop] = false; };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointerleave', end);
  el.addEventListener('pointercancel', end);
}

bindTouch('touch-left-btn', 'left');
bindTouch('touch-right-btn', 'right');
bindTouch('touch-brake-btn', 'brake');
bindTouch('touch-drift-btn', 'drift');
bindTouch('btn-rearview', 'rearView');
bindTouch('touch-turbo-btn', 'turbo', () => { if (mode === 'RACING' && playerRacer && playerRacer.turbo > 15) sound.playOink(1.2); });
bindTouch('touch-item-btn', null, () => { if (mode === 'RACING' && playerRacer) useItem(playerRacer); });
document.getElementById('hud-item-1').onclick = () => { if (mode === 'RACING' && playerRacer) useItem(playerRacer); };

// Selectores de Cilindrada y Ajustes
document.querySelectorAll('.cc-btn').forEach((btn) => {
  btn.onclick = () => {
    sound.init(); sound.playBeep(true);
    save.settings.cc = btn.dataset.cc;
    saveGame(save);
    buildMenuUI();
  };
});

document.getElementById('btn-collision-toggle').onclick = () => {
  sound.init(); sound.playBeep(false);
  save.settings.collisions = !save.settings.collisions;
  saveGame(save);
  buildMenuUI();
};

document.getElementById('btn-smart-toggle').onclick = () => {
  sound.init(); sound.playBeep(false);
  save.settings.smartSteer = !save.settings.smartSteer;
  saveGame(save);
  buildMenuUI();
  updateGaragePreview();
};

document.getElementById('btn-autoaccel-toggle').onclick = () => {
  sound.init(); sound.playBeep(false);
  save.settings.autoAccel = !save.settings.autoAccel;
  saveGame(save);
  buildMenuUI();
};

// Navegación
document.getElementById('btn-enter-game').onclick = () => {
  sound.init(); sound.playOink(1.05);
  document.getElementById('splash-screen').classList.add('hidden');
  document.getElementById('menu-screen').classList.remove('hidden');
  mode = 'MENU';
  buildMenuUI();
};

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    previewWings = tab === 'shop' && activeShopCat === 'wings';
  };
});

document.querySelectorAll('.subtab-btn').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.subtab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeShopCat = btn.dataset.cat;
    previewWings = activeShopCat === 'wings';
    buildMenuUI();
  };
});

document.getElementById('btn-start-race').onclick = startModeFlow;
document.getElementById('btn-gyro-toggle').onclick = toggleGyro;
document.getElementById('btn-calibrate').onclick = () => { gyro.zeroOffset = gyro.rawTilt; sound.playBeep(true); };
document.getElementById('btn-sound-toggle').onclick = (e) => { sound.init(); e.target.textContent = sound.toggle() ? '🔊' : '🔇'; };

document.getElementById('btn-pause').onclick = () => {
  if (mode !== 'RACING') return;
  mode = 'PAUSED';
  document.getElementById('modal-title').textContent = 'PAUSA';
  document.getElementById('modal-subtitle').textContent = `${currentTrack.def.name} • ${save.settings.cc}`;
  document.getElementById('modal-reward').classList.add('hidden');
  document.getElementById('modal-results').innerHTML = '';
  document.getElementById('btn-next-cup').classList.add('hidden');
  document.getElementById('btn-resume').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
};

document.getElementById('btn-resume').onclick = () => { mode = 'RACING'; document.getElementById('modal-overlay').classList.add('hidden'); };
document.getElementById('btn-restart').onclick = () => launchRaceWithLoading(cupState.active ? cupState.trackOrder[cupState.raceIndex] : selectedTrackIdx);
document.getElementById('btn-next-cup').onclick = () => {
  cupState.raceIndex++;
  launchRaceWithLoading(cupState.trackOrder[cupState.raceIndex]);
};

document.getElementById('btn-back-menu').onclick = () => {
  clearCountdownTimers();
  clearRaceObjects();
  mode = 'MENU';
  garageGroup.visible = true;
  setupGarageScene();
  buildMenuUI();
  document.getElementById('hud-screen').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('menu-screen').classList.remove('hidden');
};

let rotateDismissed = false;
function checkOrientation() {
  const isMobPort = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
  document.getElementById('rotate-overlay').classList.toggle('hidden', !isMobPort || rotateDismissed);
}
document.getElementById('dismiss-rotate').onclick = () => { rotateDismissed = true; checkOrientation(); };
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  checkOrientation();
});

// === ARRANQUE INICIAL ===
checkOrientation();
setupGarageScene();
buildMenuUI();
animate();

showMK8Loading(
  {
    title: 'PIGRALLY 8 DELUXE',
    subtitle: 'Preparando circuitos de granja, alas planeadoras y 12 corredores...',
    badges: ['EDICIÓN 8 DELUXE', '50cc / 150cc / 200cc', '3D'],
    trackDef: TRACK_CATALOG[0],
    duration: 1200
  },
  () => {
    document.getElementById('splash-screen').classList.remove('hidden');
    mode = 'SPLASH';
  }
);