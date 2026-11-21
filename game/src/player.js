// Velvet Shadow — the burglar Wren: sneak, walk, run, toss pebbles.
// Movement is axis-separated against the tile grid so Wren slides along
// walls instead of sticking to them.
import {
  PEBBLE_RANGE,
  PLAYER_RADIUS,
  RUN_SPEED,
  SNEAK_SPEED,
  TILE,
  WALK_SPEED,
} from './config.js';
import { isSolidPx } from './level.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    dir: 0,
    moving: false,
    sneaking: false,
    running: false,
    hidden: false,
    pebbles: 5,
    stepTimer: 0,
  };
}

function canStand(level, x, y) {
  const r = PLAYER_RADIUS - 1;
  return !isSolidPx(level, x - r, y - r)
    && !isSolidPx(level, x + r, y - r)
    && !isSolidPx(level, x - r, y + r)
    && !isSolidPx(level, x + r, y + r);
}

export function updatePlayer(player, dt, input, level, events) {
  const ix = (input.keys.has('KeyD') || input.keys.has('ArrowRight') ? 1 : 0)
    - (input.keys.has('KeyA') || input.keys.has('ArrowLeft') ? 1 : 0);
  const iy = (input.keys.has('KeyS') || input.keys.has('ArrowDown') ? 1 : 0)
    - (input.keys.has('KeyW') || input.keys.has('ArrowUp') ? 1 : 0);
  player.sneaking = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
  player.running = input.keys.has('Space') && !player.sneaking;
  player.moving = ix !== 0 || iy !== 0;

  const speed = player.sneaking ? SNEAK_SPEED : player.running ? RUN_SPEED : WALK_SPEED;
  if (player.moving) {
    const len = Math.hypot(ix, iy);
    const vx = (ix / len) * speed * dt;
    const vy = (iy / len) * speed * dt;
    if (canStand(level, player.x + vx, player.y)) player.x += vx;
    if (canStand(level, player.x, player.y + vy)) player.y += vy;
    player.dir = Math.atan2(iy, ix);
    // Footsteps: quiet while sneaking, loud and frequent while running.
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.running ? 0.26 : player.sneaking ? 0.62 : 0.42;
      events.push({ type: 'step', running: player.running, sneaking: player.sneaking });
    }
  } else {
    player.stepTimer = 0;
  }
}

// A click tosses a pebble toward the mouse, up to PEBBLE_RANGE away; it
// stops at the first wall in its path and clinks where it lands.
export function throwPebble(player, level, mouse) {
  if (player.pebbles <= 0) return null;
  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 8) return null;
  const range = Math.min(PEBBLE_RANGE, dist);
  let tx = player.x + (dx / dist) * range;
  let ty = player.y + (dy / dist) * range;
  for (let d = 8; d <= range; d += 8) {
    const px = player.x + (dx / dist) * d;
    const py = player.y + (dy / dist) * d;
    if (isSolidPx(level, px, py)) {
      tx = player.x + (dx / dist) * (d - 8);
      ty = player.y + (dy / dist) * (d - 8);
      break;
    }
  }
  player.pebbles -= 1;
  return { x0: player.x, y0: player.y, x1: tx, y1: ty, t: 0, landed: false };
}

export { TILE };
