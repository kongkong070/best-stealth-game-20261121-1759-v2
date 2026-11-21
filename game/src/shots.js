// Velvet Shadow — screenshot staging for ?shot=.
// The game is fully playable by hand; these staged scenes only pose it for
// the camera, exactly as the kit's starter does with its shots.json.
// A staged scene freezes the simulation so the capture is stable.
import { TILE } from './config.js';
import { tileCenter } from './level.js';

function placeGuard(state, index, col, row, dir) {
  const g = state.guards[index];
  if (!g) return;
  const p = tileCenter(col, row);
  g.x = p.x;
  g.y = p.y;
  g.dir = dir;
  g.state = 'patrol';
  g.meter = 0;
}

// Stage one of the four cover scenes. Returns true when a scene was staged.
export function applyShot(state, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  state.frozen = true;

  if (shot === 'start') {
    state.screen = 'title';
    return true;
  }

  if (shot === 'play') {
    // Wren sneaks along the shadow carpet while a guard's cone sweeps close.
    state.screen = 'play';
    state.player.x = tileCenter(8, 7).x;
    state.player.y = tileCenter(8, 7).y;
    state.player.sneaking = true;
    state.player.dir = Math.PI;
    state.player.pebbles = 4;
    state.lootCollected = 1;
    state.level.loot[0].taken = true;
    placeGuard(state, 0, 10, 5, Math.PI * 0.75);
    state.guards[0].meter = 42;
    placeGuard(state, 1, 19, 4, Math.PI / 2);
    return true;
  }

  if (shot === 'hide') {
    // Wren hides in a planter while a guard investigates a tossed pebble.
    state.screen = 'play';
    const planter = state.level.planters[0];
    state.player.x = planter.x;
    state.player.y = planter.y;
    state.player.hidden = true;
    state.player.dir = -Math.PI / 2;
    state.player.pebbles = 3;
    state.lootCollected = 2;
    state.level.loot[0].taken = true;
    state.level.loot[1].taken = true;
    placeGuard(state, 0, 6, 6, Math.PI);
    state.guards[0].state = 'investigate';
    state.guards[0].investigateTarget = { x: tileCenter(6, 6).x, y: tileCenter(6, 6).y };
    state.guards[0].meter = 25;
    state.pebbles.push({
      x0: planter.x, y0: planter.y,
      x1: tileCenter(6, 6).x, y1: tileCenter(6, 6).y,
      t: 1, landed: true, ring: 0.4,
    });
    placeGuard(state, 1, 12, 9, -Math.PI / 2);
    return true;
  }

  if (shot === 'win') {
    // The Vault Wing, Opal taken, Wren at the green exit — victory screen.
    state.screen = 'win';
    state.lootCollected = 6;
    state.opalTaken = true;
    state.level.opal.taken = true;
    for (const loot of state.level.loot) loot.taken = true;
    state.player.x = state.level.exit.x - 40;
    state.player.y = state.level.exit.y;
    state.player.dir = 0;
    placeGuard(state, 0, 8, 2, Math.PI / 2);
    placeGuard(state, 1, 18, 8, Math.PI);
    placeGuard(state, 2, 6, 12, -Math.PI / 2);
    return true;
  }

  state.frozen = false;
  return false;
}

export { TILE };
