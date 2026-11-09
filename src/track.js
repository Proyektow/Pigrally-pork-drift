import * as THREE from 'three';

function createRoadTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 256;
  cvs.height = 256;
  const ctx = cvs.getContext('2d');

  // Tierra compactada central
  ctx.fillStyle = '#754c2e';
  ctx.fillRect(0, 0, 256, 256);

  // Motas orgánicas de tierra
  ctx.fillStyle = '#633e24';
  for (let i = 0; i < 90; i++) {
    ctx.fillRect((i * 73) % 220 + 18, (i * 41) % 256, 6, 10);
  }

  // Pianos / Bordillos rojo-amarillo en los extremos
  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = (y / 32) % 2 === 0 ? '#ff3d00' : '#ffea00';
    ctx.fillRect(0, y, 20, 32);
    ctx.fillRect(236, y, 20, 32);
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 38);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCheckerTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 128;
  cvs.height = 32;
  const ctx = cvs.getContext('2d');
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 2; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#1a1a1a';
      ctx.fillRect(x * 16, y * 16, 16, 16);
    }
  }
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createItemBoxTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 128;
  cvs.height = 128;
  const ctx = cvs.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 128, 128);
  grad.addColorStop(0, '#ffeb3b');
  grad.addColorStop(0.5, '#ff6f00');
  grad.addColorStop(1, '#e040fb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 116, 116);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 78px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 64, 68);

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCircuit(scene) {
  const TRACK_WIDTH = 9.6;
  const SAMPLES = 280;

  // Curva paramétrica de rally con S-curves y cambios de altura suaves
  function sampleCenter(t) {
    const angle = t * Math.PI * 2;
    const x = Math.sin(angle) * 34 + Math.sin(angle * 2) * 7.5;
    const z = Math.cos(angle) * 24 - Math.sin(angle * 3) * 4.2;
    const y = Math.sin(angle * 2) * 0.65;
    return new THREE.Vector3(x, y, z);
  }

  function getPointFrame(t, lateralOffset = 0) {
    const normT = ((t % 1) + 1) % 1;
    const p = sampleCenter(normT);
    const pNext = sampleCenter(normT + 0.002);
    const tangent = pNext.clone().sub(p).normalize();
    const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const pos = p.clone().addScaledVector(right, lateralOffset);
    const yaw = Math.atan2(tangent.x, tangent.z);
    return { pos, tangent, right, yaw, t: normT };
  }

  // Suelo verde de pradera
  const grassGeo = new THREE.PlaneGeometry(340, 340);
  const grassMat = new THREE.MeshStandardMaterial({ color: '#5da63b', roughness: 0.95 });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.85;
  grass.receiveShadow = true;
  scene.add(grass);

  // Construcción de la cinta de carretera
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const leftF = getPointFrame(t, -TRACK_WIDTH * 0.5);
    const rightF = getPointFrame(t, TRACK_WIDTH * 0.5);

    positions.push(leftF.pos.x, leftF.pos.y, leftF.pos.z);
    positions.push(rightF.pos.x, rightF.pos.y, rightF.pos.z);

    uvs.push(0, t);
    uvs.push(1, t);
  }

  for (let i = 0; i < SAMPLES; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roadGeo.setIndex(indices);
  roadGeo.computeVertexNormals();

  const roadMat = new THREE.MeshStandardMaterial({
    map: createRoadTexture(),
    roughness: 0.85
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  // Línea de Meta y Pórtico
  const startFrame = getPointFrame(0, 0);
  const finishLine = new THREE.Mesh(
    new THREE.PlaneGeometry(TRACK_WIDTH - 0.6, 2.2),
    new THREE.MeshBasicMaterial({ map: createCheckerTexture(), side: THREE.DoubleSide })
  );
  finishLine.rotation.x = -Math.PI / 2;
  finishLine.rotation.z = -startFrame.yaw;
  finishLine.position.copy(startFrame.pos).add(new THREE.Vector3(0, 0.04, 0));
  scene.add(finishLine);

  const woodMat = new THREE.MeshStandardMaterial({ color: '#8d562e', roughness: 0.85 });
  const bannerMat = new THREE.MeshStandardMaterial({ color: '#ff5e2b', roughness: 0.5 });

  for (const s of [-1, 1]) {
    const pillarF = getPointFrame(0, s * (TRACK_WIDTH * 0.5 + 0.6));
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 4.6, 8), woodMat);
    pillar.position.copy(pillarF.pos).add(new THREE.Vector3(0, 2.2, 0));
    pillar.castShadow = true;
    scene.add(pillar);
  }
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH + 2.2, 0.9, 0.6), bannerMat);
  archTop.position.copy(startFrame.pos).add(new THREE.Vector3(0, 4.3, 0));
  archTop.rotation.y = startFrame.yaw;
  scene.add(archTop);

  // Postes de madera laterales y Fardos de paja
  const strawMat = new THREE.MeshStandardMaterial({ color: '#ebbd34', roughness: 0.75 });
  for (let i = 0; i < SAMPLES; i += 7) {
    const t = i / SAMPLES;
    for (const side of [-1, 1]) {
      const f = getPointFrame(t, side * (TRACK_WIDTH * 0.5 + 0.95));
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.0, 0.24), woodMat);
      post.position.copy(f.pos).add(new THREE.Vector3(0, 0.45, 0));
      post.rotation.y = f.yaw;
      post.castShadow = true;
      scene.add(post);

      if (i % 28 === 0) {
        const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.9, 12), strawMat);
        bale.position.copy(f.pos).addScaledVector(f.right, side * 1.1).add(new THREE.Vector3(0, 0.45, 0));
        bale.castShadow = true;
        scene.add(bale);
      }
    }
  }

  // Árboles estilizados alrededor del valle
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#6e472b', roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: '#3b8528', roughness: 0.75, flatShading: true });

  for (let i = 0; i < 42; i++) {
    const t = i / 42;
    const side = i % 2 === 0 ? 1 : -1;
    const dist = TRACK_WIDTH * 0.5 + 6.5 + (i % 4) * 3.2;
    const f = getPointFrame(t, side * dist);

    const tree = new THREE.Group();
    tree.position.set(f.pos.x, -0.75, f.pos.z);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, 1.6, 7), trunkMat);
    trunk.position.y = 0.8;
    trunk.castShadow = true;
    tree.add(trunk);

    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.8, 7), foliageMat);
    crown.position.y = 2.4;
    crown.castShadow = true;
    tree.add(crown);

    scene.add(tree);
  }

  // Cajas de Objetos (?) flotantes
  const itemBoxes = [];
  const boxGeo = new THREE.BoxGeometry(1.15, 1.15, 1.15);
  const boxMat = new THREE.MeshStandardMaterial({
    map: createItemBoxTexture(),
    roughness: 0.25,
    metalness: 0.1
  });

  const itemClusters = [0.16, 0.42, 0.68, 0.88];
  itemClusters.forEach(tPos => {
    for (const lane of [-2.4, 0, 2.4]) {
      const f = getPointFrame(tPos, lane);
      const mesh = new THREE.Mesh(boxGeo, boxMat);
      mesh.position.copy(f.pos).add(new THREE.Vector3(0, 1.05, 0));
      mesh.castShadow = true;
      scene.add(mesh);
      itemBoxes.push({
        mesh,
        pos: f.pos.clone(),
        baseY: f.pos.y + 1.05,
        active: true,
        respawnAt: 0
      });
    }
  });

  // Monedas de Maíz Dorado
  const corns = [];
  const cornGeo = new THREE.OctahedronGeometry(0.42, 1);
  cornGeo.scale(0.65, 1.25, 0.65);
  const cornMat = new THREE.MeshStandardMaterial({
    color: '#ffd600',
    emissive: '#ff8f00',
    emissiveIntensity: 0.25,
    roughness: 0.3
  });

  for (let i = 0; i < 20; i++) {
    const tPos = (i + 0.5) / 20;
    const lane = ((i % 3) - 1) * 2.1;
    const f = getPointFrame(tPos, lane);
    const mesh = new THREE.Mesh(cornGeo, cornMat);
    mesh.position.copy(f.pos).add(new THREE.Vector3(0, 0.68, 0));
    scene.add(mesh);
    corns.push({
      mesh,
      pos: f.pos.clone(),
      baseY: f.pos.y + 0.68,
      active: true,
      respawnAt: 0
    });
  }

  // Charcos de Barro fuera de la trazada ideal
  const mudPatches = [];
  const mudMat = new THREE.MeshStandardMaterial({ color: '#472a14', roughness: 0.2 });
  [0.26, 0.55, 0.78].forEach((tPos, idx) => {
    const f = getPointFrame(tPos, idx % 2 === 0 ? 2.2 : -2.2);
    const mud = new THREE.Mesh(new THREE.CircleGeometry(1.55, 14), mudMat);
    mud.rotation.x = -Math.PI / 2;
    mud.position.copy(f.pos).add(new THREE.Vector3(0, 0.03, 0));
    scene.add(mud);
    mudPatches.push(f.pos.clone());
  });

  // Puntos precalculados para el minimapa y búsqueda espacial rápida
  const lookupSamples = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES;
    const f = getPointFrame(t, 0);
    lookupSamples.push({ t, pos: f.pos, yaw: f.yaw, right: f.right });
  }

  function projectToTrack(x, z) {
    let best = lookupSamples[0];
    let minDistSq = Infinity;
    for (let i = 0; i < lookupSamples.length; i++) {
      const s = lookupSamples[i];
      const dx = x - s.pos.x;
      const dz = z - s.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < minDistSq) {
        minDistSq = d2;
        best = s;
      }
    }
    const dist = Math.sqrt(minDistSq);
    return {
      t: best.t,
      centerPos: best.pos,
      yaw: best.yaw,
      distanceFromCenter: dist,
      isOffroad: dist > TRACK_WIDTH * 0.5 - 0.35
    };
  }

  function checkInteractions(x, z, elapsedTime, callbacks) {
    for (const box of itemBoxes) {
      if (box.active && Math.hypot(x - box.pos.x, z - box.pos.z) < 1.55) {
        box.active = false;
        box.mesh.visible = false;
        box.respawnAt = elapsedTime + 4.5;
        if (callbacks.onItemBox) callbacks.onItemBox();
      }
    }

    for (const c of corns) {
      if (c.active && Math.hypot(x - c.pos.x, z - c.pos.z) < 1.35) {
        c.active = false;
        c.mesh.visible = false;
        c.respawnAt = elapsedTime + 7.0;
        if (callbacks.onCorn) callbacks.onCorn();
      }
    }

    const inMud = mudPatches.some(m => Math.hypot(x - m.x, z - m.z) < 1.55);
    return { inMud };
  }

  function updatePickups(time) {
    itemBoxes.forEach((b, i) => {
      if (!b.active && time >= b.respawnAt) {
        b.active = true;
        b.mesh.visible = true;
      }
      if (b.active) {
        b.mesh.rotation.y = time * 1.9 + i;
        b.mesh.rotation.x = Math.sin(time * 2 + i) * 0.35;
        b.mesh.position.y = b.baseY + Math.sin(time * 3.2 + i) * 0.14;
      }
    });

    corns.forEach((c, i) => {
      if (!c.active && time >= c.respawnAt) {
        c.active = true;
        c.mesh.visible = true;
      }
      if (c.active) {
        c.mesh.rotation.y = time * 3.0 + i;
        c.mesh.position.y = c.baseY + Math.sin(time * 4 + i) * 0.1;
      }
    });
  }

  function resetPickups() {
    itemBoxes.forEach(b => { b.active = true; b.mesh.visible = true; });
    corns.forEach(c => { c.active = true; c.mesh.visible = true; });
  }

  return {
    width: TRACK_WIDTH,
    getPointFrame,
    projectToTrack,
    checkInteractions,
    updatePickups,
    resetPickups,
    lookupSamples
  };
}
