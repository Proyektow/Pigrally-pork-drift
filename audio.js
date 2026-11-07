export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.bgmPlaying = false;
    this.step = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.28;
    this.master.connect(this.ctx.destination);
  }

  wake() {
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  // Reproductor de tonos individuales con envolvente
  playTone(freq, dur = 0.1, type = 'triangle', gainVal = 0.2, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide !== 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    }

    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(gainVal, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Galope de pezuñas sobre barro/césped
  playHoof(speed) {
    if (!this.ctx || this.muted) return;
    const pitch = 95 + Math.min(speed, 20) * 8;
    this.playTone(pitch, 0.04, 'triangle', 0.08, -30);
  }

  // Mini-Turbo escalonado de derrape
  playMiniTurbo(tier = 1) {
    this.wake();
    const freqs = tier === 1 ? [350, 520] : tier === 2 ? [450, 720] : [600, 950];
    freqs.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.18, 'sawtooth', 0.14, 180), i * 60);
    });
  }

  // Gruñido / Oink simpático al chocar o acelerar
  oink(pitchMod = 1) {
    this.wake();
    this.playTone(380 * pitchMod, 0.18, 'sawtooth', 0.22, -180);
    setTimeout(() => this.playTone(240 * pitchMod, 0.14, 'triangle', 0.18, -80), 90);
  }

  // Recoger maíz dorado
  pickupCorn() {
    this.wake();
    [587, 880, 1174].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.12, 'sine', 0.15, 60), i * 50);
    });
  }

  // Música temática Country / Arcade procedimental en loop
  startBGM() {
    this.wake();
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.step = 0;

    // Escala pentatónica campestre (C - D - E - G - A)
    const melody = [261, 329, 392, 440, 523, 392, 329, 293, 261, 329, 392, 523, 587, 523, 392, 329];
    const bass = [130, 196, 130, 196];

    const beatInterval = 140; // ms (Tempo enérgico)
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.bgmPlaying) return;

      // Línea de bajo continuo rítmico
      if (this.step % 2 === 0) {
        const bFreq = bass[(this.step / 2) % bass.length];
        this.playTone(bFreq, 0.12, 'sine', 0.09, -20);
      }

      // Melodía alegre tipo organillo campestre
      const mFreq = melody[this.step % melody.length];
      if (mFreq) {
        this.playTone(mFreq, 0.08, 'triangle', 0.07, 0);
      }

      this.step++;
    }, beatInterval);
  }

  stopBGM() {
    this.bgmPlaying = false;
    clearInterval(this.musicTimer);
  }
}
