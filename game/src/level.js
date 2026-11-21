// Velvet Shadow — the two museum wings.
// Map legend:
//   #  wall            .  marble floor      ,  shadow carpet (dark, safe)
//   o  lamp pool (lit, dangerous)   P  planter (hide inside)
//   C  display case (blocks sight and movement)
//   L  loot trinket    O  the Ember Opal    E  green exit    S  player start
// Guards patrol the waypoint lists; every waypoint is a walkable tile.
import { TILE } from './config.js';

export const WINGS = [
  {
    name: 'Wing 1 — The Ember Gallery',
    objective: 'Slip through the gallery and reach the green exit.',
    map: [
      '########################',
      '#S.....,,,,,....o......#',
      '#......,,,,,....o...L..#',
      '#..CC..........o.......#',
      '#..CC...,,,,...........#',
      '#......,,,,,...o....C..#',
      '#..P..........o.....C..#',
      '#......,,,,............#',
      '#..o....,,,,....CC.....#',
      '#..o..........CC.......#',
      '#......,,,,....o...P...#',
      '#..L...,,,,....o.......#',
      '#......,,,,............#',
      '#..CC......o.....L.....#',
      '#..CC......o..........E#',
      '########################',
    ],
    guards: [
      { waypoints: [[6, 3], [17, 3], [17, 10], [6, 10]] },
      { waypoints: [[21, 2], [20, 12], [13, 12], [13, 2]] },
    ],
    hasOpal: false,
  },
  {
    name: 'Wing 2 — The Vault Wing',
    objective: 'Steal the Ember Opal, then reach the green exit.',
    map: [
      '########################',
      '#S....o....,,,,.....L..#',
      '#......o....,,,,....C..#',
      '#..CC......,,,,....C...#',
      '#..CC..o........P......#',
      '#......o....CCCCC......#',
      '#..P...o....C...C..o...#',
      '#......o....C.O.C..o...#',
      '#..L...o....C...C..o...#',
      '#......o....CCCCC......#',
      '#..CC..o........P......#',
      '#......o....,,,,....C..#',
      '#......o....,,,,....C..#',
      '#......o....,,,,.....L.#',
      '#..CC......o..........E#',
      '########################',
    ],
    guards: [
      { waypoints: [[5, 1], [11, 1], [11, 3], [5, 3]] },
      { waypoints: [[18, 5], [18, 10], [10, 10], [10, 5]] },
      { waypoints: [[4, 13], [10, 13], [10, 11], [4, 11]] },
    ],
    hasOpal: true,
  },
];

// Turn a wing definition into a live level: a grid plus the entities the
// map characters stand for, each at its tile centre in pixels.
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  const level = {
    def,
    grid,
    start: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    opal: null,
    loot: [],
    planters: [],
    lamps: [],
  };
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      const ch = grid[row][col];
      const cx = col * TILE + TILE / 2;
      const cy = row * TILE + TILE / 2;
      if (ch === 'S') level.start = { x: cx, y: cy };
      if (ch === 'E') level.exit = { x: cx, y: cy };
      if (ch === 'O') level.opal = { x: cx, y: cy, taken: false };
      if (ch === 'L') level.loot.push({ x: cx, y: cy, taken: false });
      if (ch === 'P') level.planters.push({ x: cx, y: cy });
      if (ch === 'o') level.lamps.push({ x: cx, y: cy });
    }
  }
  return level;
}

export function tileAt(level, col, row) {
  if (row < 0 || row >= level.grid.length) return '#';
  if (col < 0 || col >= level.grid[row].length) return '#';
  return level.grid[row][col];
}

export function tileAtPx(level, x, y) {
  return tileAt(level, Math.floor(x / TILE), Math.floor(y / TILE));
}

// Walls and display cases stop the player and stop a guard's gaze.
export function isSolidTile(ch) {
  return ch === '#' || ch === 'C';
}

export function isSolidPx(level, x, y) {
  return isSolidTile(tileAtPx(level, x, y));
}

export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

// The light the player stands in: 'lamp', 'shadow' or 'floor'.
export function lightAt(level, x, y) {
  const ch = tileAtPx(level, x, y);
  if (ch === 'o') return 'lamp';
  if (ch === ',') return 'shadow';
  return 'floor';
}

// True when the player's centre is inside a planter's leaves.
export function inPlanter(level, x, y) {
  return level.planters.some((p) => Math.hypot(p.x - x, p.y - y) < TILE * 0.55);
}
