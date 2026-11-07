import * as THREE from 'three';

// Generador procedural de cerdos orgánicos, sombreros y accesorios con Three.js
export function createOrganicPig(THREE, options = {}) {
  const root = new THREE.Group();
  const skinColor = options.skin || '#ff9cb3';
  const hatType = options.hat || 'Sin gorro';

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.55,
    metalness: 0.05,
    flatShading: true
  });
  const pinkMat = new THREE.MeshStandardMaterial({ color: '#ff6987', roughness: 0.7, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#382215', roughness: 0.8 });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#f6c44e', metalness: 0.6, roughness: 0.3 });

  // 1. CUERPO
  const bodyGeo = new THREE.SphereGeometry(0.85, 14, 12);
  bodyGeo.scale(1.0, 0.85, 1.35);
  const bodyMesh = new THREE.Mesh(bodyGeo, skinMat);
  bodyMesh.position.y = 0.9;
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // Vientre rechoncho
  const bellyGeo = new THREE.SphereGeometry(0.65, 10, 8);
  bellyGeo.scale(0.88, 0.45, 0.95);
  const bellyMesh = new THREE.Mesh(bellyGeo, pinkMat);
  bellyMesh.position.set(0, 0.68, 0.15);
  root.add(bellyMesh);

  // 2. CABEZA
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.25, 0.75);
  root.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.62, 14, 12);
  headGeo.scale(1.0, 0.9, 0.95);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Hocico respingón
  const snoutGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.2, 14);
  const snoutMesh = new THREE.Mesh(snoutGeo, pinkMat);
  snoutMesh.rotation.x = Math.PI / 2;
  snoutMesh.position.set(0, -0.08, 0.58);
  headGroup.add(snoutMesh);

  for (let s of [-0.08, 0.08]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), darkMat);
    nostril.position.set(s, -0.08, 0.69);
    headGroup.add(nostril);
  }

  // Ojos estilo Nintendo
  for (let s of [-0.26, 0.26]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), eyeWhiteMat);
    eye.position.set(s, 0.16, 0.46);
    headGroup.add(eye);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), darkMat);
    pupil.position.set(s, 0.16, 0.55);
    headGroup.add(pupil);
  }

  // Orejas
  const ears = [];
  for (let s of [-1, 1]) {
    const earPivot = new THREE.Group();
    earPivot.position.set(s * 0.42, 0.38, 0.05);
    earPivot.rotation.z = s * -0.32;
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.46, 6), pinkMat);
    ear.rotation.x = -0.3;
    ear.position.y = 0.18;
    earPivot.add(ear);
    headGroup.add(earPivot);
    ears.push({ pivot: earPivot, side: s });
  }

  // 3. PATAS CUADRÚPEDAS
  const legs = [];
  const coords = [
    [-0.44, 0.55, 0.6],
    [0.44, 0.55, 0.6],
    [-0.46, 0.55, -0.6],
    [0.46, 0.55, -0.6]
  ];

  coords.forEach(([x, y, z], i) => {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.42, 7), skinMat);
    upper.position.y = -0.18;
    upper.castShadow = true;
    p.add(upper);

    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.22), darkMat);
    hoof.position.set(0, -0.42, 0.02);
    hoof.castShadow = true;
    p.add(hoof);

    root.add(p);
    legs.push({ pivot: p, index: i });
  });

  // 4. RABO EN ESPIRAL
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.05, -1.1);
  const tailMesh = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 12, Math.PI * 1.8), skinMat);
  tailPivot.add(tailMesh);
  root.add(tailPivot);

  // 5. SOMBREROS
  let propMesh = null;
  if (hatType === 'Hélice Pro') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: '#e53935' }));
    cap.position.set(0, 0.48, 0.02);
    headGroup.add(cap);

    propMesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.1), goldMat);
    propMesh.position.set(0, 0.72, 0.02);
    headGroup.add(propMesh);
  } else if (hatType === 'Casco Vikingo') {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.44, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: '#78909c' }));
    helm.position.set(0, 0.44, 0);
    headGroup.add(helm);
    for (let s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.48, 6), new THREE.MeshStandardMaterial({ color: '#fff9c4' }));
      horn.position.set(s * 0.42, 0.62, 0);
      horn.rotation.z = -s * 0.45;
      headGroup.add(horn);
    }
  } else if (hatType === 'Corona Real') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.25, 6), goldMat);
    crown.position.set(0, 0.52, 0);
    headGroup.add(crown);
  }

  // Control de animación
  root.userData.animate = (time, speed, isDrifting, steerAngle) => {
    const moving = speed > 0.4;
    const gait = time * (6 + Math.min(speed, 25) * 1.5);

    legs.forEach(leg => {
      const offset = (leg.index === 0 || leg.index === 3) ? 0 : Math.PI;
      leg.pivot.rotation.x = moving ? Math.sin(gait + offset) * (0.32 + Math.min(speed, 20) * 0.02) : 0;
    });

    // Inclinación por fuerza centrífuga
    root.rotation.z = -steerAngle * 0.18;
    root.rotation.y = isDrifting ? steerAngle * 0.55 : 0;

    ears.forEach(e => {
      e.pivot.rotation.x = Math.sin(gait * 1.3) * 0.12;
    });

    tailPivot.rotation.z = Math.sin(time * 9) * 0.35;
    if (propMesh) propMesh.rotation.y = time * 12;
  };

  return root;
}
