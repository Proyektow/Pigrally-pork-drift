const STORAGE_KEY = 'pigrally_tour_deluxe_v2';

export const PIG_ROSTER = [
  {
    id: 'scout',
    name: 'Porky Scout',
    emoji: '🐷',
    desc: 'Ágil en curvas y gran aceleración inicial',
    skin: '#ff9ebb',
    snout: '#ff6b93',
    ear: '#ff7fa0',
    stats: {
      speed: 80,
      accel: 92,
      weight: 66,
      drift: 94
    }
  },
  {
    id: 'truffle',
    name: 'Gran Trufón',
    emoji: '🐽',
    desc: 'Peso pesado que arrolla en los choques cuerpo a cuerpo',
    skin: '#7a5c49',
    snout: '#b57c68',
    ear: '#634838',
    stats: {
      speed: 88,
      accel: 68,
      weight: 98,
      drift: 74
    }
  },
  {
    id: 'thunder',
    name: 'Jabato Rayo',
    emoji: '🐗',
    desc: 'Velocidad punta salvaje para dominar el 150cc',
    skin: '#e09b3d',
    snout: '#f27950',
    ear: '#b87624',
    stats: {
      speed: 98,
      accel: 76,
      weight: 84,
      drift: 82
    }
  }
];

export const HATS_CATALOG = [
  'Sin Gorro',
  'Gorra Hélice',
  'Casco Vikingo',
  'Corona Real',
  'Gafas Aviador'
];

const defaultSave = {
  selectedPigIdx: 0,
  hat: 'Gorra Hélice',
  cc: 100,
  coins: 100,
  wins: 0,
  races: 0,
  xp: 25,
  level: 1,
  muted: false
};

let stateData = { ...defaultSave };

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    stateData = { ...defaultSave, ...parsed };
  }
} catch (err) {
  console.warn('No se pudo leer localStorage:', err);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateData));
  } catch (err) {}
}

export const gameState = {
  get pigIndex() {
    return stateData.selectedPigIdx;
  },
  set pigIndex(idx) {
    stateData.selectedPigIdx = (idx + PIG_ROSTER.length) % PIG_ROSTER.length;
    persist();
  },
  get pig() {
    return PIG_ROSTER[stateData.selectedPigIdx] || PIG_ROSTER[0];
  },
  get hat() {
    return stateData.hat;
  },
  set hat(val) {
    if (HATS_CATALOG.includes(val)) {
      stateData.hat = val;
      persist();
    }
  },
  get cc() {
    return stateData.cc;
  },
  set cc(val) {
    stateData.cc = Number(val) || 100;
    persist();
  },
  get coins() {
    return stateData.coins;
  },
  get wins() {
    return stateData.wins;
  },
  get level() {
    return stateData.level;
  },
  get xp() {
    return stateData.xp;
  },
  get muted() {
    return stateData.muted;
  },
  toggleMute() {
    stateData.muted = !stateData.muted;
    persist();
    return stateData.muted;
  },
  addCoins(amount) {
    stateData.coins = Math.max(0, stateData.coins + amount);
    persist();
  },
  recordRaceResult(position, bonusCoins) {
    stateData.races += 1;
    if (position === 1) stateData.wins += 1;
    stateData.coins += bonusCoins;
    const xpGain = position === 1 ? 55 : position === 2 ? 35 : 20;
    stateData.xp += xpGain;
    while (stateData.xp >= 100) {
      stateData.xp -= 100;
      stateData.level += 1;
    }
    persist();
  }
};
