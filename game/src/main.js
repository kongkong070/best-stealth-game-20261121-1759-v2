// Velvet Shadow — state machine, game loop and win/lose rules.
// Screens: title → play ⇄ paused → caught / wingclear → play → win.
// The whole game state lives here so the playtest driver can inspect it
// through window.__game.
import {
  PEBBLE_FLIGHT_SECONDS,
  PEBBLE_NOISE_RADIUS,
  PEBBLES_PER_WING,
  RUN_NOISE_INTERVAL,
  RUN_NOISE_RADIUS,
} from './config.js';
import { WINGS, inPlanter, parseLevel } from './level.js';
import { alertGuardsToNoise, createGuards, updateGuards } from './guards.js';
import { createPlayer, throwPebble, updatePlayer } from './player.js';
import { SoundBank } from './audio.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = new SoundBank();
const statusEl = document.getElementById('status');

function loadWing(index) {
  const def = WINGS[index];
  const level = parseLevel(def);
  return {
    screen: 'play',
    wingIndex: index,
    level,
    player: createPlayer(level.start),
    guards: createGuards(def, level),
    pebbles: [],
    lootCollected: 0, // this wing
    totalLoot: 0, // trinkets pocketed in earlier wings
    opalTaken: false,
    time: 0,
    hint: '',
    hintTimer: 0,
    runNoiseTimer: 0,
    frozen: false,
    caughtAt: 0,
  };
}

let state = loadWing(0);
state.screen = 'title';

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function restartWing() {
  const carried = state.totalLoot;
  const idx = state.wingIndex;
  state = loadWing(idx);
  state.totalLoot = carried;
  state.screen = 'play';
  setStatus(`Wing ${idx + 1}: ${state.level.def.objective}`);
}

function nextWing() {
  const carried = state.totalLoot + state.lootCollected;
  state = loadWing(1);
  state.totalLoot = carried;
  state.screen = 'play';
  setStatus(`Wing 2: ${state.level.def.objective}`);
}

function update(dt) {
  state.time += dt;
  if (state.hintTimer > 0) {
    state.hintTimer -= dt;
    if (state.hintTimer <= 0) state.hint = '';
  }

  // A click during play tosses a pebble toward the mouse.
  if (input.clicked && state.screen === 'play') {
    const pebble = throwPebble(state.player, state.level, input.mouse);
    if (pebble) {
      state.pebbles.push(pebble);
      audio.ensure();
    }
  }

  if (state.screen !== 'play') {
    // Behind the title screen the guards keep patrolling, so the museum
    // feels alive before the heist begins. Wren is hidden from them here.
    if (state.screen === 'title') {
      state.player.hidden = true;
      updateGuards(state.guards, dt, { player: state.player, level: state.level, audio });
    }
    return;
  }

  const events = [];
  updatePlayer(state.player, dt, input, state.level, events);
  state.player.hidden = inPlanter(state.level, state.player.x, state.player.y);

  for (const e of events) {
    if (e.type === 'step') {
      audio.step(e.running, e.sneaking);
      if (e.running) {
        state.runNoiseTimer -= dt;
        if (state.runNoiseTimer <= 0) {
          state.runNoiseTimer = RUN_NOISE_INTERVAL;
          alertGuardsToNoise(state.guards, state.player.x, state.player.y, RUN_NOISE_RADIUS);
        }
      }
    }
  }

  // Pebbles fly, land with a clink, and pull nearby guards over.
  for (const p of state.pebbles) {
    p.t += dt;
    if (!p.landed && p.t >= PEBBLE_FLIGHT_SECONDS) {
      p.landed = true;
      p.ring = 0;
      audio.pebbleClink();
      alertGuardsToNoise(state.guards, p.x1, p.y1, PEBBLE_NOISE_RADIUS);
    }
    if (p.landed) p.ring = Math.min(1, (p.ring ?? 0) + dt * 1.4);
  }
  state.pebbles = state.pebbles.filter((p) => !p.landed || p.ring < 1);

  const caught = updateGuards(state.guards, dt, { player: state.player, level: state.level, audio });
  if (caught) {
    state.screen = 'caught';
    state.caughtAt = state.time;
    audio.caught();
    setStatus('Caught! Press R to try the wing again.');
    return;
  }

  // Loot: walk over a trinket to pocket it.
  for (const loot of state.level.loot) {
    if (!loot.taken && Math.hypot(loot.x - state.player.x, loot.y - state.player.y) < 22) {
      loot.taken = true;
      state.lootCollected += 1;
      audio.pickup();
    }
  }

  // The Ember Opal, in the Vault Wing.
  const opal = state.level.opal;
  if (opal && !opal.taken
    && Math.hypot(opal.x - state.player.x, opal.y - state.player.y) < 24) {
    opal.taken = true;
    state.opalTaken = true;
    audio.opal();
    setStatus('The Ember Opal is yours — reach the green exit!');
  }

  // The green exit: wing 1 leads on, wing 2 ends the heist (Opal first).
  const exit = state.level.exit;
  if (Math.hypot(exit.x - state.player.x, exit.y - state.player.y) < 22) {
    if (state.wingIndex === 0) {
      state.screen = 'wingclear';
      audio.win();
      setStatus('Wing clear! Press Enter for the Vault Wing.');
    } else if (state.opalTaken) {
      state.screen = 'win';
      audio.win();
      setStatus('The Ember Opal is yours. Press R to play again.');
    } else if (state.hintTimer <= 0) {
      state.hint = 'The Opal first — it glows red in the vault.';
      state.hintTimer = 2.5;
    }
  }
}

function handleKeys() {
  const pressed = input.pressed;
  if (pressed.has('Enter')) {
    audio.unlock();
    audio.click();
    if (state.screen === 'title') {
      state.screen = 'play';
      setStatus(state.level.def.objective);
    } else if (state.screen === 'wingclear') {
      nextWing();
    }
  }
  if (pressed.has('KeyR')) {
    audio.unlock();
    if (state.screen === 'caught' || state.screen === 'win') restartWing();
  }
  if (pressed.has('KeyP') || pressed.has('Escape')) {
    if (state.screen === 'play') {
      state.screen = 'paused';
      setStatus('Paused.');
    } else if (state.screen === 'paused') {
      state.screen = 'play';
    }
  }
  if (pressed.has('KeyM')) {
    const muted = audio.toggleMute();
    setStatus(muted ? 'Muted.' : 'Sound on.');
  }
  if (pressed.has('KeyW') || pressed.has('KeyA') || pressed.has('KeyS') || pressed.has('KeyD')
    || pressed.has('ArrowUp') || pressed.has('ArrowDown')
    || pressed.has('ArrowLeft') || pressed.has('ArrowRight')) {
    audio.unlock();
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handleKeys();
  if (!state.frozen) update(dt);
  render(ctx, state, state.time);
  input.endFrame();
  requestAnimationFrame(frame);
}

// Staged screenshot scenes (?shot=start|play|hide|win, ?wing=1|2) freeze
// the simulation so the capture is stable; the game plays normally without
// them. A wing-2 scene loads wing 2 first.
const params = new URLSearchParams(window.location.search);
const wingParam = Number(params.get('wing') || '1');
if (params.get('shot') === 'win' || wingParam === 2) {
  state = loadWing(1);
  state.screen = 'title';
}
applyShot(state, params);

setStatus('Velvet Shadow — press Enter to begin the heist.');
requestAnimationFrame(frame);

// The playtest driver reads and drives the game through this handle.
window.__game = {
  get state() { return state; },
  restartWing,
  loadWing,
  audio,
  input,
};
