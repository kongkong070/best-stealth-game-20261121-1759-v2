// Velvet Shadow — everything drawn on the canvas: the museum floor, its
// cover and lamps, the guards and their vision cones, Wren, the night
// lighting that shows what is safe, the HUD and the menu screens.
import { TILE, MAP_W, MAP_H, VIEW_W, VIEW_H, GUARD_VIEW_RANGE, GUARD_VIEW_HALF_ANGLE, COLORS, SUSPICIOUS_AT, ALERT_AT } from './config.js';
import { isSolidTile } from './level.js';
import { castVisionRay, GUARD_STATE } from './guards.js';

const darkCanvas = document.createElement('canvas');
darkCanvas.width = VIEW_W;
darkCanvas.height = VIEW_H;
const darkCtx = darkCanvas.getContext('2d');

function tileAt(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return '#';
  return grid[ty][tx];
}

function drawFloor(ctx, grid, time) {
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      const ch = tileAt(grid, x, y);
      const px = x * TILE;
      const py = y * TILE;
      if (ch === '#') continue; // walls are drawn later, on top
      const carpet = ch === ',';
      const alt = (x + y) % 2 === 0;
      ctx.fillStyle = carpet ? (alt ? COLORS.carpet : COLORS.carpetAlt) : alt ? COLORS.floor : COLORS.floorAlt;
      ctx.fillRect(px, py, TILE, TILE);
      // Tile seams, faint.
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      if (ch === 'L') {
        // A lamp pool: warm tiles under the lamp.
        const g = ctx.createRadialGradient(px + 16, py + 16, 4, px + 16, py + 16, 46);
        g.addColorStop(0, 'rgba(255, 217, 138, 0.5)');
        g.addColorStop(1, 'rgba(255, 217, 138, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - 16, py - 16, TILE + 32, TILE + 32);
      }
    }
  }
}

function drawWalls(ctx, grid) {
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      if (tileAt(grid, x, y) !== '#') continue;
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(px, py, TILE, TILE);
      // A lit top edge on walls that border open floor below them.
      if (tileAt(grid, x, y + 1) !== '#') {
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px, py + TILE - 4, TILE, 4);
      }
      if (tileAt(grid, x, y - 1) !== '#') {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(px, py, TILE, 3);
      }
    }
  }
}

