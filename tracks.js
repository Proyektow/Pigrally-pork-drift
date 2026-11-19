import * as THREE from 'three';
import {
  createDirtRoadTextures,
  createGrassTexture,
  createWoodTexture,
  createItemBoxTexture,
  createGliderRampTexture
} from './textures.js';

export const FARMER_QUOTES = [
  { name: 'Granjero Paco', text: '¡Apunta al centro de la rampa azul para volar lejos!' },
  { name: 'Abuela Pepa', text: '¡Cuidado en el puente, que no tiene barandilla!' },
  { name: 'Tío Manolo', text: '¡Pasa por los aros dorados en el aire para acelerar!' },
  { name: 'Pastora Lucía', text: '¡Las cajas rosas te dan DOS objetos a la vez!' },
  { name: 'Granjero Julián', text: '¡Derrapa suave hasta las chispas rosas y sal disparado!' },
  { name: 'Vecino Fermín', text: '¡En 200cc toca el freno en las curvas sin soltar derrape!' }
];

export const TRACK_CATALOG = [
  {
    id: 'meadow', name: 'Pradera del Amanecer', lengthLabel: '1.6 km • Granja',
    desc: 'Graneros rojos, molino gigante y un vuelo panorámico sobre el río.',
    roadWidth: 18, skyTop: '#4e89c8', skyBottom: '#f7d5a8', fogColor: '#e8cfa9',
    sunColor: '#fff1d0', sunPos: [160, 140, 90], grassColors: ['#4d7d34', '#375e23'], roadColors: ['#7a5432', '#52361c'],
    waterY: -10, isNight: false,
    bridges: [[0.56, 0.65]],
    gaps: [[0.24, 0.295]],
    points: [
      [0, 0, 0], [0, 0, -125], [45, 8, -245], [160, 18, -310], [295, 10, -275],
      [380, 2, -175], [355, 0, -50], [420, 12, 75], [390, 16, 205], [265, 8, 285],
      [135, 3, 240], [70, 0, 150], [-35, 0, 125], [-85, 4, 50], [-40, 0, 12]
    ]
  },
  {
    id: 'windmill_canyon', name: 'Cañón del Molino', lengthLabel: '2.1 km • Vuelo',
    desc: 'Barrancos profundos, puentes abiertos y dos vuelos enormes con aros.',
    roadWidth: 17, skyTop: '#1f538c', skyBottom: '#f2b880', fogColor: '#e0a977',
    sunColor: '#ffe0a8', sunPos: [180, 130, -130], grassColors: ['#8c7d3b', '#6b5e28'], roadColors: ['#9e502d', '#6e341a'],
    waterY: -14, isNight: false,
    bridges: [[0.14, 0.24], [0.76, 0.85]],
    gaps: [[0.33, 0.39], [0.62, 0.68]],
    points: [
      [0, 2, 0], [0, 8, -165], [-95, 22, -305], [15, 30, -430], [185, 22, -455],
      [340, 10, -380], [435, 16, -240], [365, 6, -90], [455, 20, 60], [390, 26, 220],
      [230, 12, 320], [95, 6, 270], [20, 2, 170], [-85, 8, 105], [-55, 3, 30]
    ]
  },
  {
    id: 'acorn_forest', name: 'Bosque de Bellotas', lengthLabel: '1.85 km • Técnico',
    desc: 'Curvas técnicas entre robles, barro profundo y salto sobre el lago.',
    roadWidth: 16.5, skyTop: '#3e5e68', skyBottom: '#c7c2a8', fogColor: '#9fb0a4',
    sunColor: '#ffe7c4', sunPos: [-130, 150, 100], grassColors: ['#3b5e2d', '#28451e'], roadColors: ['#573b24', '#382414'],
    waterY: -10, isNight: false,
    bridges: [[0.42, 0.51]],
    gaps: [[0.20, 0.255], [0.71, 0.76]],
    points: [
      [0, 0, 0], [0, 3, -145], [-85, 12, -260], [-30, 22, -380], [110, 14, -420],
      [245, 5, -350], [210, 1, -220], [330, 10, -135], [405, 18, -10], [340, 8, 150],
      [205, 3, 215], [110, 0, 125], [35, 0, 210], [-75, 4, 165], [-50, 0, 60]
    ]
  },
  {
    id: 'sunset_hills', name: 'Colinas del Granero', lengthLabel: '2.0 km • Rápido',
    desc: 'Montaña rusa rural al atardecer con grandes subidas y bajadas rápidas.',
    roadWidth: 17.5, skyTop: '#2e2b59', skyBottom: '#f27d42', fogColor: '#d9885b',
    sunColor: '#ffaa66', sunPos: [-200, 75, -160], grassColors: ['#6e752c', '#50571f'], roadColors: ['#82502c', '#593318'],
    waterY: -12, isNight: false,
    bridges: [[0.28, 0.38], [0.68, 0.76]],
    gaps: [[0.48, 0.54]],
    points: [
      [0, 0, 0], [0, 9, -155], [75, 24, -295], [220, 30, -365], [375, 14, -330],
      [465, 3, -210], [420, -1, -70], [290, 11, -40], [340, 22, 110], [435, 26, 240],
      [310, 14, 345], [150, 6, 315], [45, 1, 225], [-80, 8, 155], [-80, 3, 45]
    ]
  },
  {
    id: 'star_farm', name: 'Granja Estelar (Arcoíris)', lengthLabel: '2.2 km • Experto',
    desc: 'Pista luminosa flotando sobre las nubes. Sin vallas en casi todo el trazado.',
    roadWidth: 16.5, skyTop: '#070b1c', skyBottom: '#1c1945', fogColor: '#12122e',
    sunColor: '#c4dcff', sunPos: [140, 180, -100], grassColors: ['#101530', '#0a0e24'], roadColors: ['#ff4d6d', '#7209b7'],
    waterY: -32, isNight: true,
    bridges: [[0.06, 0.94]], // Casi toda la pista es aérea sin vallas como Senda Arcoíris
    gaps: [[0.22, 0.285], [0.54, 0.605], [0.80, 0.855]],
    points: [
      [0, 14, 0], [0, 18, -170], [95, 28, -310], [245, 36, -370], [395, 22, -310],
      [475, 12, -165], [390, 18, -25], [460, 30, 125], [360, 34, 275], [210, 20, 355],
      [85, 16, 285], [115, 24, 160], [-15, 18, 150], [-95, 22, 65], [-55, 15, 15]
    ]
  }
];

