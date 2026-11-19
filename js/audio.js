export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.hoofTimer = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  _tone(freq, dur, type = 'triangle', vol = 0.14, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  playOink(pitch = 1.0) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(240 * pitch, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(115 * pitch, now + 0.2);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(620 * pitch, now);
    filter.Q.value = 3.2;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  playCoin() {
    this._tone(988, 0.08, 'sine', 0.13, 0);
    this._tone(1319, 0.16, 'sine', 0.13, 0.06);
  }

  playRingBoost() {
    this._tone(587, 0.1, 'triangle', 0.15, 0);
    this._tone(880, 0.12, 'triangle', 0.15, 0.06);
    this._tone(1175, 0.2, 'triangle', 0.15, 0.12);
  }

  playFinalLap() {
    this._tone(523, 0.12, 'square', 0.1, 0);
    this._tone(659, 0.12, 'square', 0.1, 0.11);
    this._tone(784, 0.12, 'square', 0.1, 0.22);
    this._tone(1046, 0.3, 'square', 0.11, 0.33);
  }

  playRespawn() {
    this._tone(330, 0.14, 'sine', 0.14, 0);
    this._tone(440, 0.14, 'sine', 0.14, 0.15);
    this._tone(554, 0.2, 'sine', 0.14, 0.3);
  }

  playJump() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.25);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  playHit() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.26);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playBeep(high = false) {
    this._tone(high ? 880 : 440, high ? 0.3 : 0.16, 'triangle', 0.14, 0);
  }

  playHoofStep(intensity = 0.5, onMud = false) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.042;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = onMud ? 320 : 620;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.055 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.042);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  updateGallop(dt, speedRatio, onMud, airborne) {
    if (speedRatio < 0.08 || airborne) return;
    const interval = Math.max(0.08, 0.25 - speedRatio * 0.16);
    this.hoofTimer += dt;
    if (this.hoofTimer >= interval) {
      this.hoofTimer = 0;
      this.playHoofStep(0.35 + speedRatio * 0.55, onMud);
    }
  }
}
