import * as THREE from 'three';

export function createOrganicPig(cosmetics = {}) {
  const pigGroup = new THREE.Group();
  const skinColor = cosmetics.skin || '#ff9bb2';
  const hoofColor = '#4a2c11';
  const snoutColor = '#ff6b8b';

  // Material cartoon sombreado suave
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.6,
    metalness: 0.05
  });

  const snoutMat = new THREE.MeshStandardMaterial({ color: snoutColor, roughness: 0.7 });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 });
  const eyePupilMat = new THREE.MeshBasicMaterial({ color: '#1a0e08' });
  const hoofMat = new THREE.MeshStandardMaterial({ color: hoofColor, roughness: 0.8 });

  // 1. Cuerpo regordete y aerodinámico
  const bodyGeo = new THREE.SphereGeometry(0.85, 20, 16);
  bodyGeo.scale(1.0, 0.88, 1.35);
  const body = new THREE.Mesh(bodyGeo, skinMat);
  body.position.y = 0.95;
  body.castShadow = true;
  pigGroup.add(body);

  // 2. Cabeza expresiva
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.25, 0.8);
  const headGeo = new THREE.SphereGeometry(0.62, 18, 16);
  headGeo.scale(1.0, 0.92, 0.98);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Hocico respingón característico
  const snoutGeo = new THREE.CylinderGeometry(0.26, 0.3, 0.22, 16);
  const snout = new THREE.Mesh(snoutGeo, snoutMat);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.08, 0.58);
  headGroup.add(snout);

  // Agujeros del hocico
  for (let s of [-0.08, 0.08]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyePupilMat);
    nostril.position.set(s, -0.08, 0.7);
    headGroup.add(nostril);
  }

  // Ojos tiernos y expresivos
  for (let s of [-0.26, 0.26]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), eyeWhiteMat);
    eye.position.set(s, 0.16, 0.46);
    headGroup.add(eye);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), eyePupilMat);
    pupil.position.set(s, 0.16, 0.55);
    headGroup.add(pupil);
  }

  // Orejas flexibles con pivote para rebotar
  const ears = [];
  for (let s of [-1, 1]) {
    const earPivot = new THREE.Group();
    earPivot.position.set(s * 0.42, 0.4, 0.05);
    earPivot.rotation.z = s * -0.3;
    const earMesh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.48, 8), snoutMat);
    earMesh.rotation.x = -0.3;
    earMesh.position.y = 0.18;
    earPivot.add(earMesh);
    headGroup.add(earPivot);
    ears.push({ pivot: earPivot, side: s });
  }
  pigGroup.add(headGroup);

  // 3. Patas trotadoras independientes (sin ruedas)
  const legs = [];
  const legPositions = [
    [-0.45, 0.55, 0.6],  // Delantera izq
    [0.45, 0.55, 0.6],   // Delantera dcha
    [-0.48, 0.55, -0.6], // Trasera izq
    [0.48, 0.55, -0.6]   // Trasera dcha
  ];

  legPositions.forEach(([x, y, z], idx) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(x, y, z);

    // Muslo
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.42, 10), skinMat);
    thigh.position.y = -0.18;
    thigh.castShadow = true;
    legPivot.add(thigh);

    // Pezuña dividida
    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.16, 0.22), hoofMat);
    hoof.position.set(0, -0.42, 0.02);
    hoof.castShadow = true;
    legPivot.add(hoof);

    pigGroup.add(legPivot);
    legs.push({ pivot: legPivot, isRear: idx >= 2, side: x > 0 ? 1 : -1 });
  });

  // 4. Rabito en espiral
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 1.05, -1.1);
  const tailGeo = new THREE.TorusGeometry(0.12, 0.045, 8, 16, Math.PI * 1.8);
  const tail = new THREE.Mesh(tailGeo, skinMat);
  tailGroup.add(tail);
  pigGroup.add(tailGroup);

  // Animación procedural sincronizada con la velocidad y derrape
  pigGroup.userData.animate = (time, speed, isDrifting, steerInput) => {
    const gaitFreq = time * (6 + speed * 1.6);
    const moving = speed > 0.5;

    // Galope alternado de cuadrúpedo
    legs.forEach((leg, i) => {
      const phaseOffset = (i === 0 || i === 3) ? 0 : Math.PI;
      const angle = moving ? Math.sin(gaitFreq + phaseOffset) * (0.35 + speed * 0.02) : 0;
      leg.pivot.rotation.x = angle;
    });

    // Inclinación del cerdo al tomar curvas (Banking centrífugo)
    pigGroup.rotation.z = -steerInput * 0.22;
    pigGroup.rotation.y = isDrifting ? steerInput * 0.45 : 0;

    // Rebote elástico de orejas y cabeza
    ears.forEach(e => {
      e.pivot.rotation.x = Math.sin(gaitFreq * 1.2) * 0.15;
    });
    headGroup.rotation.x = Math.sin(gaitFreq) * 0.06;
    tailGroup.rotation.z = Math.sin(time * 8) * 0.4;
  };

  return pigGroup;
}
