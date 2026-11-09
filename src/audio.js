export class SoundSystem {
  constructor(initiallyMuted = false) {
    this.ctx = null;
    this.master = null;
    this.muted = initiallyMuted;
    this.bgmTimer = null;
    this.stepIndex = 0;
    this.lastHoofTime = 0;
    this.lastSkidTime = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.26;
    this.master.connect(this.ctx.destination);
  }

  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muteState) {
    this.muted = muteState;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.26, this.ctx.currentTime, 0.03);
    }
  }

  tone(freq, duration = 0.1, type = 'triangle', volume = 0.18, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(24, freq), now);
    if (slideTo > 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(24, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.master);

    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  playClick() {
    this.unlock();
    this.tone(580, 0.06, 'triangle', 0.14, 820);
  }

  playCountdownBeep(isFinal = false) {
    this.unlock();
    if (isFinal) {
      this.tone(880, 0.35, 'sawtooth', 0.24, 1180);
      setTimeout(() => this.playOink(1.25), 90);
    } else {
      this.tone(440, 0.16, 'sine', 0.2);
    }
  }

  playHoofStep(speed) {
    if (!this.ctx || this.muted || speed < 1.5) return;
    const now = this.ctx.currentTime;
    const interval = Math.max(0.085, 0.26 - speed * 0.007);
    if (now - this.lastHoofTime >= interval) {
      this.lastHoofTime = now;
      const pitch = 95 + Math.min(speed, 26) * 5 + (Math.random() * 18 - 9);
      this.tone(pitch, 0.04, 'triangle', 0.07, pitch * 0.72);
    }
  }

  playDriftSpark(tier = 0) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastSkidTime < 0.075) return;
    this.lastSkidTime = now;
    const baseFreq = tier === 3 ? 640 : tier === 2 ? 460 : tier === 1 ? 330 : 210;
    this.tone(baseFreq + Math.random() * 45, 0.055, 'sawtooth', 0.045, baseFreq * 0.85);
  }

  playMiniTurboRelease(tier = 1) {
    this.unlock();
    const chords = tier === 3
      ? [523, 659, 783, 1046]
      : tier === 2
      ? [440, 554, 659]
      : [349, 440, 523];

    chords.forEach((f, idx) => {
      setTimeout(() => {
        this.tone(f, 0.16, 'sawtooth', 0.16, f * 1.35);
      }, idx * 45);
    });
  }

  playOink(pitchScale = 1) {
    this.unlock();
    this.tone(360 * pitchScale, 0.16, 'sawtooth', 0.2, 180 * pitchScale);
    setTimeout(() => {
      this.tone(250 * pitchScale, 0.14, 'triangle', 0.16, 140 * pitchScale);
    }, 85);
  }

  playBump() {
    this.unlock();
    this.tone(145, 0.18, 'sawtooth', 0.26, 55);
    this.playOink(0.92);
  }

  playCoin() {
    this.unlock();
    this.tone(987, 0.07, 'sine', 0.14, 1318);
  }

  playRouletteTick() {
    this.tone(620 + Math.random() * 160, 0.035, 'square', 0.075);
  }

  playItemLocked() {
    [523, 659, 784, 1046].forEach((n, i) => {
      setTimeout(() => this.tone(n, 0.09, 'triangle', 0.16), i * 45);
    });
  }

  playLightningThunder() {
    this.unlock();
    this.tone(920, 0.42, 'sawtooth', 0.28, 90);
    setTimeout(() => this.tone(420, 0.35, 'square', 0.22, 65), 110);
  }

  playFanfare(win = true) {
    this.unlock();
    const notes = win
      ? [523, 659, 784, 1046, 784, 1046]
      : [392, 440, 493, 523];
    notes.forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.22, 'triangle', 0.2, f * 1.04), i * 130);
    });
  }

  startMusic() {
    this.unlock();
    if (this.bgmTimer) return;
    this.stepIndex = 0;

    // Melodía alegre estilo Banjo / Kart Arcade
    const leadNotes = [
      523, 659, 784, 659, 880, 784, 659, 523,
      587, 698, 880, 698, 784, 659, 587, 493,
      523, 659, 784, 1046, 880, 784, 659, 523,
      587, 659, 698, 784, 880, 987, 1046, 0
    ];
    const bassNotes = [130, 196, 146, 196, 130, 196, 164, 196];

    this.bgmTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const step = this.stepIndex;

      if (step % 2 === 0) {
        const b = bassNotes[(step / 2) % bassNotes.length];
        this.tone(b, 0.12, 'triangle', 0.09, b * 0.9);
      }

      const lead = leadNotes[step % leadNotes.length];
      if (lead > 0) {
        this.tone(lead, 0.085, 'sine', 0.065, lead * 1.01);
      }

      this.stepIndex++;
    }, 135);
  }

  stopMusic() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}
