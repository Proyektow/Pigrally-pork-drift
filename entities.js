import * as THREE from 'three';
import { createPigSkinTexture } from './textures.js';
import { SHOP_ITEMS } from './store.js';

export const PIG_CATALOG = [
  {
    id: 'landrace', name: 'Landrace Sprint', subtitle: 'Equilibrado • Granja',
    desc: 'Ágil, ligero y muy fácil de controlar en curvas.',
    skin: '#e8a89a', snout: '#d9887a', spots: null, tusks: false, scale: 1.0,
    stats: { speed: 82, accel: 86, grip: 88, boost: 84 },
    physics: { maxSpeed: 39, accel: 20, grip: 0.93, boostMult: 1.28, weight: 1.0 }
  },
  {
    id: 'iberico', name: 'Ibérico Puro', subtitle: 'Experto Barro • Dehesa',
    desc: 'Pezuña negra con tracción sobresaliente en charcos.',
    skin: '#3d3735', snout: '#524946', spots: '#262220', tusks: false, scale: 1.02,
    stats: { speed: 80, accel: 88, grip: 96, boost: 84 },
    physics: { maxSpeed: 38.5, accel: 21.5, grip: 0.98, boostMult: 1.30, weight: 1.12 }
  },
  {
    id: 'jabali', name: 'Jabalí del Monte', subtitle: 'Velocidad Punta • Salvaje',
    desc: 'Colmillos afilados y gran empuje en rectas largas.',
    skin: '#5c4636', snout: '#3b2c22', spots: '#3d2d22', tusks: true, scale: 1.08,
    stats: { speed: 96, accel: 76, grip: 78, boost: 94 },
    physics: { maxSpeed: 42.5, accel: 18.5, grip: 0.88, boostMult: 1.34, weight: 1.28 }
  },
  {
    id: 'duroc', name: 'Duroc Dorado', subtitle: 'Aceleración • Pesado',
    desc: 'Fuerza muscular que desplaza rivales en los choques.',
    skin: '#b85d38', snout: '#8f4428', spots: '#823b1e', tusks: false, scale: 1.10,
    stats: { speed: 88, accel: 92, grip: 82, boost: 86 },
    physics: { maxSpeed: 40.5, accel: 22.5, grip: 0.90, boostMult: 1.30, weight: 1.38 }
  },
  {
    id: 'minipig', name: 'Mini Pig Nitro', subtitle: 'Súper Ágil • Planeador',
    desc: 'El más preciso en 200cc y el que más planea en el aire.',
    skin: '#f5c2be', snout: '#e89590', spots: '#544341', tusks: false, scale: 0.86,
    stats: { speed: 78, accel: 98, grip: 96, boost: 96 },
    physics: { maxSpeed: 37.5, accel: 24.5, grip: 0.98, boostMult: 1.36, weight: 0.82 }
  },
  {
    id: 'mangalica', name: 'Mangalica Lanudo', subtitle: 'Estabilidad • Todoterreno',
    desc: 'Estable en saltos, puentes y zonas de barro.',
    skin: '#d9c59a', snout: '#b59a72', spots: '#b89f6d', tusks: false, scale: 1.05,
    stats: { speed: 85, accel: 84, grip: 92, boost: 88 },
    physics: { maxSpeed: 39.8, accel: 20.5, grip: 0.95, boostMult: 1.31, weight: 1.2 }
  },
  {
    id: 'vietnam', name: 'Cerdo Vietnamita', subtitle: 'Maestro del Derrape',
    desc: 'Centro de gravedad bajo para encadenar mini-turbos.',
    skin: '#2e2d33', snout: '#47434a', spots: '#d8d8de', tusks: false, scale: 0.95,
    stats: { speed: 83, accel: 90, grip: 95, boost: 91 },
    physics: { maxSpeed: 39.2, accel: 22, grip: 0.96, boostMult: 1.33, weight: 1.0 }
  },
  {
    id: 'verraco', name: 'Verraco Blindado', subtitle: 'Tanque • Colmillos XL',
    desc: 'Máximo peso en choques hitbox. Nadie le mueve.',
    skin: '#4a3d38', snout: '#2b2421', spots: '#261f1d', tusks: true, scale: 1.15,
    stats: { speed: 94, accel: 74, grip: 80, boost: 90 },
    physics: { maxSpeed: 42, accel: 18, grip: 0.89, boostMult: 1.32, weight: 1.58 }
  }
];

