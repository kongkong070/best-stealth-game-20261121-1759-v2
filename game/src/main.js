// Velvet Shadow — the game itself: state machine, main loop, win and lose
// rules, and the deterministic staging the screenshots use (?shot=start,
// ?shot=play, ?shot=alert, ?shot=win). The game is Wren, a cat burglar,
// stealing the Ember Opal from a moonlit museum and slipping out unseen.
import { TILE, VIEW_W, VIEW_H } from './config.js';
import { LEVELS, parseLevel } from './level.js';
import { makeGuard, updateGuard, GUARD_STATE } from './guards.js';
import { makePlayer, movePlayer, tossPebble, updatePebble, refreshHidden } from './player.js';
import { makeInput } from './input.js';
import {
  renderWorld,
  renderHud,
  renderMenu,
  renderPaused,
  renderLevelComplete,
  renderWin,
  renderLose,
} from './render.js';
import {
  ensureAudio,
  playStep,
  playPebble,
  playLoot,
  playGem,
  playSpotted,
  playAlarm,
  playCaught,
  playWin,
  playClick,
  toggleMute,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const SCREEN = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL_COMPLETE: 'level-complete',
  WIN: 'win',
  LOSE: 'lose',
};

const game = {
  screen: SCREEN.MENU,
  levelIndex: 0,
  level: parseLevel(LEVELS[0]),
  player: null,
  guards: [],
  rings: [], // expanding noise rings from loud steps and pebbles
  elapsed: 0,
  totalElapsed: 0,
  detections: 0, // times a guard reached full alert
  loot: 0, // trinkets pocketed across both wings
  lootTotal: LEVELS.reduce((n, level) => n + level.loot.length, 0),
  lootTaken: new Set(), // "levelIndex:x,y" keys, so a trinket is taken once
  time: 0,
};

const input = makeInput(canvas);

function loadLevel(index) {
  game.levelIndex = index;
  game.level = parseLevel(LEVELS[index]);
  game.player = makePlayer(game.level.start);
  game.guards = game.level.patrols.map((patrol, i) => makeGuard(patrol, i));
  game.rings = [];
  game.elapsed = 0;
}

