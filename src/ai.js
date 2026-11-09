import * as THREE from 'three';
import { buildPigRacer } from './pigModels.js';

const RIVAL_PROFILES = [
  {
    name: 'Baconator',
    skin: '#f4a27e',
    snout: '#d96b43',
    ear: '#e08358',
    hat: 'Casco Vikingo',
    baseLane: -2.0,
    skill: 0.97
  },
  {
    name: 'Lola Trufa',
    skin: '#d7a1f9',
    snout: '#ab51e3',
    ear: '#c07be8',
    hat: 'Corona Real',
    baseLane: 0.0,
    skill: 1.01
  },
  {
    name: 'Capitán Jamón',
    skin: '#8fd694',
    snout: '#4ca853',
    ear: '#6ec274',
    hat: 'Gafas Aviador',
    baseLane: 2.0,
    skill: 1.04
  }
];

export class RivalsController {
  constructor(scene, circuit) {
    this.scene = scene;
    this.circuit = circuit;
    this.rivals = RIVAL_PROFILES.map((prof, idx) => {
      const mesh = buildPigRacer(prof);
      scene.add(mesh);
      return {
        ...prof,
        mesh,
        t: 0.015 * (idx + 1),
        laps: 0,
        speed: 0,
        lane: prof.baseLane,
        spinTimer: 0,
        shrinkTimer: 0,
        pos: new THREE.Vector3(),
        yaw: 0
      };
    });
  }

  resetForRace() {
    this.rivals.forEach((r, idx) => {
      r.t = 0.014 * (idx + 1);
      r.laps = 0;
      r.speed = 0;
      r.lane = r.baseLane;
      r.spinTimer = 0;
      r.shrinkTimer = 0;
      const f = this.circuit.getPointFrame(r.t, r.lane);
      r.pos.copy(f.pos);
      r.yaw = f.yaw;
      r.mesh.position.copy(r.pos);
      r.mesh.rotation.y = r.yaw;
    });
  }

  setVisible(vis) {
    this.rivals.forEach(r => { r.mesh.visible = vis; });
  }

  update(dt, time, playerProgress, ccMultiplier) {
    const trackLenApprox = 185;

    this.rivals.forEach((r, idx) => {
      if (r.shrinkTimer > 0) r.shrinkTimer -= dt;

      if (r.spinTimer > 0) {
        r.spinTimer -= dt;
        r.speed = Math.max(2, r.speed - 22 * dt);
      } else {
        const myProgress = r.laps + r.t;
        const gap = playerProgress - myProgress;
        // Rubber-banding equilibrado
        const rubberBoost = THREE.MathUtils.clamp(gap * 4.5, -2.2, 3.4);
        const shrinkPenalty = r.shrinkTimer > 0 ? 0.68 : 1.0;
        const targetSpeed = (16.2 * r.skill + rubberBoost) * ccMultiplier * shrinkPenalty;
        r.speed += (targetSpeed - r.speed) * Math.min(1, dt * 3.0);
      }

      const prevT = r.t;
      r.t = (r.t + (r.speed * dt) / trackLenApprox) % 1;
      if (prevT > 0.85 && r.t < 0.15) {
        r.laps += 1;
      }

      const dynamicLane = r.baseLane + Math.sin(time * 0.9 + idx * 2.1) * 1.1;
      const frame = this.circuit.getPointFrame(r.t, dynamicLane);
      r.pos.copy(frame.pos);
      r.yaw = frame.yaw;

      r.mesh.position.copy(r.pos);
      r.mesh.rotation.y = r.spinTimer > 0 ? r.yaw + time * 14 : r.yaw;
      r.mesh.userData.updateAnimation(time, r.speed, 0, 0, 0, r.shrinkTimer > 0);
    });
  }

  resolveCollisions(playerState, onBumpCallback) {
    this.rivals.forEach(r => {
      const dx = playerState.x - r.pos.x;
      const dz = playerState.z - r.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.55 && dist > 0.001) {
        const nx = dx / dist;
        const nz = dz / dist;
        const push = (1.55 - dist) * 0.85;
        playerState.x += nx * push;
        playerState.z += nz * push;
        r.speed *= 0.86;
        onBumpCallback();
      }
    });
  }
}
