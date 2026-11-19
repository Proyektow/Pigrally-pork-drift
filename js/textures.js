import * as THREE from 'three';

function makeCanvas(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d') };
}

function addNoise(ctx, size, intensity = 15) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * intensity * 2;
    d[i] = Math.min(255, Math.max(0, d[i] + n));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

export function createDirtRoadTextures(baseColor = '#6e4c2e', rutColor = '#4a311b', isRainbow = false) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size);

  if (isRainbow) {
    // Textura estilo Senda Arcoíris de Granja Estelar
    const grad = ctx.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0.0, '#ff4d6d');
    grad.addColorStop(0.2, '#ffb703');
    grad.addColorStop(0.4, '#38b86b');
    grad.addColorStop(0.6, '#00b4d8');
    grad.addColorStop(0.8, '#7209b7');
    grad.addColorStop(1.0, '#ff4d6d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.lineWidth = 4;
    for (let y = 0; y < size; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(0, 0, 14, size);
    ctx.fillRect(size - 14, 0, 14, size);
  } else {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = rutColor;
    ctx.globalAlpha = 0.34;
    ctx.fillRect(size * 0.16, 0, size * 0.18, size);
    ctx.fillRect(size * 0.66, 0, size * 0.18, size);
    ctx.globalAlpha = 1;

    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,230,200,0.16)' : 'rgba(30,18,8,0.25)';
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Arcenes claros tipo rally para ver mejor las curvas
    ctx.fillStyle = 'rgba(245, 236, 215, 0.35)';
    ctx.fillRect(size * 0.04, 0, size * 0.025, size);
    ctx.fillRect(size * 0.935, 0, size * 0.025, size);
    addNoise(ctx, size, 15);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  return { map, bumpMap };
}

export function createGliderRampTexture() {
  const { canvas, ctx } = makeCanvas(256);
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#00b4ff');
  grad.addColorStop(1, '#0055cc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Flechas azules/blancas icónicas de rampa de planeo MK8
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 18;
  for (let y = 55; y <= 215; y += 75) {
    ctx.beginPath();
    ctx.moveTo(48, y + 36);
    ctx.lineTo(128, y - 18);
    ctx.lineTo(208, y + 36);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGrassTexture(c1 = '#4b7a32', c2 = '#396124') {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2800; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    ctx.strokeStyle = Math.random() > 0.45 ? c2 : '#679944';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, y - (4 + Math.random() * 8));
    ctx.stroke();
  }
  addNoise(ctx, size, 11);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(80, 80);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWoodTexture(base = '#7a4b2a') {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 32) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, y, size, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createItemBoxTexture(isDouble = false) {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  const grad = ctx.createLinearGradient(0, 0, size, size);
  if (isDouble) {
    grad.addColorStop(0, '#ff4081');
    grad.addColorStop(0.5, '#ff9100');
    grad.addColorStop(1, '#7c4dff');
  } else {
    grad.addColorStop(0, '#ffd54f');
    grad.addColorStop(0.5, '#ff8f00');
    grad.addColorStop(1, '#00c853');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, size - 20, size - 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = isDouble ? '900 120px sans-serif' : '900 155px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isDouble ? '??' : '?', size / 2, size / 2 + 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPigSkinTexture(baseHex, spotHex = null, tattooId = 'tat_none') {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  if (spotHex) {
    ctx.fillStyle = spotHex;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * size, Math.random() * size,
        24 + Math.random() * 48, 18 + Math.random() * 36,
        Math.random() * Math.PI, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }

  if (tattooId === 'tat_stripes') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(size * 0.42, 0, size * 0.055, size);
    ctx.fillRect(size * 0.525, 0, size * 0.055, size);
  } else if (tattooId === 'tat_flames') {
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#ffdd00');
    grad.addColorStop(0.5, '#ff5500');
    grad.addColorStop(1, 'rgba(200,0,0,0)');
    ctx.fillStyle = grad;
    for (let i = 0; i < 10; i++) {
      const x = (i / 10) * size;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 28, 220 + (i % 2) * 80);
      ctx.lineTo(x + 54, 0);
      ctx.fill();
    }
  } else if (tattooId === 'tat_bolts') {
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 10;
    for (let i = 0; i < 5; i++) {
      const x = 50 + i * 95;
      ctx.beginPath();
      ctx.moveTo(x, 40); ctx.lineTo(x - 25, 190); ctx.lineTo(x + 15, 200); ctx.lineTo(x - 15, 390);
      ctx.stroke();
    }
  } else if (tattooId === 'tat_mudking') {
    ctx.strokeStyle = '#221810';
    ctx.lineWidth = 12;
    for (let y = 70; y < size; y += 90) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.quadraticCurveTo(size / 2, y - 40, size - 20, y);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 2800; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(40,20,15,0.11)';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + (Math.random() - 0.5) * 2); ctx.stroke();
  }
  addNoise(ctx, size, 9);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, bumpMap: map };
}