function startGame() {
  game.detections = 0;
  game.totalElapsed = 0;
  game.loot = 0;
  game.lootTaken = new Set();
  loadLevel(0);
  game.screen = SCREEN.PLAYING;
  announce('The game has started. Steal the Ember Opal and reach the exit unseen.');
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function tileCenter(tile) {
  return { x: (tile.x + 0.5) * TILE, y: (tile.y + 0.5) * TILE };
}

function checkLoot() {
  const player = game.player;
  for (const spot of game.level.loot) {
    const key = `${game.levelIndex}:${spot.x},${spot.y}`;
    if (game.lootTaken.has(key)) continue;
    const at = tileCenter(spot);
    if (Math.hypot(player.x - at.x, player.y - at.y) < 20) {
      game.lootTaken.add(key);
      game.loot += 1;
      playLoot();
      announce(`Trinket pocketed — ${game.loot} of ${game.lootTotal}.`);
    }
  }
}

function checkObjective() {
  const player = game.player;
  const gemAt = tileCenter(game.level.gem);
  const exitAt = tileCenter(game.level.exit);
  if (!player.hasGem && Math.hypot(player.x - gemAt.x, player.y - gemAt.y) < 24) {
    player.hasGem = true;
    playGem();
    announce('You took the Ember Opal. Now reach the green exit door.');
  }
  if (player.hasGem && Math.hypot(player.x - exitAt.x, player.y - exitAt.y) < 26) {
    game.totalElapsed += game.elapsed;
    if (game.levelIndex + 1 < LEVELS.length) {
      game.screen = SCREEN.LEVEL_COMPLETE;
      playWin();
      announce(`Wing cleared. Press Enter for the next wing.`);
    } else {
      game.screen = SCREEN.WIN;
      playWin();
      announce('You escaped with the Ember Opal. You win.');
    }
  }
}

function handleGuardEvent(event) {
  if (event === 'spotted') playSpotted();
  if (event === 'alarm') {
    game.detections += 1;
    playAlarm();
    announce('A guard spotted you and is giving chase. Break line of sight!');
  }
  if (event === 'lost') announce('The guard lost you. Stay quiet.');
  if (event === 'caught') {
    game.screen = SCREEN.LOSE;
    playCaught();
    announce('Caught. Press R to try again.');
  }
}

function update(dt) {
  game.time += dt;
  if (game.screen !== SCREEN.PLAYING) return;
  game.elapsed += dt;
  const player = game.player;
  const { dx, dy } = input.moveVector();
  player.sneaking = input.sneaking;
  player.running = input.running && !input.sneaking;
  movePlayer(player, dx, dy, game.level.grid, dt);
  refreshHidden(player, game.level.grid);
  if (player.stepped) {
    player.stepped = false;
    playStep(player.running, player.sneaking);
    if (player.running) {
      game.rings.push({ x: player.x, y: player.y, radius: 60, age: 0 });
    }
  }
  const landed = updatePebble(player, dt);
  if (landed) {
    playPebble();
    game.rings.push({ x: landed.x, y: landed.y, radius: 110, age: 0 });
  }
  for (const ring of game.rings) ring.age += dt;
  game.rings = game.rings.filter((ring) => ring.age < 0.9);
  for (const guard of game.guards) {
    const event = updateGuard(guard, player, game.level.grid, dt);
    if (event) handleGuardEvent(event);
    if (game.screen !== SCREEN.PLAYING) return; // caught mid-tick
  }
  player.noise = null; // a noise is heard for exactly one tick
  checkLoot();
  checkObjective();
}

function draw() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (game.screen === SCREEN.MENU) {
    renderMenu(ctx, game.time);
  } else if (game.screen === SCREEN.PAUSED) {
    renderWorld(ctx, game, game.time);
    renderHud(ctx, game);
    renderPaused(ctx);
  } else if (game.screen === SCREEN.LEVEL_COMPLETE) {
    renderWorld(ctx, game, game.time);
    renderLevelComplete(ctx, game);
  } else if (game.screen === SCREEN.WIN) {
    renderWorld(ctx, game, game.time);
    renderWin(ctx, game);
  } else if (game.screen === SCREEN.LOSE) {
    renderWorld(ctx, game, game.time);
    renderLose(ctx, game);
  } else {
    renderWorld(ctx, game, game.time);
    renderHud(ctx, game);
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

// --- Controls --------------------------------------------------------------

input.setKeyHandler((code) => {
  ensureAudio();
  if (code === 'KeyM') {
    toggleMute();
    return;
  }
  if (code === 'Enter' || code === 'Space') {
    if (game.screen === SCREEN.MENU) {
      playClick();
      startGame();
    } else if (game.screen === SCREEN.LEVEL_COMPLETE) {
      playClick();
      loadLevel(game.levelIndex + 1);
      game.screen = SCREEN.PLAYING;
    }
    return;
  }
  if (code === 'KeyR') {
    if (game.screen !== SCREEN.MENU) {
      playClick();
      startGame();
    }
    return;
  }
  if (code === 'KeyP' || code === 'Escape') {
    if (game.screen === SCREEN.PLAYING) {
      game.screen = SCREEN.PAUSED;
      announce('Paused.');
    } else if (game.screen === SCREEN.PAUSED) {
      game.screen = SCREEN.PLAYING;
      announce('Sneaking resumed.');
    }
  }
});

input.setClickHandler((x, y) => {
  ensureAudio();
  if (game.screen === SCREEN.MENU) {
    playClick();
    startGame();
    return;
  }
  if (game.screen === SCREEN.LEVEL_COMPLETE) {
    playClick();
    loadLevel(game.levelIndex + 1);
    game.screen = SCREEN.PLAYING;
    return;
  }
  if (game.screen !== SCREEN.PLAYING) return;
  if (tossPebble(game.player, x, y)) playClick();
});

// --- Screenshot staging ----------------------------------------------------
// ?shot=start  the menu
// ?shot=play   mid-game: Wren sneaking past a patrolling guard, cone visible
// ?shot=alert  a guard has spotted Wren and gives chase
// ?shot=win    the win screen after both wings
// These only arrange the game's own state; every pixel is the game itself.
function applyShot(shot) {
  if (shot === 'play') {
    startGame();
    // Wren crouched by a planter in the middle gallery, a guard's cone
    // sweeping just past her, the Opal glowing in the distance.
    game.player.x = (4.5) * TILE;
    game.player.y = (6.5) * TILE;
    game.player.facing = 0;
    game.player.sneaking = true;
    const guard = game.guards[0];
    guard.x = (11.5) * TILE;
    guard.y = (6.5) * TILE;
    guard.facing = Math.PI; // looking left, toward Wren
    guard.state = GUARD_STATE.PATROL;
    guard.awareness = 34;
    const guard2 = game.guards[1];
    guard2.x = (23.5) * TILE;
    guard2.y = (8.5) * TILE;
    guard2.facing = -Math.PI / 2;
  } else if (shot === 'alert') {
    startGame();
    // Wren caught in the open mid-corridor; the guard is mid-chase,
    // five tiles back, so the shot catches the hunt, not the capture.
    game.player.x = (14.5) * TILE;
    game.player.y = (11.5) * TILE;
    game.player.running = true;
    const guard = game.guards[0];
    guard.x = (9.5) * TILE;
    guard.y = (11.5) * TILE;
    guard.facing = 0; // looking right, down the corridor at Wren
    guard.state = GUARD_STATE.CHASE;
    guard.awareness = 100;
    game.detections = 1;
    game.rings.push({ x: game.player.x, y: game.player.y, radius: 60, age: 0.2 });
  } else if (shot === 'win') {
    startGame();
    game.player.hasGem = true;
    game.totalElapsed = 214;
    game.elapsed = 0;
    game.detections = 1;
    game.screen = SCREEN.WIN;
  }
}

// --- Boot ------------------------------------------------------------------

loadLevel(0);
const params = new URLSearchParams(window.location.search);
applyShot(params.get('shot'));

// A handle for automated playtests (and curious players): the live game.
window.__game = game;
window.__screens = SCREEN;

requestAnimationFrame(frame);
