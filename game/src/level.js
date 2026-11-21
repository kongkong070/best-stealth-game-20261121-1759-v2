// Velvet Shadow — level definitions.
// A level is a tile map plus the patrol routes of its guards.
// Tile legend:
//   # wall (blocks movement and sight)
//   . floor
//   , shadow carpet (floor; you are harder to spot standing on it)
//   C crate — cover, blocks movement and sight
//   D display case — cover, blocks movement and sight
//   P planter — a leafy hiding spot; stand in it and guards cannot see you
//   L lamp — floor with a warm light pool; you are easier to spot in it
//   G the Ember Opal's pedestal (steal it, then reach the exit)
//   E the exit door
//   S where Wren starts
import { MAP_W, MAP_H } from './config.js';

export const LEVELS = [
  {
    name: 'The Ember Gallery',
    briefing:
      'The Ember Opal glows at the far end of the gallery. Slip past the night watch, take it, and leave by the green door — unseen.',
    map: [
      '##############################',
      '#S....,,,,,.....#......#....E#',
      '#.....,,,,,..L..#......#.....#',
      '#..CC.,,,,,.....D......D.....#',
      '#..CC..........######..###...#',
      '#.........L......#..........##',
      '#..PP.......................##',
      '#..PP...............#.......##',
      '#......#####.....#...#####..##',
      '#......#####.....#...#####..##',
      '#..,,,,.....D....#....D.....##',
      '#..,,,,..........#..........##',
      '#......CC.....,,,#,,,,,......#',
      '#......CC.....,,,#,,,,,...L..#',
      '#....D......,,,,,#,,,,,...G..#',
      '#...........,,,,,#,,,,,......#',
      '#..PP...D....,,,,,.....D.....#',
      '#............................#',
      '#............................#',
      '##############################',
    ],
    patrols: [
      [
        { x: 10, y: 6 },
        { x: 15, y: 6 },
        { x: 15, y: 11 },
        { x: 8, y: 11 },
      ],
      [
        { x: 22, y: 6 },
        { x: 26, y: 6 },
        { x: 26, y: 12 },
        { x: 22, y: 12 },
      ],
    ],
    // Optional loot: small valuables in risky spots — under a lamp, beside
    // a patrol route, on the way to the Opal. Grabbing them is never
    // required, but a daring thief is a richer one.
    loot: [
      { x: 15, y: 2 },
      { x: 20, y: 8 },
      { x: 12, y: 15 },
    ],
  },
  {
    name: 'The Vault Wing',
    briefing:
      'Three guards walk the vault wing, and the lamps burn brighter here. The Opal waits behind the last case. Patience, Wren.',
    map: [
      '##############################',
      '#S...#......,,,,,,....#.....E#',
      '#....#..CC..,,,,,,.D..#..D...#',
      '#....#..CC.......,.D..#......#',
      '#....######..L...#....#..D...#',
      '#....#....#......#....#......#',
      '#.P..#....#......#....#......#',
      '#.P..#....#......#....#......#',
      '#....#....######.######..#...#',
      '#....#....#..D...#....#.D#...#',
      '#....#....#......#....#..#...#',
      '#..CC#....#......#....#..#...#',
      '#..CC#....#......#....#..#...#',
      '#....#....######.######..#...#',
      '#....#....#..D...#....#..#...#',
      '#....#..D.#..,,,,#..,,#..#G..#',
      '#....#....#..,,,,#..,,#..#...#',
      '#.........L......L......L....#',
      '#............................#',
      '##############################',
    ],
    patrols: [
      [
        { x: 12, y: 5 },
        { x: 16, y: 5 },
        { x: 16, y: 12 },
        { x: 12, y: 12 },
      ],
      [
        { x: 23, y: 5 },
        { x: 26, y: 5 },
        { x: 26, y: 11 },
        { x: 23, y: 11 },
      ],
      [
        { x: 13, y: 11 },
        { x: 15, y: 11 },
        { x: 15, y: 15 },
        { x: 13, y: 15 },
      ],
    ],
    loot: [
      { x: 14, y: 3 },
      { x: 23, y: 9 },
      { x: 7, y: 15 },
    ],
  },
];

// Parse one level definition into the structures the game uses.
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  let start = null;
  let gem = null;
  let exit = null;
  const lamps = [];
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      const ch = grid[y][x];
      if (ch === 'S') start = { x, y };
      if (ch === 'G') gem = { x, y };
      if (ch === 'E') exit = { x, y };
      if (ch === 'L') lamps.push({ x, y });
    }
  }
  return { ...def, grid, start, gem, exit, lamps };
}

export function isSolidTile(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  const ch = grid[ty][tx];
  return ch === '#' || ch === 'C' || ch === 'D';
}

export function isHidingTile(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
  return grid[ty][tx] === 'P';
}

export function isLitTile(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
  return grid[ty][tx] === 'L';
}

export function isShadowTile(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
  return grid[ty][tx] === ',';
}

// Breadth-first check that a target tile can be reached from the start
// without crossing a solid tile. Used by the self-test, not by the game.
export function isReachable(grid, from, to) {
  const seen = new Set([`${from.x},${from.y}`]);
  const queue = [{ ...from }];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === to.x && cur.y === to.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (isSolidTile(grid, nx, ny)) continue;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return false;
}
