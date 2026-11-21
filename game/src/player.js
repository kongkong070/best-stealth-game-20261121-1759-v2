// Velvet Shadow — Wren, the player: movement, sneaking, running, hiding
// and the pebble toss. The player is a circle that slides around walls.
import {
  TILE,
  PLAYER_WALK_SPEED,
  PLAYER_SNEAK_SPEED,
  PLAYER_RUN_SPEED,
  PEBBLES_START,
} from './config.js';
import { isSolidTile } from './level.js';
import { playerIsHidden } from './guards.js';

export function makePlayer(start) {
  return {
    x: (start.x + 0.5) * TILE,
    y: (start.y + 0.5) * TILE,
    radius: 11,
    facing: 0, // radians; the direction Wren last moved
    moving: false,
    sneaking: false,
    running: false,
    hidden: false,
    hasGem: false,
    pebbles: PEBBLES_START,
    noise: null, // {x, y, kind} set for one tick when feet or a pebble are loud
    stepTimer: 0, // counts down to the next footstep sound
    stepped: false, // set for one frame when a footstep lands
    pebble: null, // a pebble in flight: {x, y, tx, ty, t}
  };
}

function circleHitsWall(grid, x, y, radius) {
  // Check the four corners of the circle's bounding box against solid tiles.
  for (const [ox, oy] of [[-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]]) {
    if (isSolidTile(grid, Math.floor((x + ox) / TILE), Math.floor((y + oy) / TILE))) return true;
  }
  return false;
}

// Move with axis separation so Wren slides along walls instead of sticking.
export function movePlayer(player, dx, dy, grid, dt) {
  const speed = player.sneaking ? PLAYER_SNEAK_SPEED : player.running ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) {
    player.moving = false;
    return;
  }
  player.moving = true;
  player.facing = Math.atan2(dy, dx);
  const vx = (dx / len) * speed * dt;
  const vy = (dy / len) * speed * dt;
  if (!circleHitsWall(grid, player.x + vx, player.y, player.radius)) player.x += vx;
  if (!circleHitsWall(grid, player.x, player.y + vy, player.radius)) player.y += vy;
  // Footstep timing: a step fires every 0.42 s of moving. Only running feet
  // are loud enough for guards to hear; walking and sneaking are quiet.
  player.stepTimer -= dt * (player.running ? 2.2 : player.sneaking ? 0.7 : 1.3);
  if (player.stepTimer <= 0) {
    player.stepTimer = 0.42;
    player.stepped = true; // main.js plays the footstep sound and clears this
    player.noise = player.running ? { x: player.x, y: player.y, kind: 'run', loud: true } : null;
  }
}

// Toss a pebble toward a point. It arcs for half a second, then clinks and
// every nearby guard comes to look. Returns false when out of pebbles.
export function tossPebble(player, tx, ty) {
  if (player.pebbles <= 0 || player.pebble) return false;
  player.pebbles -= 1;
  const dist = Math.hypot(tx - player.x, ty - player.y);
  const maxThrow = 260;
  const k = dist > maxThrow ? maxThrow / dist : 1;
  player.pebble = {
    x: player.x,
    y: player.y,
    tx: player.x + (tx - player.x) * k,
    ty: player.y + (ty - player.y) * k,
    t: 0,
  };
  return true;
}

export function updatePebble(player, dt) {
  if (!player.pebble) return null;
  const p = player.pebble;
  p.t += dt / 0.45; // the toss takes 0.45 s
  if (p.t >= 1) {
    const landed = { x: p.tx, y: p.ty, kind: 'pebble', loud: true };
    player.pebble = null;
    player.noise = landed;
    return landed;
  }
  return null;
}

// Refresh the hidden flag after a move: standing in a planter hides Wren.
export function refreshHidden(player, grid) {
  player.hidden = playerIsHidden(player, grid);
}