function inRanges(t, ranges) {
  for (const [a, b] of ranges) {
    if (t >= a && t <= b) return true;
  }
  return false;
}

export class FarmTrack {
  constructor(scene, trackDef) {
    this.def = trackDef;
    this.group = new THREE.Group();
    scene.add(this.group);

    const vecs = trackDef.points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    this.curve = new THREE.CatmullRomCurve3(vecs, true, 'catmullrom', 0.5);
    this.totalLength = this.curve.getLength();
    this.sampleCount = 520;
    this.samples = [];

    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < this.sampleCount; i++) {
      const t = i / this.sampleCount;
      const pos = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const isGap = inRanges(t, trackDef.gaps || []);
      const isBridge = isGap || inRanges(t, trackDef.bridges || []);
      this.samples.push({ t, pos, tangent, right, isGap, isBridge });
    }

    this.mudZones = [];
    this.boostPads = [];
    this.ramps = [];
    this.skyRings = [];
    this.itemBoxes = [];
    this.coins = [];
    this.farmers = [];
    this.traps = [];
    this.windmills = [];

    this._buildSkyAndGround();
    this._buildRoadRibbon();
    this._buildStartArch();
    this._buildGameplayObjects();
    this._buildPropsAndFarmers();
  }

  _buildSkyAndGround() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, this.def.skyTop);
    grad.addColorStop(0.68, this.def.skyBottom);
    grad.addColorStop(1, this.def.fogColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 256);
    const skyTex = new THREE.CanvasTexture(c);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    this.group.add(new THREE.Mesh(
      new THREE.SphereGeometry(1200, 20, 14),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
    ));

    if (this.def.isNight) {
      // Estrellas flotantes para Granja Estelar
      const starPos = [];
      for (let i = 0; i < 650; i++) {
        starPos.push((Math.random() - 0.5) * 1400, 25 + Math.random() * 450, (Math.random() - 0.5) * 1400);
      }
      const sGeo = new THREE.BufferGeometry();
      sGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
      this.group.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 2.8 })));
    } else {
      // Pradera baja + río/agua en barrancos
      const grassTex = createGrassTexture(this.def.grassColors[0], this.def.grassColors[1]);
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(2400, 2400),
        new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.96 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = this.def.waterY - 2;
      ground.receiveShadow = true;
      this.group.add(ground);

      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(2400, 2400),
        new THREE.MeshStandardMaterial({ color: '#2b7ba8', roughness: 0.18, metalness: 0.25, transparent: true, opacity: 0.78 })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = this.def.waterY;
      this.group.add(water);
    }
  }

  _buildRoadRibbon() {
    const halfW = this.def.roadWidth * 0.5;
    const n = this.sampleCount;
    const positions = [], uvs = [], indices = [];

    for (let i = 0; i <= n; i++) {
      const s = this.samples[i % n];
      const v = (i / n) * (this.totalLength / 15);
      const skirtW = s.isBridge ? halfW + 0.6 : halfW + 6.5;
      const skirtDrop = s.isBridge ? 1.4 : 18.0;

      const pL = s.pos.clone().addScaledVector(s.right, -halfW);
      const pR = s.pos.clone().addScaledVector(s.right, halfW);
      const sL = s.pos.clone().addScaledVector(s.right, -skirtW);
      const sR = s.pos.clone().addScaledVector(s.right, skirtW);
      sL.y -= skirtDrop; sR.y -= skirtDrop;

      positions.push(sL.x, sL.y, sL.z, pL.x, pL.y + 0.05, pL.z, pR.x, pR.y + 0.05, pR.z, sR.x, sR.y, sR.z);
      uvs.push(0, v, 0.08, v, 0.92, v, 1, v);

      if (i < n) {
        const sNext = this.samples[(i + 1) % n];
        // Omitir carretera en barrancos de vuelo para crear huecos reales
        if (s.isGap || sNext.isGap) continue;
        const b = i * 4, nx = (i + 1) * 4;
        for (let k = 0; k < 3; k++) {
          indices.push(b + k, nx + k, b + k + 1, b + k + 1, nx + k, nx + k + 1);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const { map, bumpMap } = createDirtRoadTextures(this.def.roadColors[0], this.def.roadColors[1], this.def.isNight);
    const mat = new THREE.MeshStandardMaterial({
      map,
      bumpMap: this.def.isNight ? null : bumpMap,
      bumpScale: 0.12,
      roughness: this.def.isNight ? 0.35 : 0.9,
      emissive: this.def.isNight ? '#2c184a' : '#000000',
      emissiveIntensity: this.def.isNight ? 0.4 : 0,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  _buildStartArch() {
    const s = this.samples[0];
    const woodMat = new THREE.MeshStandardMaterial({ map: createWoodTexture('#6b3f20'), roughness: 0.85 });
    const arch = new THREE.Group();
    arch.position.copy(s.pos);
    arch.lookAt(s.pos.clone().add(s.tangent));

    const halfW = this.def.roadWidth * 0.5 + 1.2;
    [-halfW, halfW].forEach((x) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(1.0, 9.0, 1.0), woodMat);
      post.position.set(x, 4.5, 0);
      post.castShadow = true;
      arch.add(post);
    });
    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(this.def.roadWidth + 3.6, 2.0, 0.7),
      new THREE.MeshStandardMaterial({ color: '#d9381e', emissive: this.def.isNight ? '#551100' : '#000' })
    );
    banner.position.set(0, 8.3, 0);
    arch.add(banner);

    const line = new THREE.Mesh(new THREE.PlaneGeometry(this.def.roadWidth, 2.8), new THREE.MeshStandardMaterial({ color: '#f5f5f5' }));
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.14;
    arch.add(line);
    this.group.add(arch);
  }

  _buildGameplayObjects() {
    const halfW = this.def.roadWidth * 0.5;
    const mudMat = new THREE.MeshStandardMaterial({ color: '#3b2412', roughness: 0.2 });
    const boostMat = new THREE.MeshStandardMaterial({ color: '#ff9500', emissive: '#ff5500', emissiveIntensity: 0.75 });
    const gliderRampMat = new THREE.MeshStandardMaterial({
      map: createGliderRampTexture(),
      emissive: '#0066cc',
      emissiveIntensity: 0.45,
      roughness: 0.3
    });
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#ffd026',
      emissive: '#ff9900',
      emissiveIntensity: 0.65,
      metalness: 0.7,
      roughness: 0.2
    });
    const singleBoxMat = new THREE.MeshStandardMaterial({ map: createItemBoxTexture(false), roughness: 0.25 });
    const doubleBoxMat = new THREE.MeshStandardMaterial({ map: createItemBoxTexture(true), roughness: 0.2 });
    const coinMat = new THREE.MeshStandardMaterial({ color: '#ffd026', metalness: 0.75, roughness: 0.2, emissive: '#805500', emissiveIntensity: 0.35 });

    const boxGeo = new THREE.BoxGeometry(1.75, 1.75, 1.75);
    const coinGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.18, 14);
    coinGeo.rotateZ(Math.PI / 2);

    // 1. Rampas Azules de Planeo justo antes de cada barranco + Aros aéreos en el vuelo
    (this.def.gaps || []).forEach(([startT, endT]) => {
      const launchIdx = (Math.floor(startT * this.sampleCount) - 3 + this.sampleCount) % this.sampleCount;
      const s = this.samples[launchIdx];
      const rampGroup = new THREE.Group();
      rampGroup.position.copy(s.pos);
      rampGroup.lookAt(s.pos.clone().add(s.tangent));

      const wedge = new THREE.Mesh(new THREE.BoxGeometry(this.def.roadWidth * 0.92, 0.55, 8.5), gliderRampMat);
      wedge.position.set(0, 1.1, 0);
      wedge.rotation.x = -0.27;
      rampGroup.add(wedge);
      this.group.add(rampGroup);
      this.ramps.push({ pos: s.pos.clone(), radius: 7.2, isGlider: true });

      // 2 Aros dorados aéreos flotando sobre el barranco
      [0.32, 0.68].forEach((frac) => {
        const ringT = startT + (endT - startT) * frac;
        const rs = this.samples[Math.floor(ringT * this.sampleCount) % this.sampleCount];
        const ringY = rs.pos.y + 7.5 + (frac < 0.5 ? 2.5 : -0.5);
        const ringPos = new THREE.Vector3(rs.pos.x, ringY, rs.pos.z);

        const ring = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.38, 10, 24), ringMat);
        ring.position.copy(ringPos);
        ring.lookAt(ringPos.clone().add(rs.tangent));
        this.group.add(ring);
        this.skyRings.push({ mesh: ring, pos: ringPos, radius: 5.2 });
      });
    });

    // Rampa de vuelo adicional en tierra firme para volar sobre el paisaje
    const bonusIdx = Math.floor(0.86 * this.sampleCount);
    if (!this.samples[bonusIdx].isGap) {
      const s = this.samples[bonusIdx];
      const rampGroup = new THREE.Group();
      rampGroup.position.copy(s.pos);
      rampGroup.lookAt(s.pos.clone().add(s.tangent));
      const wedge = new THREE.Mesh(new THREE.BoxGeometry(halfW * 1.1, 0.45, 7.2), gliderRampMat);
      wedge.position.set(0, 0.9, 0);
      wedge.rotation.x = -0.25;
      rampGroup.add(wedge);
      this.group.add(rampGroup);
      this.ramps.push({ pos: s.pos.clone(), radius: 6.2, isGlider: true });
    }

    // 2. Filas de Cajas de Objetos (? y Dobles ??)
    [0.10, 0.31, 0.52, 0.74, 0.92].forEach((ratio) => {
      const idx = Math.floor(ratio * this.sampleCount);
      const s = this.samples[idx];
      if (s.isGap) return;
      [-4.8, -1.6, 1.6, 4.8].forEach((lat, colIdx) => {
        const isDouble = colIdx === 0 || colIdx === 3; // Cajas dobles en los bordes exteriores (riesgo-recompensa)
        const p = s.pos.clone().addScaledVector(s.right, lat);
        const container = new THREE.Group();
        container.position.set(p.x, p.y + 1.55, p.z);

        const m1 = new THREE.Mesh(boxGeo, isDouble ? doubleBoxMat : singleBoxMat);
        container.add(m1);
        if (isDouble) {
          const m2 = new THREE.Mesh(boxGeo, doubleBoxMat);
          m2.scale.setScalar(0.76);
          m2.position.y = 1.35;
          container.add(m2);
        }
        this.group.add(container);
        this.itemBoxes.push({ mesh: container, pos: p, isDouble, active: true, respawnTimer: 0 });
      });
    });

    // 3. Monedas doradas (en pista y flotando en algunos saltos)
    for (let idx = 24; idx < this.sampleCount - 16; idx += 36) {
      const s = this.samples[idx];
      const lane = ((idx % 3) - 1) * (halfW * 0.42);
      for (let k = 0; k < 3; k++) {
        const sk = this.samples[(idx + k * 3) % this.sampleCount];
        const p = sk.pos.clone().addScaledVector(sk.right, lane);
        const yOff = sk.isGap ? 7.5 : 1.1;
        const mesh = new THREE.Mesh(coinGeo, coinMat);
        mesh.position.set(p.x, p.y + yOff, p.z);
        this.group.add(mesh);
        this.coins.push({ mesh, pos: new THREE.Vector3(p.x, p.y + yOff, p.z), active: true, respawnTimer: 0 });
      }
    }

    // 4. Charcos de barro y paneles Turbo
    if (!this.def.isNight) {
      for (let i = 36; i < this.sampleCount - 20; i += 62) {
        const s = this.samples[i];
        if (s.isBridge || s.isGap) continue;
        const p = s.pos.clone().addScaledVector(s.right, (Math.random() - 0.5) * halfW * 0.78);
        const mud = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.08, 14), mudMat);
        mud.position.set(p.x, p.y + 0.07, p.z);
        this.group.add(mud);
        this.mudZones.push({ pos: p, radius: 3.5 });
      }
    }

    for (let i = 45; i < this.sampleCount - 20; i += 74) {
      const s = this.samples[i];
      if (s.isGap) continue;
      const p = s.pos.clone().addScaledVector(s.right, (Math.random() - 0.5) * halfW * 0.55);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 6.4), boostMat);
      pad.position.set(p.x, p.y + 0.1, p.z);
      pad.lookAt(p.clone().add(s.tangent));
      this.group.add(pad);
      this.boostPads.push({ pos: p, radius: 3.9 });
    }
  }

  _buildFarmerMesh() {
    const g = new THREE.Group();
    const blue = new THREE.MeshStandardMaterial({ color: '#2b548a' });
    const shirt = new THREE.MeshStandardMaterial({ color: '#c9382a' });
    const skin = new THREE.MeshStandardMaterial({ color: '#f0bfa0' });
    const straw = new THREE.MeshStandardMaterial({ color: '#e0c068' });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 1.35, 10), blue);
    body.position.y = 1.1;
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.5, 10), shirt);
    chest.position.y = 1.65;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), skin);
    head.position.y = 2.22;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.06, 12), straw);
    brim.position.y = 2.48;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.25, 12), straw);
    crown.position.y = 2.62;
    g.add(body, chest, head, brim, crown);
    g.scale.setScalar(1.18);
    return g;
  }

  _buildWindmill(pos) {
    const g = new THREE.Group();
    g.position.copy(pos);
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 4.4, 22, 12),
      new THREE.MeshStandardMaterial({ color: '#e6dfd3', roughness: 0.85 })
    );
    tower.position.y = 11;
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 4.5, 12),
      new THREE.MeshStandardMaterial({ color: '#9e2a22', roughness: 0.8 })
    );
    cap.position.y = 24;
    g.add(tower, cap);

    const blades = new THREE.Group();
    blades.position.set(0, 20.5, 3.0);
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#784c2a', roughness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 10.5, 0.25), bladeMat);
      arm.rotation.z = (i * Math.PI) / 2;
      arm.position.set(Math.sin((i * Math.PI) / 2) * 5.2, Math.cos((i * Math.PI) / 2) * 5.2, 0);
      blades.add(arm);
    }
    g.add(blades);
    this.group.add(g);
    this.windmills.push(blades);
  }

  _buildPropsAndFarmers() {
    const woodMat = new THREE.MeshStandardMaterial({ map: createWoodTexture('#784c2a'), roughness: 0.9 });
    const hayMat = new THREE.MeshStandardMaterial({ color: '#d6b14d', roughness: 0.95 });
    const barnRed = new THREE.MeshStandardMaterial({ map: createWoodTexture('#9e2a22'), roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#3b3735', roughness: 0.85 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#4d331f', roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: this.def.id === 'acorn_forest' ? '#5e6b29' : '#356629', roughness: 0.85 });
    const halfW = this.def.roadWidth * 0.5;

    // Postes de valla SOLO en tramos normales (en puentes y barrancos queda abierto)
    const postGeo = new THREE.BoxGeometry(0.32, 1.7, 0.32);
    for (let i = 0; i < this.sampleCount; i += 8) {
      const s = this.samples[i];
      if (s.isBridge || s.isGap) continue;
      [-1, 1].forEach((side) => {
        const p = s.pos.clone().addScaledVector(s.right, side * (halfW + 1.2));
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.set(p.x, p.y + 0.85, p.z);
        this.group.add(post);
      });
    }

    // Granjeros parlanchines
    for (let k = 0; k < FARMER_QUOTES.length; k++) {
      const idx = Math.floor(((k + 0.4) / FARMER_QUOTES.length) * this.sampleCount);
      const s = this.samples[idx];
      if (s.isGap) continue;
      const side = k % 2 === 0 ? 1 : -1;
      const p = s.pos.clone().addScaledVector(s.right, side * (halfW + (s.isBridge ? 0.2 : 3.2)));
      const farmer = this._buildFarmerMesh();
      farmer.position.copy(p);
      farmer.lookAt(s.pos);
      this.group.add(farmer);
      this.farmers.push({ mesh: farmer, pos: p, quote: FARMER_QUOTES[k], cooldown: 0 });
    }

    if (this.def.isNight) return; // En Granja Estelar mantenemos estética limpia flotante

    const hayGeo = new THREE.CylinderGeometry(1.3, 1.3, 2.2, 12);
    hayGeo.rotateZ(Math.PI / 2);

    for (let i = 0; i < this.sampleCount; i += 11) {
      const s = this.samples[i];
      if (s.isBridge || s.isGap) continue;
      const side = i % 22 === 0 ? 1 : -1;
      const p = s.pos.clone().addScaledVector(s.right, side * (halfW + 8 + Math.random() * 26));
      if (this._isNearTrack(p, halfW + 5)) continue;

      if (i % 132 === 0) {
        this._buildWindmill(new THREE.Vector3(p.x, p.y - 1, p.z));
      } else if (i % 66 === 0) {
        const barn = new THREE.Group();
        barn.position.set(p.x, p.y - 0.6, p.z);
        barn.rotation.y = Math.random() * Math.PI * 2;
        const base = new THREE.Mesh(new THREE.BoxGeometry(12, 7.5, 16), barnRed);
        base.position.y = 3.75;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(10.5, 5, 4), roofMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 10;
        const silo = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 13, 12), roofMat);
        silo.position.set(8.5, 6.5, -3);
        barn.add(base, roof, silo);
        this.group.add(barn);
      } else if (i % 33 === 0) {
        const hay = new THREE.Mesh(hayGeo, hayMat);
        hay.position.set(p.x, p.y + 1.2, p.z);
        hay.rotation.y = Math.random() * Math.PI;
        this.group.add(hay);
      } else {
        const tree = new THREE.Group();
        tree.position.set(p.x, p.y - 0.4, p.z);
        tree.scale.setScalar(0.85 + Math.random() * 0.75);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 5.5, 8), trunkMat);
        trunk.position.y = 2.75;
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(3.4, 1), leafMat);
        crown.position.y = 6.8;
        tree.add(trunk, crown);
        this.group.add(tree);
      }
    }
  }

  dropPumpkinTrap(pos, ownerId) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 12, 10),
      new THREE.MeshStandardMaterial({ color: '#eb6c10', roughness: 0.65 })
    );
    mesh.scale.set(1.1, 0.85, 1.1);
    mesh.position.set(pos.x, pos.y + 0.65, pos.z);
    this.group.add(mesh);
    this.traps.push({ mesh, pos: pos.clone(), ownerId, grace: 1.0 });
  }

  updateAnimatedProps(dt, elapsed) {
    for (const b of this.itemBoxes) {
      if (b.active) {
        b.mesh.rotation.y += dt * 1.9;
        b.mesh.position.y = b.pos.y + 1.55 + Math.sin(elapsed * 3 + b.pos.x) * 0.25;
      } else {
        b.respawnTimer -= dt;
        if (b.respawnTimer <= 0) { b.active = true; b.mesh.visible = true; }
      }
    }
    for (const c of this.coins) {
      if (c.active) c.mesh.rotation.y += dt * 3.0;
      else {
        c.respawnTimer -= dt;
        if (c.respawnTimer <= 0) { c.active = true; c.mesh.visible = true; }
      }
    }
    for (const r of this.skyRings) r.mesh.rotation.z += dt * 1.5;
    for (const w of this.windmills) w.rotation.z -= dt * 0.85;
    for (const f of this.farmers) {
      f.mesh.position.y = f.pos.y + Math.abs(Math.sin(elapsed * 4 + f.pos.x)) * 0.25;
      if (f.cooldown > 0) f.cooldown -= dt;
    }
    for (const tr of this.traps) {
      if (tr.grace > 0) tr.grace -= dt;
    }
  }

  _isNearTrack(pos, minDist) {
    for (let i = 0; i < this.sampleCount; i += 4) {
      const p = this.samples[i].pos;
      const dx = p.x - pos.x, dz = p.z - pos.z;
      if (dx * dx + dz * dz < minDist * minDist) return true;
    }
    return false;
  }

  findSafeRespawnSample(fromIdx) {
    const n = this.sampleCount;
    for (let step = 4; step < 60; step++) {
      const idx = (fromIdx - step + n) % n;
      if (!this.samples[idx].isGap) return { index: idx, sample: this.samples[idx] };
    }
    return { index: 0, sample: this.samples[0] };
  }

  projectPoint(pos, hintIndex = 0) {
    let bestIdx = hintIndex;
    let bestDistSq = Infinity;
    const n = this.sampleCount;
    for (let offset = -36; offset <= 36; offset++) {
      const idx = (hintIndex + offset + n) % n;
      const sp = this.samples[idx].pos;
      const dx = pos.x - sp.x, dz = pos.z - sp.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) { bestDistSq = dSq; bestIdx = idx; }
    }
    const s = this.samples[bestIdx];
    const diff = new THREE.Vector3().subVectors(pos, s.pos);
    return {
      index: bestIdx,
      t: s.t,
      groundY: s.pos.y,
      lateral: diff.dot(s.right),
      tangent: s.tangent,
      right: s.right,
      center: s.pos,
      isGap: s.isGap,
      isBridge: s.isBridge
    };
  }

  dispose(scene) {
    scene.remove(this.group);
  }
}