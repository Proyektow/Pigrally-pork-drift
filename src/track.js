import * as THREE from 'three';

// Circuito orgánico de rally con peraltes, arcén de barro, árboles y cajas de objetos
export function createTrack(THREE, scene) {
  const RX = 26;
  const RZ = 16;
  const TRACK_WIDTH = 8.5;
  const SEGMENTS = 240;

  // Materiales
  const matRoad = new THREE.MeshStandardMaterial({ color: '#6d482f', roughness: 0.9, flatShading: true });
  const matGrass = new THREE.MeshStandardMaterial({ color: '#568b3b', roughness: 0.95 });
  const matWood = new THREE.MeshStandardMaterial({ color: '#915f38', roughness: 0.8 });
  const matCurbs = new THREE.MeshStandardMaterial({ color: '#ffcc00', roughness: 0.6 });

  // Suelo exterior
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(280, 280), matGrass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.15;
  ground.receiveShadow = true;
  scene.add(ground);

  // Función matemática de trayectoria (Óvalo deformado con peralte)
  function getSplinePose(t, offset = 0) {
    const x = RX * Math.sin(t);
    const z = RZ * Math.cos(t) + Math.sin(t * 2) * 2.2;
    // Vectores normales
    const dx = RX * Math.cos(t);
    const dz = -RZ * Math.sin(t) + 4.4 * Math.cos(t * 2);
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;

    const bank = Math.sin(t * 2) * 0.42 * (offset / (TRACK_WIDTH / 2));
    return {
      x: x + nx * offset,
      y: bank,
      z: z + nz * offset,
      yaw: Math.atan2(dx, dz)
    };
  }

  // Generación de malla de la pista
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = (i / SEGMENTS) * Math.PI * 2;
    for (let side of [-1, 1]) {
      const p = getSplinePose(t, side * (TRACK_WIDTH / 2));
      positions.push(p.x, p.y, p.z);
      uvs.push(i / SEGMENTS, side === -1 ? 0 : 1);
    }
  }

  for (let i = 0; i < SEGMENTS; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  trackGeo.setIndex(indices);
  trackGeo.computeVertexNormals();

  const trackMesh = new THREE.Mesh(trackGeo, matRoad);
  trackMesh.receiveShadow = true;
  scene.add(trackMesh);

  // Vallas de madera y pianos amarillos en curvas
  for (let side of [-1, 1]) {
    for (let i = 0; i < SEGMENTS; i += 6) {
      const t = (i / SEGMENTS) * Math.PI * 2;
      const p = getSplinePose(t, side * (TRACK_WIDTH / 2 + 0.9));
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.2, 0.25), matWood);
      post.position.set(p.x, p.y + 0.5, p.z);
      post.rotation.y = p.yaw;
      post.castShadow = true;
      scene.add(post);
    }
  }

  // Cajas de Objetos (Item Boxes con interrogación)
  const itemBoxes = [];
  const itemBoxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const itemBoxMat = new THREE.MeshStandardMaterial({
    color: '#ffc107',
    transparent: true,
    opacity: 0.85,
    metalness: 0.2,
    roughness: 0.3
  });

  const boxPositions = [0.8, 2.4, 4.0, 5.5]; // 4 tandas en el circuito
  boxPositions.forEach(baseT => {
    for (let lane of [-2.4, 0, 2.4]) {
      const p = getSplinePose(baseT, lane);
      const mesh = new THREE.Mesh(itemBoxGeo, itemBoxMat);
      mesh.position.set(p.x, p.y + 1.1, p.z);
      scene.add(mesh);
      itemBoxes.push({ mesh, x: p.x, z: p.z, active: true, respawn: 0 });
    }
  });

  // Maíces coleccionables
  const coins = [];
  const cornGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.7, 8);
  const cornMat = new THREE.MeshStandardMaterial({ color: '#ffdb4d', roughness: 0.4 });
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * Math.PI * 2;
    const lane = (i % 2 === 0 ? 1 : -1) * 2.2;
    const p = getSplinePose(t, lane);
    const mesh = new THREE.Mesh(cornGeo, cornMat);
    mesh.position.set(p.x, p.y + 0.65, p.z);
    scene.add(mesh);
    coins.push({ mesh, x: p.x, z: p.z, active: true, baseT: t });
  }

  // Helpers de comprobación física de circuito
  function getAngle(x, z) {
    let a = Math.atan2(x / RX, z / RZ);
    if (a < 0) a += Math.PI * 2;
    return a;
  }

  function getRoadDistance(x, z) {
    const t = getAngle(x, z);
    const center = getSplinePose(t, 0);
    return Math.hypot(x - center.x, z - center.z);
  }

  function checkPickups(x, z, time, onBox, onCorn) {
    // Cajas de ítems
    itemBoxes.forEach(b => {
      if (b.active && Math.hypot(x - b.x, z - b.z) < 1.7) {
        b.active = false;
        b.mesh.visible = false;
        b.respawn = time + 5.0;
        onBox();
      }
    });

    // Monedas de maíz
    coins.forEach(c => {
      if (c.active && Math.hypot(x - c.x, z - c.z) < 1.5) {
        c.active = false;
        c.mesh.visible = false;
        onCorn();
      }
    });
  }

  function update(time) {
    itemBoxes.forEach(b => {
      if (!b.active && time > b.respawn) {
        b.active = true;
        b.mesh.visible = true;
      }
      if (b.active) {
        b.mesh.rotation.x = time * 1.5;
        b.mesh.rotation.y = time * 2.0;
      }
    });

    coins.forEach(c => {
      if (c.active) {
        c.mesh.rotation.y = time * 3.0;
      }
    });
  }

  return {
    getSplinePose,
    getAngle,
    getRoadDistance,
    checkPickups,
    update,
    width: TRACK_WIDTH
  };
}