const GEO = {
  torso: new THREE.CapsuleGeometry(0.62, 1.15, 10, 16),
  rump: new THREE.SphereGeometry(0.60, 14, 12),
  head: new THREE.SphereGeometry(0.46, 14, 12),
  snout: new THREE.CylinderGeometry(0.21, 0.25, 0.32, 14),
  nostril: new THREE.SphereGeometry(0.042, 8, 8),
  eye: new THREE.SphereGeometry(0.075, 10, 10),
  pupil: new THREE.SphereGeometry(0.042, 8, 8),
  ear: new THREE.ConeGeometry(0.18, 0.38, 8),
  tusk: new THREE.ConeGeometry(0.04, 0.24, 8),
  tail: new THREE.TorusGeometry(0.11, 0.032, 6, 14, Math.PI * 1.55),
  upperLeg: new THREE.CapsuleGeometry(0.13, 0.24, 6, 8),
  lowerLeg: new THREE.CylinderGeometry(0.095, 0.075, 0.26, 8),
  hoof: new THREE.CylinderGeometry(0.078, 0.092, 0.11, 8)
};

const SHARED_MAT = {
  hoof: new THREE.MeshStandardMaterial({ color: '#1f1b18', roughness: 0.55 }),
  eyeWhite: new THREE.MeshStandardMaterial({ color: '#f4f0e8', roughness: 0.2 }),
  pupil: new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.1 }),
  tusk: new THREE.MeshStandardMaterial({ color: '#ece3ce', roughness: 0.3 }),
  cloud: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 })
};

function buildHatMesh(hatId) {
  const g = new THREE.Group();
  if (hatId === 'hat_straw') {
    const mat = new THREE.MeshStandardMaterial({ color: '#dec06b', roughness: 0.9 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.06, 16), mat);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.26, 16), mat);
    top.position.y = 0.15;
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.07, 16), new THREE.MeshStandardMaterial({ color: '#c42b23' }));
    ribbon.position.y = 0.06;
    g.add(brim, top, ribbon);
  } else if (hatId === 'hat_cap') {
    const mat = new THREE.MeshStandardMaterial({ color: '#ff5500', roughness: 0.5 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.34), new THREE.MeshStandardMaterial({ color: '#222' }));
    visor.position.set(0, 0.03, 0.28);
    g.add(dome, visor);
  } else if (hatId === 'hat_viking') {
    const metal = new THREE.MeshStandardMaterial({ color: '#7a828a', metalness: 0.65, roughness: 0.35 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), metal);
    g.add(dome);
    [-1, 1].forEach((s) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 8), SHARED_MAT.tusk);
      horn.position.set(s * 0.36, 0.18, 0);
      horn.rotation.z = s * -0.9;
      g.add(horn);
    });
  } else if (hatId === 'hat_crown') {
    const gold = new THREE.MeshStandardMaterial({ color: '#f7c52a', metalness: 0.7, roughness: 0.22 });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.22, 8), gold);
    ring.position.y = 0.1;
    g.add(ring);
  }
  return g;
}

function buildGliderWings(wingId) {
  const def = SHOP_ITEMS.wings.find((w) => w.id === wingId) || SHOP_ITEMS.wings[0];
  const group = new THREE.Group();
  const mainMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.45, side: THREE.DoubleSide });
  const accentMat = new THREE.MeshStandardMaterial({ color: def.accent, roughness: 0.4 });

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.0, 8), accentMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.48, 0);
  group.add(bar);

  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.07, 1.15), mainMat);
    wing.position.set(side * 0.9, 0.5, -0.1);
    wing.rotation.z = side * 0.12;
    wing.rotation.y = side * -0.18;
    wing.castShadow = true;
    group.add(wing);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.085, 0.22), accentMat);
    stripe.position.set(side * 0.9, 0.51, 0.24);
    stripe.rotation.z = side * 0.12;
    stripe.rotation.y = side * -0.18;
    group.add(stripe);
  });

  [-0.25, 0.25].forEach((x) => {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 6), accentMat);
    strut.position.set(x, 0.22, 0);
    group.add(strut);
  });

  group.position.set(0, 1.48, -0.05);
  group.scale.set(0.001, 0.001, 0.001);
  return group;
}

function buildRescueCloud() {
  const g = new THREE.Group();
  const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), SHARED_MAT.cloud);
  const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), SHARED_MAT.cloud);
  c2.position.set(-0.45, -0.08, 0);
  const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), SHARED_MAT.cloud);
  c3.position.set(0.45, -0.08, 0);
  const rope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6),
    new THREE.MeshStandardMaterial({ color: '#ffd026', emissive: '#aa7700', emissiveIntensity: 0.4 })
  );
  rope.position.y = -1.0;
  g.add(c1, c2, c3, rope);
  g.position.set(0, 3.2, 0);
  g.visible = false;
  return g;
}

