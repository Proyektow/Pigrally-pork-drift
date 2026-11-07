// Manejador central del estado del jugador, guardado en LocalStorage y configuración
const SAVE_KEY = 'pig_rally_deluxe_save_v1';

export const PIGS = [
  {
    id: 'scout',
    name: 'Porky Scout',
    desc: 'Equilibrado y fiel en curvas cerradas',
    skin: '#ff9cb3',
    speed: 82,
    accel: 88,
    weight: 65,
    drift: 90
  },
  {
    id: 'truffle',
    name: 'Don Trufón',
    desc: 'Un tanque de barro que aparta a los rivales',
    skin: '#695143',
    speed: 74,
    accel: 60,
    weight: 98,
    drift: 72
  },
  {
    id: 'boar',
    name: 'Furia Jabata',
    desc: 'Velocidad punta implacable en rectas',
    skin: '#d18b32',
    speed: 98,
    accel: 70,
    weight: 82,
    drift: 58
  }
];

export const HATS = ['Sin gorro', 'Hélice Pro', 'Casco Vikingo', 'Aviador Retro', 'Corona Real'];

const defaultData = {
  selectedPig: 0,
  selectedHat: 'Sin gorro',
  cc: 100,
  corn: 0,
  level: 1,
  xp: 30,
  wins: 0,
  races: 0,
  sound: true
};

let data = { ...defaultData };
try {
  const loaded = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (loaded && typeof loaded === 'object') {
    data = Object.assign(data, loaded);
  }
} catch (e) {
  console.warn('Error al leer save data');
}

export function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {}
}

export const gameState = {
  get currentPig() { return PIGS[data.selectedPig]; },
  get pigIndex() { return data.selectedPig; },
  set pigIndex(val) {
    data.selectedPig = (val + PIGS.length) % PIGS.length;
    saveState();
  },
  get hat() { return data.selectedHat; },
  set hat(h) { data.selectedHat = h; saveState(); },
  get cc() { return data.cc; },
  set cc(v) { data.cc = v; saveState(); },
  get corn() { return data.corn; },
  addCorn(n) { data.corn += n; saveState(); },
  get level() { return data.level; },
  get xp() { return data.xp; },
  addWin(reward) {
    data.wins++;
    data.races++;
    data.corn += reward;
    data.xp += 40;
    if (data.xp >= 100) {
      data.level++;
      data.xp -= 100;
    }
    saveState();
  },
  get sound() { return data.sound; },
  toggleSound() { data.sound = !data.sound; saveState(); return data.sound; }
};
