import * as THREE from 'three';

export const ITEMS_POOL = [
  { id: 'corn', icon: '🌽', name: 'SÚPER MAÍZ' },
  { id: 'tomato', icon: '🍅', name: 'TOMATE TRAMPA' },
  { id: 'beetle', icon: '🪲', name: 'ESCARABAJO GUÍA' },
  { id: 'lightning', icon: '⚡', name: 'RELÁMPAGO OINK' }
];

export class ItemSystem {
  constructor(scene, sound) {
    this.scene = scene;
    this.sound = sound;
    this.hazards = [];
    this.beetles = [];

    this.tomatoMat = new THREE.MeshStandardMaterial({ color: '#e53935', roughness: 0.25 });
    this.beetleMat = new THREE.MeshStandardMaterial({
      color: '#00e676',
      emissive: '#00a152',
      emissiveIntensity: 0.4,
      roughness: 0.3
    });
  }

  pickRandomItem(playerRank = 1) {
    // Ponderación estilo Mario Kart según posición
    if (playerRank === 1) {
      const frontPool = [ITEMS_POOL[0], ITEMS_POOL[1], ITEMS_POOL[1]];
      return frontPool[Math.floor(Math.random() * frontPool.length)];
    }
    return ITEMS_POOL[Math.floor(Math.random() * ITEMS_POOL.length)];
  }

  activateItem(item, racerState, rivalsList) {
    if (!item) return null;

    if (item.id === 'corn') {
      this.sound.playMiniTurboRelease(3);
      return { type: 'boost', duration: 2.1, bonusSpeed: 7.5, banner: '🌽 ¡IMPULSO DE SÚPER MAÍZ!' };
    }

    if (item.id === 'tomato') {
      const dropPos = new THREE.Vector3(
        racerState.x - Math.sin(racerState.yaw) * 2.1,
        racerState.y + 0.08,
        racerState.z - Math.cos(racerState.yaw) * 2.1
      );
      const splat = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.14, 12), this.tomatoMat);
      splat.position.copy(dropPos);
      this.scene.add(splat);

      this.hazards.push({ mesh: splat, pos: dropPos, life: 18.0 });
      this.sound.playOink(0.85);
      return { type: 'trap', banner: '🍅 ¡TOMATE TRAMPA LANZADO!' };
    }

    if (item.id === 'beetle') {
      const startPos = new THREE.Vector3(
        racerState.x + Math.sin(racerState.yaw) * 1.9,
        racerState.y + 0.5,
        racerState.z + Math.cos(racerState.yaw) * 1.9
      );
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), this.beetleMat);
      mesh.position.copy(startPos);
      this.scene.add(mesh);

      this.beetles.push({
        mesh,
        pos: startPos,
        yaw: racerState.yaw,
        speed: 27.0,
        life: 5.0
      });
      this.sound.playMiniTurboRelease(2);
      return { type: 'projectile', banner: '🪲 ¡ESCARABAJO TELEDIGIRIDO!' };
    }

    if (item.id === 'lightning') {
      this.sound.playLightningThunder();
      rivalsList.forEach(r => {
        r.spinTimer = 1.6;
        r.shrinkTimer = 5.5;
      });
      return { type: 'lightning', banner: '⚡ ¡RELÁMPAGO OINK! RIVALES ENCOGIDOS' };
    }

    return null;
  }

  update(dt, playerPos, rivalsList, onPlayerSpin) {
    // Actualizar trampas de tomate
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.life -= dt;

      // Comprobar impacto con rivales
      let consumed = false;
      for (const r of rivalsList) {
        if (Math.hypot(r.pos.x - h.pos.x, r.pos.z - h.pos.z) < 1.35 && r.spinTimer <= 0) {
          r.spinTimer = 1.4;
          this.sound.playBump();
          consumed = true;
          break;
        }
      }

      // Comprobar impacto con jugador
      if (!consumed && Math.hypot(playerPos.x - h.pos.x, playerPos.z - h.pos.z) < 1.25) {
        onPlayerSpin();
        consumed = true;
      }

      if (consumed || h.life <= 0) {
        this.scene.remove(h.mesh);
        this.hazards.splice(i, 1);
      }
    }

    // Actualizar proyectiles escarabajo (buscan al rival más cercano)
    for (let i = this.beetles.length - 1; i >= 0; i--) {
      const b = this.beetles[i];
      b.life -= dt;

      // Buscar objetivo rival más próximo
      let nearest = null;
      let bestDist = 26;
      for (const r of rivalsList) {
        const d = Math.hypot(r.pos.x - b.pos.x, r.pos.z - b.pos.z);
        if (d < bestDist) {
          bestDist = d;
          nearest = r;
        }
      }

      if (nearest) {
        const targetYaw = Math.atan2(nearest.pos.x - b.pos.x, nearest.pos.z - b.pos.z);
        b.yaw = targetYaw;
      }

      b.pos.x += Math.sin(b.yaw) * b.speed * dt;
      b.pos.z += Math.cos(b.yaw) * b.speed * dt;
      b.mesh.position.set(b.pos.x, b.pos.y, b.pos.z);

      let hit = false;
      for (const r of rivalsList) {
        if (Math.hypot(r.pos.x - b.pos.x, r.pos.z - b.pos.z) < 1.45) {
          r.spinTimer = 1.7;
          this.sound.playBump();
          hit = true;
          break;
        }
      }

      if (hit || b.life <= 0) {
        this.scene.remove(b.mesh);
        this.beetles.splice(i, 1);
      }
    }
  }

  clearAll() {
    this.hazards.forEach(h => this.scene.remove(h.mesh));
    this.beetles.forEach(b => this.scene.remove(b.mesh));
    this.hazards = [];
    this.beetles = [];
  }
}
