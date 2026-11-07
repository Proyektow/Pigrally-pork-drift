import * as THREE from 'three';

// Sistema de objetos al estilo Mario Kart (Ruleta y proyectiles de granja)
export const ITEM_TYPES = [
  { id: 'corn_boost', name: 'Súper Maíz', icon: '🌽', desc: '¡Acelerón instantáneo!' },
  { id: 'tomato', name: 'Tomate Podrido', icon: '🍅', desc: 'Trampa trasera resbaladiza' },
  { id: 'beetle', name: 'Escarabajo Apestoso', icon: '🪲', desc: 'Proyectil teledirigido al líder' },
  { id: 'lightning', name: 'Oink Relámpago', icon: '⚡', desc: 'Encoge y frena a todos los rivales' }
];

export class ItemManager {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.traps = [];
    this.projectiles = [];
  }

  rollRandomItem() {
    return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
  }

  useItem(item, userPos, userYaw, isPlayer = true, rivals = []) {
    if (!item) return;

    if (item.id === 'corn_boost') {
      this.audio.miniTurbo(3);
      return { type: 'boost', power: 7.5, time: 2.0 };
    }

    if (item.id === 'tomato') {
      // Suelta trampa detrás
      const backX = userPos.x - Math.cos(userYaw) * 1.8;
      const backZ = userPos.z - Math.sin(userYaw) * 1.8;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#d32f2f', roughness: 0.3 })
      );
      mesh.position.set(backX, 0.3, backZ);
      this.scene.add(mesh);
      this.traps.push({ mesh, x: backX, z: backZ, time: 0 });
      this.audio.playTone(280, 0.12, 'sawtooth', 0.15, -100);
      return { type: 'trap' };
    }

    if (item.id === 'beetle') {
      // Lanza proyectil hacia adelante
      const projMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#2e7d32', emissive: '#1b5e20' })
      );
      projMesh.position.set(userPos.x, 0.5, userPos.z);
      this.scene.add(projMesh);
      this.projectiles.push({
        mesh: projMesh,
        x: userPos.x,
        z: userPos.z,
        yaw: userYaw,
        speed: 28,
        life: 4.0
      });
      this.audio.playTone(600, 0.15, 'triangle', 0.18, 300);
      return { type: 'projectile' };
    }

    if (item.id === 'lightning') {
      this.audio.playTone(180, 0.4, 'sawtooth', 0.28, 800);
      return { type: 'lightning' };
    }
  }

  update(dt, playerX, playerZ, onPlayerHit) {
    // Actualizar proyectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.x += Math.cos(p.yaw) * p.speed * dt;
      p.z += Math.sin(p.yaw) * p.speed * dt;
      p.mesh.position.set(p.x, 0.5, p.z);

      // Comprobar impacto con el jugador
      if (Math.hypot(p.x - playerX, p.z - playerZ) < 1.6) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        onPlayerHit();
        continue;
      }

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // Comprobar trampas de tomates
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const tr = this.traps[i];
      if (Math.hypot(tr.x - playerX, tr.z - playerZ) < 1.4) {
        this.scene.remove(tr.mesh);
        this.traps.splice(i, 1);
        onPlayerHit();
      }
    }
  }
}