function drawProps(ctx, grid, level, time) {
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      const ch = tileAt(grid, x, y);
      const px = x * TILE;
      const py = y * TILE;
      if (ch === 'C') {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = COLORS.crateTop;
        ctx.fillRect(px + 3, py + 3, TILE - 6, 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.strokeRect(px + 6.5, py + 6.5, TILE - 13, TILE - 13);
      } else if (ch === 'D') {
        ctx.fillStyle = COLORS.display;
        ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = COLORS.displayTop;
        ctx.fillRect(px + 7, py + 7, TILE - 14, TILE - 14);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(px + 7, py + 7, TILE - 14, 3);
      } else if (ch === 'P') {
        // A leafy planter: three overlapping bushes.
        ctx.fillStyle = COLORS.planter;
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.planterLeaf;
        for (const [ox, oy, r] of [[-6, -3, 7], [5, -5, 6], [0, 5, 7]]) {
          ctx.beginPath();
          ctx.arc(px + 16 + ox, py + 16 + oy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (ch === 'L') {
        // The lamp itself: a little brass post with a glowing bulb.
        ctx.fillStyle = '#8a6d3b';
        ctx.fillRect(px + 14, py + 10, 4, 14);
        const flicker = 0.85 + Math.sin(time * 3 + x * 1.7 + y) * 0.08;
        const g = ctx.createRadialGradient(px + 16, py + 9, 1, px + 16, py + 9, 12);
        g.addColorStop(0, `rgba(255, 230, 160, ${0.95 * flicker})`);
        g.addColorStop(1, 'rgba(255, 230, 160, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px + 16, py + 9, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.arc(px + 16, py + 9, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawLoot(ctx, game, time) {
  for (const spot of game.level.loot) {
    const key = `${game.levelIndex}:${spot.x},${spot.y}`;
    if (game.lootTaken.has(key)) continue;
    const x = (spot.x + 0.5) * TILE;
    const y = (spot.y + 0.5) * TILE;
    const bob = Math.sin(time * 2.6 + spot.x) * 2;
    const g = ctx.createRadialGradient(x, y + bob, 1, x, y + bob, 18);
    g.addColorStop(0, 'rgba(92, 225, 230, 0.7)');
    g.addColorStop(1, 'rgba(92, 225, 230, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y + bob, 18, 0, Math.PI * 2);
    ctx.fill();
    // A small cut stone, cyan where the Opal is amber.
    ctx.fillStyle = COLORS.loot;
    ctx.beginPath();
    ctx.moveTo(x, y - 7 + bob);
    ctx.lineTo(x + 5, y + bob);
    ctx.lineTo(x, y + 7 + bob);
    ctx.lineTo(x - 5, y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(x, y - 7 + bob);
    ctx.lineTo(x + 2.5, y + bob);
    ctx.lineTo(x, y - 1 + bob);
    ctx.lineTo(x - 2.5, y + bob);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGemAndExit(ctx, level, time, hasGem) {
  const gx = (level.gem.x + 0.5) * TILE;
  const gy = (level.gem.y + 0.5) * TILE;
  // The pedestal.
  ctx.fillStyle = '#4a4456';
  ctx.fillRect(gx - 10, gy - 6, 20, 14);
  ctx.fillStyle = '#6a6280';
  ctx.fillRect(gx - 12, gy - 9, 24, 5);
  if (!hasGem) {
    const bob = Math.sin(time * 2.2) * 2;
    const g = ctx.createRadialGradient(gx, gy - 16 + bob, 2, gx, gy - 16 + bob, 26);
    g.addColorStop(0, 'rgba(255, 157, 46, 0.85)');
    g.addColorStop(1, 'rgba(255, 157, 46, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(gx, gy - 16 + bob, 26, 0, Math.PI * 2);
    ctx.fill();
    // The Ember Opal: a cut diamond.
    ctx.fillStyle = COLORS.gem;
    ctx.beginPath();
    ctx.moveTo(gx, gy - 26 + bob);
    ctx.lineTo(gx + 8, gy - 16 + bob);
    ctx.lineTo(gx, gy - 6 + bob);
    ctx.lineTo(gx - 8, gy - 16 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(gx, gy - 26 + bob);
    ctx.lineTo(gx + 4, gy - 16 + bob);
    ctx.lineTo(gx, gy - 14 + bob);
    ctx.lineTo(gx - 4, gy - 16 + bob);
    ctx.closePath();
    ctx.fill();
  }

  const ex = (level.exit.x + 0.5) * TILE;
  const ey = (level.exit.y + 0.5) * TILE;
  const open = hasGem;
  const pulse = open ? 0.75 + Math.sin(time * 4) * 0.25 : 0.35;
  const g = ctx.createRadialGradient(ex, ey, 4, ex, ey, 40);
  g.addColorStop(0, `rgba(88, 230, 168, ${0.5 * pulse})`);
  g.addColorStop(1, 'rgba(88, 230, 168, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ex, ey, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = open ? COLORS.exit : '#2c6b4f';
  ctx.fillRect(ex - 11, ey - 14, 22, 28);
  ctx.fillStyle = '#0e2a1e';
  ctx.fillRect(ex - 7, ey - 10, 14, 20);
  if (open) {
    ctx.fillStyle = '#bff5dc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', ex, ey - 20);
  }
}

function drawVisionCone(ctx, guard, grid) {
  const rays = 22;
  const start = guard.facing - GUARD_VIEW_HALF_ANGLE;
  const end = guard.facing + GUARD_VIEW_HALF_ANGLE;
  const color =
    guard.state === GUARD_STATE.CHASE
      ? COLORS.coneAlert
      : guard.state === GUARD_STATE.SUSPICIOUS
        ? COLORS.coneSuspicious
        : COLORS.coneCalm;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= rays; i += 1) {
    const a = start + ((end - start) * i) / rays;
    const d = castVisionRay(grid, guard.x, guard.y, a, GUARD_VIEW_RANGE);
    ctx.lineTo(guard.x + Math.cos(a) * d, guard.y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
  // A bright rim along the cone's edge, so the cone reads at a glance.
  ctx.strokeStyle = color.replace(/0\.\d+\)/, '0.7)');
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGuard(ctx, guard, time) {
  const bob = Math.sin(time * 6 + guard.stepPhase) * 1.5;
  // Body: a night-watch uniform with a red cap.
  ctx.fillStyle = COLORS.guardUniform;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.2, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.2 - 2, 7, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick: a little nose showing where the guard looks.
  ctx.strokeStyle = COLORS.guard;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing) * 17, guard.y + Math.sin(guard.facing) * 17);
  ctx.stroke();
  // State mark above the head: ? when suspicious, ! when chasing.
  if (guard.state === GUARD_STATE.SUSPICIOUS) {
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - 20);
  } else if (guard.state === GUARD_STATE.CHASE) {
    ctx.fillStyle = '#ff3c32';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 20);
  }
}

function drawPlayer(ctx, player, time) {
  const bob = player.moving ? Math.sin(time * 10) * 1.2 : 0;
  // Wren's cloak: a violet triangle pointing where she moves.
  ctx.save();
  ctx.translate(player.x, player.y + bob * 0.3);
  ctx.rotate(player.facing);
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-9, -10);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-9, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Hooded head.
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob * 0.3, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b1430';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 3, player.y + Math.sin(player.facing) * 3, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Hiding in a planter: a leaf ring says "you cannot be seen here".
  if (player.hidden) {
    ctx.strokeStyle = 'rgba(88, 230, 168, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // The stolen Opal glints at Wren's side.
  if (player.hasGem) {
    ctx.fillStyle = COLORS.gem;
    ctx.beginPath();
    ctx.arc(player.x - 10, player.y + 8, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPebble(ctx, player, time) {
  if (!player.pebble) return;
  const p = player.pebble;
  const x = p.x + (p.tx - p.x) * p.t;
  const y = p.y + (p.ty - p.y) * p.t - Math.sin(p.t * Math.PI) * 22;
  ctx.fillStyle = '#cfd6e4';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawNoiseRings(ctx, rings) {
  for (const ring of rings) {
    const age = ring.age / 0.9;
    if (age >= 1) continue;
    ctx.strokeStyle = `rgba(255, 220, 140, ${0.7 * (1 - age)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, 8 + age * ring.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// The night itself: a dark veil with warm holes cut where lamps, the Opal,
// the exit and Wren's little lantern-light fall.
function drawDarkness(ctx, level, player, time) {
  darkCtx.clearRect(0, 0, VIEW_W, VIEW_H);
  darkCtx.globalCompositeOperation = 'source-over';
  darkCtx.fillStyle = COLORS.darkness;
  darkCtx.fillRect(0, 0, VIEW_W, VIEW_H);
  darkCtx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, strength) => {
    const g = darkCtx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    darkCtx.fillStyle = g;
    darkCtx.beginPath();
    darkCtx.arc(x, y, r, 0, Math.PI * 2);
    darkCtx.fill();
  };
  for (const lamp of level.lamps) {
    hole((lamp.x + 0.5) * TILE, (lamp.y + 0.5) * TILE, 110, 0.85);
  }
  hole(player.x, player.y, 85, 0.75);
  if (!player.hasGem) {
    hole((level.gem.x + 0.5) * TILE, (level.gem.y + 0.5) * TILE, 80, 0.8);
  }
  hole((level.exit.x + 0.5) * TILE, (level.exit.y + 0.5) * TILE, 70, player.hasGem ? 0.85 : 0.55);
  ctx.drawImage(darkCanvas, 0, 0);
}

export function renderWorld(ctx, game, time) {
  const { level, player, guards, rings } = game;
  const grid = level.grid;
  drawFloor(ctx, grid, time);
  drawProps(ctx, grid, level, time);
  drawLoot(ctx, game, time);
  drawGemAndExit(ctx, level, time, player.hasGem);
  drawWalls(ctx, grid);
  drawDarkness(ctx, level, player, time);
  // Cones glow over the dark, so a guard's gaze is always readable.
  ctx.globalCompositeOperation = 'lighter';
  for (const guard of guards) drawVisionCone(ctx, guard, grid);
  ctx.globalCompositeOperation = 'source-over';
  for (const guard of guards) drawGuard(ctx, guard, time);
  drawPebble(ctx, player, time);
  drawPlayer(ctx, player, time);
  drawNoiseRings(ctx, rings);
}

// --- HUD -------------------------------------------------------------------

export function renderHud(ctx, game) {
  const { level, player, guards, elapsed, detections } = game;
  const maxAwareness = Math.max(0, ...guards.map((g) => g.awareness));
  // Top bar.
  ctx.fillStyle = 'rgba(10, 8, 16, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, 44);
  ctx.fillStyle = '#efe9f7';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`VELVET SHADOW — ${level.name}`, 12, 19);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#b9b2cc';
  ctx.fillText(player.hasGem ? 'Opal stolen — reach the green EXIT!' : 'Steal the Ember Opal, then reach the EXIT.', 12, 36);
  // Detection meter, bottom-right of the top bar.
  const mx = VIEW_W - 170;
  ctx.fillStyle = '#3a3345';
  ctx.fillRect(mx, 26, 150, 12);
  const meterColor = maxAwareness >= ALERT_AT ? '#ff3c32' : maxAwareness >= SUSPICIOUS_AT ? '#ffb347' : '#ffd65a';
  ctx.fillStyle = meterColor;
  ctx.fillRect(mx, 26, (150 * maxAwareness) / 100, 12);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(mx + 0.5, 26.5, 150, 12);
  ctx.fillStyle = '#efe9f7';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(maxAwareness >= ALERT_AT ? 'SPOTTED!' : maxAwareness >= SUSPICIOUS_AT ? 'SUSPICIOUS' : 'UNSEEN', mx - 8, 38);
  // Pebbles, time, detections, top-right of the top bar.
  ctx.textAlign = 'right';
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#b9b2cc';
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60).toString().padStart(2, '0');
  ctx.fillText(`◉ ${player.pebbles} pebbles   ◆ ${game.loot}/${game.lootTotal} loot   ${mins}:${secs}   spotted ${detections}x`, VIEW_W - 12, 19);
  ctx.textAlign = 'left';
  // Alert vignette: the screen edges burn red while a guard chases.
  if (maxAwareness >= ALERT_AT) {
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75);
    g.addColorStop(0, 'rgba(255, 40, 30, 0)');
    g.addColorStop(1, 'rgba(255, 40, 30, 0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  // Bottom hint line.
  ctx.fillStyle = 'rgba(10, 8, 16, 0.6)';
  ctx.fillRect(0, VIEW_H - 24, VIEW_W, 24);
  ctx.fillStyle = '#8f88a3';
  ctx.font = '12px sans-serif';
  ctx.fillText(
    'WASD / arrows move · Shift sneak (quiet, slow) · Space run (fast, loud) · Click toss a pebble · P pause · M mute',
    12,
    VIEW_H - 8,
  );
}

// --- Screens ---------------------------------------------------------------

function panel(ctx, title, lines, accent) {
  // The panel grows with its lines, so a long menu never overlaps itself.
  const top = VIEW_H / 2 - (66 + (lines.length * 26) / 2);
  const height = 132 + lines.length * 26;
  ctx.fillStyle = 'rgba(8, 6, 14, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(VIEW_W / 2 - 330, top, 660, height);
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, top + 60);
  ctx.fillStyle = '#efe9f7';
  ctx.font = '16px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, top + 102 + i * 26);
  });
  return { top, bottom: top + height };
}

export function renderMenu(ctx, time) {
  ctx.fillStyle = '#17131d';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // A moonlit gallery backdrop: floor tiles and one watchman's cone, purely
  // decorative, so the menu already reads as a stealth game.
  const g = ctx.createRadialGradient(VIEW_W * 0.72, VIEW_H * 0.3, 10, VIEW_W * 0.72, VIEW_H * 0.3, 260);
  g.addColorStop(0, 'rgba(255, 217, 138, 0.22)');
  g.addColorStop(1, 'rgba(255, 217, 138, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const panelBox = panel(ctx, 'VELVET SHADOW', [
    'A tiny stealth game in a moonlit museum.',
    'You are Wren, a cat burglar with one job tonight:',
    'lift the Ember Opal and slip out the green door — unseen.',
    '',
    'Guards patrol with cones of lamplight. Stay out of them,',
    'hide in the planters, mind the lamp pools, and toss a',
    'pebble (click) to lure a guard away. Shift sneaks, Space runs.',
    'Cyan trinkets are optional loot — risky to grab, but rich.',
    '',
    'Two wings to clear. Good luck, Wren.',
    '',
    'Press ENTER or click to begin',
  ], '#7a5cff');
  ctx.fillStyle = '#ffd65a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('— a game about patience, not speed —', VIEW_W / 2, panelBox.bottom + 30);
}

export function renderPaused(ctx) {
  panel(ctx, 'PAUSED', ['Take a breath. The guards wait for no one,', 'but the game does.', '', 'Press P to keep sneaking'], '#b9b2cc');
}

export function renderLevelComplete(ctx, game) {
  const { levelIndex, elapsed, detections } = game;
  panel(
    ctx,
    'WING CLEARED',
    [
      `${LEVELS_NAMES[levelIndex]} — the Opal is yours.`,
      '',
      `Time ${Math.floor(elapsed / 60)}:${Math.floor(elapsed % 60).toString().padStart(2, '0')}   ·   Spotted ${detections} time${detections === 1 ? '' : 's'}`,
      detections === 0 ? 'A perfect ghost. Not a single guard knew.' : 'The watch knows someone was here — but not who.',
      '',
      'Press ENTER for the next wing',
    ],
    '#58e6a8',
  );
}

export function renderWin(ctx, game) {
  const { totalElapsed, detections, loot, lootTotal } = game;
  const total = totalElapsed; // already includes every wing's time
  const stars = detections === 0 ? '★★★' : detections <= 2 ? '★★☆' : '★☆☆';
  panel(
    ctx,
    'THE OPAL IS YOURS',
    [
      'Both wings cleared. Wren vanishes into the night,',
      'the Ember Opal warm in her pocket.',
      '',
      stars,
      `Total time ${Math.floor(total / 60)}:${Math.floor(total % 60).toString().padStart(2, '0')}   ·   Spotted ${detections} time${detections === 1 ? '' : 's'}   ·   Loot ${loot}/${lootTotal}`,
      '',
      'Press R to steal it all over again',
    ],
    '#ffd65a',
  );
}

export function renderLose(ctx, game) {
  panel(
    ctx,
    'CAUGHT',
    [
      'A hand closes on Wren\u2019s shoulder. The watch has her.',
      'The Opal stays in its case tonight.',
      '',
      `You were spotted ${game.detections} time${game.detections === 1 ? '' : 's'} before the end.`,
      '',
      'Press R to try again — slower, quieter, smarter',
    ],
    '#ff3c32',
  );
}

const LEVELS_NAMES = ['The Ember Gallery', 'The Vault Wing'];
