import * as THREE from 'three';

export function buildPigRacer(config = {}) {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const skinColor = config.skin || '#ff9ebb';
  const snoutColor = config.snout || '#ff6b93';
  const earColor = config.ear || '#ff7fa0';
  const hatName = config.hat || 'Sin Gorro';

  const matSkin = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.55,
    metalness: 0.04,
    flatShading: true
  });
  const matSnout = new THREE.MeshStandardMaterial({
    color: snoutColor,
    roughness: 0.6,
    flatShading: true
  });
  const matEar = new THREE.MeshStandardMaterial({
    color: earColor,
    roughness: 0.6,
    flatShading: true
  });
  const matDark = new THREE.MeshStandardMaterial({ color: '#2b1911', roughness: 0.8 });
  const matWhite = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 });
  const matGold = new THREE.MeshStandardMaterial({ color: '#ffca28', metalness: 0.55, roughness: 0.3 });

  // 1. Torso orgánico regordete
  const torsoGeo = new THREE.SphereGeometry(0.84, 16, 14);
  torsoGeo.scale(0.96, 0.84, 1.32);
  const torso = new THREE.Mesh(torsoGeo, matSkin);
  torso.position.set(0, 0.88, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  // Barriga rosada
  const bellyGeo = new THREE.SphereGeometry(0.64, 12, 10);
  bellyGeo.scale(0.85, 0.45, 1.05);
  const belly = new THREE.Mesh(bellyGeo, matSnout);
  belly.position.set(0, 0.58, 0.08);
  bodyPivot.add(belly);

  // 2. Cabeza expresiva con pivote de balanceo
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.24, 0.78);
  bodyPivot.add(headPivot);

  const headGeo = new THREE.SphereGeometry(0.6, 16, 14);
  headGeo.scale(1.0, 0.92, 0.96);
  const headMesh = new THREE.Mesh(headGeo, matSkin);
  headMesh.castShadow = true;
  headPivot.add(headMesh);

  // Hocico
  const snoutMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.29, 0.22, 14), matSnout);
  snoutMesh.rotation.x = Math.PI / 2;
  snoutMesh.position.set(0, -0.08, 0.56);
  snoutMesh.castShadow = true;
  headPivot.add(snoutMesh);

  // Fosas nasales
  for (const side of [-0.09, 0.09]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), matDark);
    nostril.position.set(side, -0.08, 0.67);
    headPivot.add(nostril);
  }

  // Ojos grandes con brillo
  for (const side of [-0.25, 0.25]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 10), matWhite);
    eyeWhite.position.set(side, 0.15, 0.46);
    headPivot.add(eyeWhite);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), matDark);
    pupil.position.set(side, 0.15, 0.55);
    headPivot.add(pupil);

    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), matWhite);
    shine.position.set(side + 0.025, 0.18, 0.59);
    headPivot.add(shine);
  }

  // Orejas articuladas
  const ears = [];
  for (const side of [-1, 1]) {
    const earPivot = new THREE.Group();
    earPivot.position.set(side * 0.4, 0.38, 0.04);
    earPivot.rotation.z = side * -0.32;

    const earCone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.46, 8), matEar);
    earCone.position.y = 0.18;
    earCone.rotation.x = -0.25;
    earCone.castShadow = true;
    earPivot.add(earCone);

    headPivot.add(earPivot);
    ears.push({ pivot: earPivot, side });
  }

  // 3. Cuatro patas independientes con pezuñas (Sin ruedas)
  const legs = [];
  const legCoords = [
    { x: -0.44, y: 0.54, z: 0.58, phase: 0 },
    { x: 0.44, y: 0.54, z: 0.58, phase: Math.PI },
    { x: -0.46, y: 0.54, z: -0.58, phase: Math.PI },
    { x: 0.46, y: 0.54, z: -0.58, phase: 0 }
  ];

  legCoords.forEach(c => {
    const legPivot = new THREE.Group();
    legPivot.position.set(c.x, c.y, c.z);

    const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.38, 9), matSkin);
    upperLeg.position.y = -0.16;
    upperLeg.castShadow = true;
    legPivot.add(upperLeg);

    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.15, 0.23), matDark);
    hoof.position.set(0, -0.39, 0.03);
    hoof.castShadow = true;
    legPivot.add(hoof);

    bodyPivot.add(legPivot);
    legs.push({ pivot: legPivot, phase: c.phase });
  });

  // 4. Rabito rizado en espiral
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.0, -1.06);
  const tailTorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.042, 8, 16, Math.PI * 1.85),
    matSnout
  );
  tailPivot.add(tailTorus);
  bodyPivot.add(tailPivot);

  // 5. Cosméticos / Gorros
  let propellerBlade = null;
  if (hatName === 'Gorra Hélice') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: '#ff3d00', roughness: 0.4 })
    );
    dome.position.set(0, 0.42, 0);
    headPivot.add(dome);

    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), matGold);
    pin.position.set(0, 0.65, 0);
    headPivot.add(pin);

    propellerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.035, 0.11), matGold);
    propellerBlade.position.set(0, 0.73, 0);
    headPivot.add(propellerBlade);
  } else if (hatName === 'Casco Vikingo') {
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.43, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: '#78909c', metalness: 0.4, roughness: 0.4 })
    );
    helm.position.set(0, 0.4, 0);
    headPivot.add(helm);

    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(
        new THREE.ConeGeometry(0.095, 0.48, 8),
        new THREE.MeshStandardMaterial({ color: '#fff8e1' })
      );
      horn.position.set(s * 0.44, 0.58, 0);
      horn.rotation.z = -s * 0.48;
      headPivot.add(horn);
    }
  } else if (hatName === 'Corona Real') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.26, 7), matGold);
    crown.position.set(0, 0.52, 0);
    headPivot.add(crown);
  } else if (hatName === 'Gafas Aviador') {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.035, 6, 16), matDark);
    strap.rotation.x = Math.PI / 2;
    strap.position.set(0, 0.25, 0);
    headPivot.add(strap);

    for (const s of [-0.22, 0.22]) {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), matGold);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(s, 0.26, 0.52);
      headPivot.add(rim);
    }
  }

  // 6. Globos / Auras de Chispas de Derrape Traseros
  const sparkOrbs = [];
  const sparkMat = new THREE.MeshBasicMaterial({ color: '#00d2ff' });
  for (const s of [-0.52, 0.52]) {
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), sparkMat);
    orb.position.set(s, 0.26, -0.78);
    orb.visible = false;
    bodyPivot.add(orb);
    sparkOrbs.push(orb);
  }

  // Función de actualización cinemática por frame
  root.userData.updateAnimation = (time, speed, steerAmount, driftSlipAngle, sparkTier = 0, shrunk = false) => {
    const targetScale = shrunk ? 0.55 : 1.0;
    root.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);

    const gaitSpeed = time * (5.5 + Math.min(speed, 28) * 1.45);
    const isMoving = speed > 0.35;

    // Galope de las 4 patas
    legs.forEach(leg => {
      const swing = isMoving
        ? Math.sin(gaitSpeed + leg.phase) * (0.28 + Math.min(speed, 22) * 0.022)
        : 0;
      leg.pivot.rotation.x = swing;
    });

    // Rebote vertical del cuerpo al galopar
    bodyPivot.position.y = isMoving ? Math.abs(Math.sin(gaitSpeed)) * 0.09 : 0;

    // Inclinación centrífuga (banking) + ángulo de derrape (slip angle)
    bodyPivot.rotation.z = THREE.MathUtils.lerp(bodyPivot.rotation.z, -steerAmount * 0.26, 0.18);
    bodyPivot.rotation.y = THREE.MathUtils.lerp(bodyPivot.rotation.y, driftSlipAngle, 0.18);

    // Orejas y cabeza
    ears.forEach(e => {
      e.pivot.rotation.x = Math.sin(gaitSpeed * 1.15 + e.side) * 0.14;
    });
    headPivot.rotation.x = Math.sin(gaitSpeed) * 0.055;
    tailPivot.rotation.z = Math.sin(time * 10) * 0.4;

    if (propellerBlade) {
      propellerBlade.rotation.y = time * (8 + speed * 0.8);
    }

    // Chispas de Mini-Turbo en las patas traseras
    sparkOrbs.forEach((orb, idx) => {
      if (sparkTier > 0) {
        orb.visible = true;
        const colorHex = sparkTier === 3 ? '#e040fb' : sparkTier === 2 ? '#ff9100' : '#00d2ff';
        orb.material.color.set(colorHex);
        const pulse = (0.7 + sparkTier * 0.28) * (0.85 + Math.sin(time * 28 + idx) * 0.25);
        orb.scale.setScalar(pulse);
        orb.rotation.y += 0.25;
        orb.rotation.z += 0.18;
      } else {
        orb.visible = false;
      }
    });
  };

  return root;
}
