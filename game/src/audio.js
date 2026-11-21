// Velvet Shadow — every sound is synthesized with WebAudio, so the game
// ships no audio files and makes no network request. Soft carpet footsteps,
// a pebble clink, a gem chime, a low alarm sting and a quiet night hum.
let ctx = null;
let muted = false;
let humNodes = null;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (humNodes) humNodes.gain.gain.value = muted ? 0 : 0.035;
  return muted;
}

// Browsers only allow audio after a user gesture; call from a key or click.
export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) return;
  ctx = new AudioContext();
  startHum();
}

function startHum() {
  // A barely-there night drone: two detuned sines through a lowpass filter.
  const gain = ctx.createGain();
  gain.gain.value = muted ? 0 : 0.035;
  gain.connect(ctx.destination);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 240;
  filter.connect(gain);
  const o1 = ctx.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = 55;
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = 55.7;
  o1.connect(filter);
  o2.connect(filter);
  o1.start();
  o2.start();
  humNodes = { gain };
}

function blip(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noiseBurst(dur, vol, lowFreq) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowFreq;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
}

export function playStep(running, sneaking) {
  // A soft thud on carpet; running is a harder, louder thud.
  noiseBurst(0.07, running ? 0.22 : sneaking ? 0.05 : 0.11, running ? 900 : 500);
}

export function playPebble() {
  // A bright clink, twice, like a coin bouncing on stone.
  blip(2400, 0.09, 'triangle', 0.16, 1800);
  setTimeout(() => blip(1900, 0.12, 'triangle', 0.12, 1400), 90);
}

export function playLoot() {
  // A single bright tick when a trinket slips into Wren's pocket.
  blip(1560, 0.1, 'triangle', 0.12, 1200);
}

export function playGem() {
  // A little rising chime when the Opal is lifted.
  blip(660, 0.16, 'sine', 0.2);
  setTimeout(() => blip(990, 0.22, 'sine', 0.2), 110);
  setTimeout(() => blip(1320, 0.3, 'sine', 0.16), 230);
}

export function playSpotted() {
  // A short questioning two-note rise when a guard grows suspicious.
  blip(440, 0.14, 'square', 0.07, 520);
  setTimeout(() => blip(520, 0.18, 'square', 0.07, 620), 130);
}

export function playAlarm() {
  // A low, urgent sting when a guard gives chase.
  blip(220, 0.5, 'sawtooth', 0.12, 110);
  setTimeout(() => blip(233, 0.5, 'sawtooth', 0.1, 116), 60);
}

export function playCaught() {
  // A falling thud when the watch takes Wren.
  blip(180, 0.7, 'sawtooth', 0.14, 55);
}

export function playWin() {
  // A calm little fanfare for slipping out unseen.
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.32, 'sine', 0.18), i * 130));
}

export function playClick() {
  blip(800, 0.05, 'square', 0.05);
}
