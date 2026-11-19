const SAVE_KEY = 'pigrally_8_deluxe_save_v2';

export const CC_CLASSES = {
  '50cc': { label: '50cc', speedMult: 0.64, accelMult: 0.82, turnMult: 0.88, aiMult: 0.86, coinBonus: 1.0 },
  '150cc': { label: '150cc', speedMult: 0.86, accelMult: 0.96, turnMult: 1.0, aiMult: 0.97, coinBonus: 1.3 },
  '200cc': { label: '200cc', speedMult: 1.10, accelMult: 1.15, turnMult: 1.12, aiMult: 1.04, coinBonus: 1.7 }
};

export const SHOP_ITEMS = {
  wings: [
    { id: 'wing_hay', name: 'Alas de Paja', desc: 'Planeador clásico del granero', price: 0, color: '#d8b454', accent: '#7a4d24' },
    { id: 'wing_barn', name: 'Alas de Granero', desc: 'Madera roja aerodinámica', price: 60, color: '#b82d25', accent: '#f2eadc' },
    { id: 'wing_leaf', name: 'Alas de Roble', desc: 'Planeo suave sobre barrancos', price: 110, color: '#3ea353', accent: '#a8e67a' },
    { id: 'wing_phoenix', name: 'Alas de Fuego', desc: 'Plumas flamígeras de carrera', price: 180, color: '#ff5500', accent: '#ffd000' },
    { id: 'wing_gold', name: 'Alas Doradas 8D', desc: 'Planeador de campeón absoluto', price: 300, color: '#f5c431', accent: '#ffffff' }
  ],
  hats: [
    { id: 'hat_none', name: 'Sin Gorro', desc: 'Orejas al viento', price: 0 },
    { id: 'hat_straw', name: 'Sombrero de Paja', desc: 'Clásico del campo', price: 50 },
    { id: 'hat_cap', name: 'Gorra Racing', desc: 'Estilo piloto profesional', price: 85 },
    { id: 'hat_viking', name: 'Casco Vikingo', desc: 'Cuernos listos para chocar', price: 140 },
    { id: 'hat_crown', name: 'Corona de Granja', desc: 'Rey indiscutible del barro', price: 250 }
  ],
  tattoos: [
    { id: 'tat_none', name: 'Piel Natural', desc: 'Sin pintura extra', price: 0 },
    { id: 'tat_stripes', name: 'Franjas Rally', desc: 'Doble franja deportiva', price: 45 },
    { id: 'tat_flames', name: 'Llamas Turbo', desc: 'Fuego lateral en el lomo', price: 95 },
    { id: 'tat_bolts', name: 'Rayos Eléctricos', desc: 'Energía pura en pista', price: 130 },
    { id: 'tat_mudking', name: 'Tribal Barro', desc: 'Marcas de guerra de la dehesa', price: 165 }
  ]
};

const DEFAULT_SAVE = {
  coins: 120,
  owned: ['wing_hay', 'hat_none', 'tat_none'],
  equipped: { wings: 'wing_hay', hats: 'hat_none', tattoos: 'tat_none' },
  settings: { cc: '150cc', collisions: true, smartSteer: false, autoAccel: false },
  bestTimes: {}
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const p = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_SAVE),
      ...p,
      equipped: { ...DEFAULT_SAVE.equipped, ...(p.equipped || {}) },
      settings: { ...DEFAULT_SAVE.settings, ...(p.settings || {}) },
      bestTimes: { ...(p.bestTimes || {}) }
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function saveGame(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
}

export function addCoins(save, amount) {
  save.coins = Math.max(0, (save.coins || 0) + Math.round(amount));
  saveGame(save);
}

export function buyOrEquip(save, category, item) {
  if (save.owned.includes(item.id)) {
    save.equipped[category] = item.id;
    saveGame(save);
    return { status: 'equipped' };
  }
  if (save.coins >= item.price) {
    save.coins -= item.price;
    save.owned.push(item.id);
    save.equipped[category] = item.id;
    saveGame(save);
    return { status: 'bought' };
  }
  return { status: 'poor' };
}

export function recordBestTime(save, trackId, cc, seconds) {
  const key = `${trackId}_${cc}`;
  const prev = save.bestTimes[key];
  if (!prev || seconds < prev) {
    save.bestTimes[key] = seconds;
    saveGame(save);
    return true;
  }
  return false;
}
