import * as THREE from 'three';
import { createOrganicPig } from './pigModels.js';

// IA de rivales con comportamientos tácticos, rubber-banding y colisiones
export class RivalPigsManager {
  constructor(THREE, scene, track) {
    this.track = track;
    this.scene = scene;
    this.rivals = [
      { name: 'Grit', skin: '#d8a280', hat: 'Casco Vikingo', t: 0.2, speed: 0, stun: 0, laps: 0, lane: -1.8 },
      { name: 'Muddy', skin: '#756050', hat: 'Sin gorro', t: 0.5, speed: 0, stun: 0, laps: 0, lane: 0.0 },
      { name: 'Dash', skin: '#ffa5be', hat: 'Hélice Pro', t: 0.8, speed: 0, stun: 0, laps: 0, lane: 1.8 }
    ];

    this.rivals.forEach(r => {
      r.pig = createOrganicPig(THREE, { skin: r.skin, hat: r.hat });
      scene.add(r.pig);
    });
  }

  reset() {
    this.rivals.forEach((r, idx) => {
      r.t = 0.2 + idx * 0.3;
      r.speed = 0;
      r.stun = 0;
      r.laps = 0;
    });
  }

  update(dt, time, playerTotalT, playerSpeed, ccSpeedFactor = 1.0) {
    this.rivals.forEach((r, idx) => {
      if (r.stun > 0) {
        r.stun -= dt;
        r.speed = Math.max(0, r.speed - 12 * dt);
      } else {
        // Rubber-banding sutil al estilo Mario Kart Tour
        const myTotalT = r.laps * Math.PI * 2 + r.t;
        const diff = playerTotalT - myTotalT;
        const catchup = THREE.MathUtils.clamp(diff * 0.45, -2.5, 3.5);
        const baseSpeed = (14.5 + idx * 0.6 + catchup) * ccSpeedFactor;

        r.speed += (baseSpeed - r.speed) * Math.min(1, dt * 2.5);
      }

      // Avance sobre el circuito
      const angularStep = (r.speed / 24) * dt;
      r.t += angularStep;
      if (r.t >= Math.PI * 2) {
        r.t -= Math.PI * 2;
        r.laps++;
      }

      const p = this.track.getSplinePose(r.t, r.lane);
      r.pig.position.set(p.x, p.y, p.z);
      r.pig.rotation.y = -p.yaw + Math.PI / 2;
      r.pig.userData.animate(time, r.speed, false, 0);
    });
  }

  checkPigCollisions(playerX, playerZ, onBump) {
    this.rivals.forEach(r => {
      const d = Math.hypot(playerX - r.pig.position.x, playerZ - r.pig.position.z);
      if (d < 1.6) {
        // Empujón elástico mutuo
        onBump(r.pig.position.x, r.pig.position.z);
        r.speed *= 0.7;
      }
    });
  }

  getRankList(playerTotalT) {
    const list = [{ isPlayer: true, t: playerTotalT }];
    this.rivals.forEach(r => {
      list.push({ isPlayer: false, t: r.laps * Math.PI * 2 + r.t });
    });
    list.sort((a, b) => b.t - a.t);
    return list.findIndex(item => item.isPlayer) + 1;
  }
}
