// Velvet Shadow — everything the player sees: the moonlit museum floor,
// lamp pools and shadow carpets, raycast vision cones, guards, Wren, the
// HUD, and the title / pause / caught / win screens.
import { COLS, ROWS, TILE, VIEW_H, VIEW_W } from './config.js';
import { conePolygon } from './guards.js';
import { tileAt } from './level.js';

// A tiny deterministic hash so each floor tile gets its own speckle.
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, level) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = tileAt(level, col, row);
      const x = col * TILE;
      const y = row * TILE;
      const speck = hash2(col, row);
      if (ch === '#') {
        ctx.fillStyle = '#2c3350';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#3a4266';
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = '#232842';
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
        continue;
      }
      const base = (col + row) % 2 === 0 ? '#252c42' : '#222839';
      ctx.fillStyle = base;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = `rgba(255,255,255,${0.02 + speck * 0.02})`;
      ctx.fillRect(x + 6 + speck * 20, y + 8 + speck * 16, 3, 3);
      if (ch === ',') {
        ctx.fillStyle = '#161d33';
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = 'rgba(120,140,220,0.16)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 5.5, y + 5.5, TILE - 11, TILE - 11);
        ctx.fillStyle = 'rgba(120,140,220,0.10)';
        ctx.font = '9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('· · ·', x + TILE / 2, y + TILE / 2 + 3);
      }
      if (ch === 'o') {
        const g = ctx.createRadialGradient(
          x + TILE / 2, y + TILE / 2, 4, x + TILE / 2, y + TILE / 2, TILE * 1.15,
        );
        g.addColorStop(0, 'rgba(247,200,115,0.34)');
        g.addColorStop(1, 'rgba(247,200,115,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - TILE, y - TILE, TILE * 3, TILE * 3);
        ctx.fillStyle = '#f7c873';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawCasesAndPlanters(ctx, level) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = tileAt(level, col, row);
      const x = col * TILE;
      const y = row * TILE;
      if (ch === 'C') {
        ctx.fillStyle = '#4a3421';
        roundRect(ctx, x + 3, y + 3, TILE - 6, TILE - 6, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(140,190,225,0.55)';
        roundRect(ctx, x + 7, y + 7, TILE - 14, TILE - 14, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 10, y + TILE - 10);
        ctx.lineTo(x + TILE - 14, y + 10);
        ctx.stroke();
      }
      if (ch === 'P') {
        ctx.fillStyle = '#1d3a24';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, TILE * 0.46, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2f6b3a';
        for (let i = 0; i < 5; i += 1) {
          const a = (i / 5) * Math.PI * 2 + hash2(col, row);
          ctx.beginPath();
          ctx.arc(
            x + TILE / 2 + Math.cos(a) * 9,
            y + TILE / 2 + Math.sin(a) * 9,
            7, 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.fillStyle = '#57a866';
        ctx.beginPath();
        ctx.arc(x + TILE / 2 - 4, y + TILE / 2 - 5, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawLootAndGoal(ctx, level, state, time) {
  for (const loot of level.loot) {
    if (loot.taken) continue;
    const pulse = 1 + Math.sin(time * 3 + loot.x) * 0.12;
    ctx.save();
    ctx.translate(loot.x, loot.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#37e0d8';
    const s = 8 * pulse;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(-s * 0.45, -s * 0.45, s * 0.9, s * 0.9);
    ctx.restore();
  }
  if (level.opal && !level.opal.taken) {
    const pulse = 1 + Math.sin(time * 4) * 0.15;
    const g = ctx.createRadialGradient(
      level.opal.x, level.opal.y, 2, level.opal.x, level.opal.y, 46,
    );
    g.addColorStop(0, 'rgba(255,90,40,0.55)');
    g.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(level.opal.x, level.opal.y, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(level.opal.x, level.opal.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ff5a28';
    const s = 12 * pulse;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.fillStyle = '#ffd2a8';
    ctx.fillRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8);
    ctx.restore();
  }
  // The green exit door.
  const e = level.exit;
  const glow = 0.5 + Math.sin(time * 2.5) * 0.2;
  const g = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, 44);
  g.addColorStop(0, `rgba(64,220,120,${glow})`);
  g.addColorStop(1, 'rgba(64,220,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(e.x, e.y, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2fae5f';
  roundRect(ctx, e.x - 15, e.y - 15, 30, 30, 5);
  ctx.fill();
  ctx.fillStyle = '#eafff1';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', e.x, e.y + 0.5);
}

function drawCones(ctx, guards, level) {
  for (const guard of guards) {
    const poly = conePolygon(guard, level);
    const fill = guard.state === 'chase'
      ? 'rgba(255,70,60,0.30)'
      : guard.state === 'suspicious' || guard.state === 'investigate'
        ? 'rgba(255,170,60,0.26)'
        : 'rgba(255,220,120,0.20)';
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = fill.replace(/0\.\d+\)$/, '0.5)');
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawGuards(ctx, guards, time) {
  for (const guard of guards) {
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(2, 10, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b3a6b';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#46589a';
    ctx.beginPath();
    ctx.arc(0, -2, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath();
    ctx.arc(Math.cos(guard.dir) * 10, Math.sin(guard.dir) * 10, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const mark = guard.state === 'chase' ? '!' : guard.state === 'patrol' ? '' : '?';
    if (mark) {
      const bob = Math.sin(time * 5) * 2;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = guard.state === 'chase' ? '#ff5040' : '#ffb020';
      ctx.fillText(mark, guard.x, guard.y - 28 + bob);
    }
    if (guard.meter > 2) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(guard.x - 16, guard.y - 22, 32, 5);
      ctx.fillStyle = guard.meter >= 100 ? '#ff5040' : guard.meter >= 50 ? '#ffb020' : '#ffe066';
      ctx.fillRect(guard.x - 15, guard.y - 21, 30 * (guard.meter / 100), 3);
    }
  }
}

function drawPlayer(ctx, player, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(2, 10, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const bob = player.moving ? Math.sin(time * (player.running ? 16 : 10)) * 1.5 : 0;
  ctx.translate(0, bob);
  ctx.fillStyle = player.hidden ? '#3a2f5e' : '#4b2e6e';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b3fa0';
  ctx.beginPath();
  ctx.arc(0, -1, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d0a14';
  ctx.beginPath();
  ctx.arc(Math.cos(player.dir) * 3, Math.sin(player.dir) * 3, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd97a';
  ctx.beginPath();
  ctx.arc(
    Math.cos(player.dir) * 3 + Math.cos(player.dir - 0.5) * 3,
    Math.sin(player.dir) * 3 + Math.sin(player.dir - 0.5) * 3,
    1.2, 0, Math.PI * 2,
  );
  ctx.arc(
    Math.cos(player.dir) * 3 + Math.cos(player.dir + 0.5) * 3,
    Math.sin(player.dir) * 3 + Math.sin(player.dir + 0.5) * 3,
    1.2, 0, Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
  if (player.hidden) {
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8fe3a0';
    ctx.fillText('HIDDEN', player.x, player.y - 26);
  }
}

function drawPebbles(ctx, pebbles) {
  for (const p of pebbles) {
    const t = Math.min(1, p.t / 0.45);
    const x = p.x0 + (p.x1 - p.x0) * t;
    const y = p.y0 + (p.y1 - p.y0) * t - Math.sin(t * Math.PI) * 26;
    ctx.fillStyle = '#cfd6e4';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (p.landed) {
      ctx.strokeStyle = 'rgba(207,214,228,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x1, p.y1, 6 + p.ring * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawHud(ctx, state) {
  const meter = Math.max(0, ...state.guards.map((g) => g.meter));
  ctx.fillStyle = 'rgba(8,10,20,0.72)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#dfe6ff';
  ctx.fillText(state.level.def.name, 12, 18);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#9fb0d8';
  const objective = state.opalTaken
    ? 'The Opal is yours — reach the green exit!'
    : state.level.def.objective;
  ctx.textAlign = 'center';
  ctx.fillText(objective, VIEW_W / 2 + 40, 18);
  ctx.textAlign = 'left';
  // Detection meter.
  ctx.fillStyle = '#9fb0d8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('SEEN', VIEW_W - 250, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, VIEW_W - 214, 10, 120, 14, 7);
  ctx.fill();
  const mc = meter >= 100 ? '#ff5040' : meter >= 50 ? '#ffb020' : '#ffe066';
  ctx.fillStyle = mc;
  if (meter > 0) {
    roundRect(ctx, VIEW_W - 214, 10, 120 * (meter / 100), 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#dfe6ff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`◆ ${state.totalLoot + state.lootCollected}/6`, VIEW_W - 82, 18);
  ctx.fillText(`● ${state.player.pebbles}`, VIEW_W - 34, 18);
}

function overlay(ctx, title, lines, accent, alpha = 0.78) {
  ctx.fillStyle = `rgba(6,8,18,${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = 'bold 46px Georgia, serif';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 96);
  ctx.fillStyle = '#dfe6ff';
  ctx.font = '16px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 44 + i * 26);
  });
}

export function render(ctx, state, time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (state.screen === 'title') {
    drawFloor(ctx, state.level);
    drawCasesAndPlanters(ctx, state.level);
    drawLootAndGoal(ctx, state.level, state, time);
    // The cones sweep behind the title, so the first thing a player sees
    // is the game's signature: guards watching the dark.
    drawCones(ctx, state.guards, state.level);
    drawGuards(ctx, state.guards, time);
    overlay(ctx, 'VELVET SHADOW', [
      'A moonlit museum. One burglar. One Ember Opal.',
      'Stay out of the cones. Hide in the planters. Toss pebbles to lure guards.',
      'WASD move · Shift sneak · Space run · Click toss a pebble · P pause · M mute',
      '',
      'Press Enter to begin the heist',
    ], '#c9a86a', 0.62);
    return;
  }
  drawFloor(ctx, state.level);
  drawLootAndGoal(ctx, state.level, state, time);
  drawCones(ctx, state.guards, state.level);
  drawCasesAndPlanters(ctx, state.level);
  drawPebbles(ctx, state.pebbles);
  drawGuards(ctx, state.guards, time);
  drawPlayer(ctx, state.player, time);
  drawHud(ctx, state);
  if (state.screen === 'paused') {
    overlay(ctx, 'PAUSED', [
      'The museum holds its breath.',
      '',
      'Press P or Enter to keep sneaking',
    ], '#c9a86a');
  } else if (state.screen === 'caught') {
    overlay(ctx, 'CAUGHT!', [
      'A guard laid hands on Wren beneath the chandeliers.',
      `Loot carried off: ${state.totalLoot + state.lootCollected} of 6 trinkets.`,
      '',
      'Press R to try the wing again',
    ], '#ff5040');
  } else if (state.screen === 'wingclear') {
    overlay(ctx, 'WING CLEAR', [
      'You slipped past the Ember Gallery unseen.',
      'Ahead: the Vault Wing — three guards, and the Ember Opal.',
      '',
      'Press Enter to enter the Vault Wing',
    ], '#8fe3a0');
  } else if (state.screen === 'win') {
    const haul = state.totalLoot + state.lootCollected;
    overlay(ctx, 'THE EMBER OPAL IS YOURS', [
      'Wren melts into the night with the Opal — and every trinket',
      `the museum will miss: ${haul} of 6.`,
      haul === 6 ? 'A flawless haul. Not a single trinket left behind.' : 'Some trinkets still glitter in the dark…',
      '',
      'Press R to play again',
    ], '#ffd97a');
  } else if (state.hint) {
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd97a';
    ctx.fillText(state.hint, VIEW_W / 2, VIEW_H - 24);
  }
}