export function createPigMesh(pigDef, custom = { wings: 'wing_hay', hats: 'hat_none', tattoos: 'tat_none' }) {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const { map, bumpMap } = createPigSkinTexture(pigDef.skin, pigDef.spots, custom.tattoos);
  const skinMat = new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.03, roughness: 0.72 });
  const snoutMat = new THREE.MeshStandardMaterial({ color: pigDef.snout, roughness: 0.45 });

  const torso = new THREE.Mesh(GEO.torso, skinMat);
  torso.rotation.x = Math.PI / 2;
  torso.position.set(0, 0.92, 0);
  torso.castShadow = true;
  bodyGroup.add(torso);

  const rump = new THREE.Mesh(GEO.rump, skinMat);
  rump.scale.set(0.98, 0.94, 1.05);
  rump.position.set(0, 0.94, -0.58);
  rump.castShadow = true;
  bodyGroup.add(rump);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.08, 0.88);
  bodyGroup.add(headGroup);

  const head = new THREE.Mesh(GEO.head, skinMat);
  head.scale.set(0.95, 0.92, 1.08);
  head.castShadow = true;
  headGroup.add(head);

  const snout = new THREE.Mesh(GEO.snout, snoutMat);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.06, 0.45);
  headGroup.add(snout);

  [-0.075, 0.075].forEach((x) => {
    const n = new THREE.Mesh(GEO.nostril, SHARED_MAT.hoof);
    n.scale.set(0.9, 1.2, 0.5);
    n.position.set(x, -0.05, 0.60);
    headGroup.add(n);
  });

  [-0.22, 0.22].forEach((x) => {
    const eye = new THREE.Mesh(GEO.eye, SHARED_MAT.eyeWhite);
    eye.position.set(x, 0.14, 0.34);
    headGroup.add(eye);
    const pupil = new THREE.Mesh(GEO.pupil, SHARED_MAT.pupil);
    pupil.position.set(x * 1.03, 0.14, 0.40);
    headGroup.add(pupil);
  });

  const ears = [];
  [-1, 1].forEach((side) => {
    const earPivot = new THREE.Group();
    earPivot.position.set(side * 0.32, 0.34, 0.06);
    const earMesh = new THREE.Mesh(GEO.ear, skinMat);
    earMesh.scale.set(1, 1, 0.35);
    earMesh.rotation.z = side * -0.55;
    earMesh.rotation.x = 0.45;
    earMesh.position.set(side * 0.08, 0.08, 0.06);
    earPivot.add(earMesh);
    headGroup.add(earPivot);
    ears.push(earPivot);
  });

  if (pigDef.tusks) {
    [-1, 1].forEach((side) => {
      const tusk = new THREE.Mesh(GEO.tusk, SHARED_MAT.tusk);
      tusk.position.set(side * 0.2, -0.14, 0.44);
      tusk.rotation.x = 0.5;
      tusk.rotation.z = side * -0.55;
      headGroup.add(tusk);
    });
  }

  if (custom.hats && custom.hats !== 'hat_none') {
    const hat = buildHatMesh(custom.hats);
    hat.position.set(0, 0.38, 0);
    headGroup.add(hat);
  }

  const wingsGroup = buildGliderWings(custom.wings);
  bodyGroup.add(wingsGroup);

  const rescueCloud = buildRescueCloud();
  root.add(rescueCloud);

  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.45, 16, 12),
    new THREE.MeshStandardMaterial({ color: '#47d17a', transparent: true, opacity: 0.28, wireframe: true })
  );
  shieldMesh.position.y = 1.0;
  shieldMesh.visible = false;
  bodyGroup.add(shieldMesh);

  // Antena de Volante Inteligente (como en MK8 Deluxe)
  const antenna = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 8, 8),
    new THREE.MeshStandardMaterial({ color: '#ffd000', emissive: '#ff9500', emissiveIntensity: 0.9 })
  );
  antenna.position.set(0, 1.55, -0.95);
  antenna.visible = false;
  bodyGroup.add(antenna);

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.06, -1.12);
  const tailMesh = new THREE.Mesh(GEO.tail, skinMat);
  tailMesh.rotation.y = Math.PI / 2;
  tailMesh.position.set(0, 0.02, -0.09);
  tailPivot.add(tailMesh);
  bodyGroup.add(tailPivot);

  const legs = [];
  [
    { x: -0.34, y: 0.62, z: 0.56, phase: 0 },
    { x: 0.34, y: 0.62, z: 0.56, phase: 0.55 },
    { x: -0.36, y: 0.64, z: -0.58, phase: Math.PI },
    { x: 0.36, y: 0.64, z: -0.58, phase: Math.PI + 0.55 }
  ].forEach((cfg) => {
    const hip = new THREE.Group();
    hip.position.set(cfg.x, cfg.y, cfg.z);
    const upper = new THREE.Mesh(GEO.upperLeg, skinMat);
    upper.position.y = -0.18;
    hip.add(upper);

    const knee = new THREE.Group();
    knee.position.y = -0.34;
    hip.add(knee);

    const lower = new THREE.Mesh(GEO.lowerLeg, skinMat);
    lower.position.y = -0.12;
    knee.add(lower);

    const hoof = new THREE.Mesh(GEO.hoof, SHARED_MAT.hoof);
    hoof.position.y = -0.26;
    knee.add(hoof);

    bodyGroup.add(hip);
    legs.push({ hip, knee, phase: cfg.phase, isFront: cfg.z > 0 });
  });

  root.scale.setScalar(pigDef.scale);
  return { root, bodyGroup, headGroup, ears, tailPivot, legs, wingsGroup, rescueCloud, shieldMesh, antenna, strideTime: Math.random() * 10 };
}

