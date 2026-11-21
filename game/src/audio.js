// Velvet Shadow — every sound is synthesized with WebAudio. No audio files.
// The context is created on the first user gesture, so the game stays silent
// (and error-free) until the player interacts.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ambientStarted = false;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  unlock() {
    this.ensure();
    this.startAmbient();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, type, gain, when = 0, slideTo = null) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noiseBurst(dur, gain, filterFreq) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(t0);
  }

  step(running, sneaking) {
    if (sneaking) return; // a good sneak makes no sound at all
    this.noiseBurst(0.05, running ? 0.16 : 0.07, running ? 900 : 500);
  }

  pebbleClink() {
    this.tone(2093, 0.16, 'sine', 0.14);
    this.tone(1568, 0.22, 'sine', 0.1, 0.03);
    this.noiseBurst(0.06, 0.08, 4000);
  }

  pickup() {
    this.tone(880, 0.12, 'sine', 0.12);
    this.tone(1318, 0.18, 'sine', 0.12, 0.07);
  }

  opal() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.14, i * 0.09));
  }

  suspicious() {
    this.tone(330, 0.14, 'square', 0.05);
    this.tone(392, 0.2, 'square', 0.05, 0.12);
  }

  alert() {
    this.tone(220, 0.22, 'sawtooth', 0.1, 0, 440);
    this.tone(440, 0.3, 'sawtooth', 0.1, 0.16, 660);
  }

  caught() {
    this.tone(196, 0.5, 'sawtooth', 0.12, 0, 98);
    this.tone(147, 0.7, 'sawtooth', 0.1, 0.1, 73);
  }

  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.13, i * 0.11));
  }

  click() {
    this.tone(660, 0.06, 'sine', 0.08);
  }

  // A very quiet looping wind: filtered noise that breathes slowly.
  startAmbient() {
    if (this.ambientStarted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.ambientStarted = true;
    const len = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brown-ish noise
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const g = ctx.createGain();
    g.gain.value = 0.035;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain).connect(g.gain);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start();
    lfo.start();
  }
}
