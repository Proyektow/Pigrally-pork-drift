// Motor de Audio Procedimental Sintetizado con Web Audio API (Música + Efectos)
export class AudioController {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.bgmInterval = null;
    this.step = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.28;
    this.master.connect(this.ctx.destination);
  }

  wake() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(state) {
    this.muted = state;
    if (this.master) {
      this.master.gain.setValueAtTime(this.muted ? 0 : 0.28, this.ctx.currentTime);
    }
  }

  playTone(freq, dur = 0.1, type = 'sine', gainVal = 0.15, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide !== 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    }

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gainVal, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  }

  // Galope rítmico de pezuñas
  hoofBeat(speed) {
    if (!this.ctx || this.muted || speed < 0.5) return;
    const p = 80 + Math.min(speed, 25) * 6;
    this.playTone(p, 0.035, 'triangle', 0.06, -20);
  }

  // Sonido de Derrape continuo
  skidSound() {
    if (!this.ctx || this.muted) return;
    this.playTone(160 + Math.random() * 50, 0.06, 'sawtooth', 0.035, -40);
  }

  // Sonido de Ruleta de Objetos
  rouletteTick() {
    this.playTone(550, 0.04, 'square', 0.08, 120);
  }

  // Obtener Objeto Definitivo
  itemReady() {
    [523, 659, 783, 1046].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.1, 'triangle', 0.18, 30), i * 50);
    });
  }

  // Mini-Turbos por niveles
  miniTurbo(tier) {
    this.wake();
    const pitches = tier === 1 ? [380, 560] : tier === 2 ? [480, 750] : [620, 1100];
    pitches.forEach((p, idx) => {
      setTimeout(() => this.playTone(p, 0.16, 'sawtooth', 0.16, 200), idx * 60);
    });
  }

  // Oink y Colisiones
  oink(pitch = 1) {
    this.wake();
    this.playTone(390 * pitch, 0.2, 'sawtooth', 0.22, -220);
    setTimeout(() => this.playTone(250 * pitch, 0.15, 'triangle', 0.16, -90), 80);
  }

  bump() {
    this.wake();
    this.playTone(140, 0.18, 'sawtooth', 0.26, -60);
  }

  // Música procedural estilo Country-Arcade (Ragtime / Tour Theme)
  startMusic() {
    this.wake();
    if (this.bgmInterval) return;
    this.step = 0;

    const melody = [
      392, 440, 493, 587,  523, 440, 392, 329,
      392, 523, 587, 659,  587, 523, 440, 392,
      659, 587, 523, 440,  493, 440, 392, 329,
      349, 392, 440, 493,  523, 587, 659, 783
    ];
    const bass = [130, 196, 164, 196];

    this.bgmInterval = setInterval(() => {
      if (this.muted) return;
      // Bajo
      if (this.step % 2 === 0) {
        const b = bass[(this.step / 2) % bass.length];
        this.playTone(b, 0.14, 'sine', 0.12, -20);
      }
      // Melodía
      const m = melody[this.step % melody.length];
      if (m) {
        this.playTone(m, 0.08, 'triangle', 0.07, 0);
      }
      this.step++;
    }, 135);
  }

  stopMusic() {
    clearInterval(this.bgmInterval);
    this.bgmInterval = null;
  }
}