export function animatePigGallop(rig, dt, speed, steer, isBoosting, isGliding = false, showWingsPreview = false) {
  const speedRatio = Math.min(1.4, Math.abs(speed) / 36);
  const freq = isGliding ? 3 : 4.5 + speedRatio * 14 + (isBoosting ? 4.5 : 0);
  rig.strideTime += dt * freq;

  const t = rig.strideTime;
  const amp = isGliding ? 0.25 : 0.14 + speedRatio * 0.75;

  rig.legs.forEach((leg) => {
    const cycle = t + leg.phase;
    leg.hip.rotation.x = isGliding ? (leg.isFront ? -0.55 : 0.55) : Math.sin(cycle) * amp;
    const bend = Math.max(0, Math.cos(cycle)) * (0.35 + speedRatio * 0.7);
    leg.knee.rotation.x = isGliding ? 0.3 : leg.isFront ? bend : -bend * 0.7;
  });

  rig.bodyGroup.position.y = isGliding ? 0.15 : Math.abs(Math.sin(t)) * (0.04 + speedRatio * 0.13);
  rig.bodyGroup.rotation.x = isGliding ? -0.1 : Math.sin(t * 2) * 0.045 * speedRatio + (isBoosting ? -0.06 : 0);
  rig.bodyGroup.rotation.z = THREE.MathUtils.lerp(rig.bodyGroup.rotation.z, -steer * (isGliding ? 0.4 : 0.24) * Math.max(0.4, speedRatio), dt * 7);

  rig.headGroup.rotation.y = THREE.MathUtils.lerp(rig.headGroup.rotation.y, steer * 0.32, dt * 8);
  rig.ears.forEach((ear, i) => {
    ear.rotation.x = Math.sin(t * 2 + i) * (0.12 + speedRatio * 0.22);
  });
  rig.tailPivot.rotation.z = Math.sin(t * 2.5) * 0.35;

  const targetW = isGliding || showWingsPreview ? 1 : 0.001;
  rig.wingsGroup.scale.lerp(new THREE.Vector3(targetW, targetW, targetW), Math.min(1, dt * 10));
}

export class DustSystem {
  constructor(scene, count = 170) {
    this.particles = [];
    const geo = new THREE.DodecahedronGeometry(0.22, 0);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: '#8c6b4a', transparent: true, opacity: 0, roughness: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.particles.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 0.48 });
    }
    this.cursor = 0;
  }

  emit(pos, colorHex = '#9c7b56', spread = 1.4) {
    const p = this.particles[this.cursor];
    this.cursor = (this.cursor + 1) % this.particles.length;
    p.mesh.position.copy(pos);
    p.mesh.position.x += (Math.random() - 0.5) * 0.7;
    p.mesh.position.z += (Math.random() - 0.5) * 0.7;
    p.mesh.material.color.set(colorHex);
    p.mesh.scale.setScalar(0.5 + Math.random() * 0.45);
    p.mesh.visible = true;
    p.vel.set((Math.random() - 0.5) * spread, 1.4 + Math.random() * 2.0, (Math.random() - 0.5) * spread);
    p.life = 0.48;
    p.maxLife = 0.48;
  }

  update(dt) {
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 3.8 * dt;
      p.mesh.material.opacity = (p.life / p.maxLife) * 0.65;
      p.mesh.scale.addScalar(dt * 1.25);
    }
  }
}