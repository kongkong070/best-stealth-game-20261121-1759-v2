// Velvet Shadow — guard brains: patrol routes, vision cones, suspicion,
// investigation and chase. A guard never knows where the player is unless
// it saw or heard them; everything else is a patrol.
import {
  TILE,
  GUARD_PATROL_SPEED,
  GUARD_INVESTIGATE_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  DETECT_BASE_RATE,
  DETECT_CLOSE_MULT,
  DETECT_FAR_MULT,
  DETECT_RUN_MULT,
  DETECT_SNEAK_MULT,
  DETECT_LIGHT_MULT,
  DETECT_DARK_MULT,
  DETECT_DECAY_RATE,
  SUSPICIOUS_AT,
  ALERT_AT,
  LOSE_TRACK_AFTER,
  CATCH_DISTANCE,
  HEAR_RUN_RADIUS,
  HEAR_PEBBLE_RADIUS,
} from './config.js';
import { isSolidTile, isLitTile, isShadowTile, isHidingTile } from './level.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  CHASE: 'chase',
};

// A step of 6 px along a sight line is fine enough to catch a wall tile.
function lineBlocked(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (isSolidTile(grid, tx, ty)) return true;
  }
  return false;
}

// Cast one ray of the vision cone until it hits a wall or runs out of range.
export function castVisionRay(grid, x, y, angle, maxDist) {
  const step = 5;
  let d = step;
  while (d < maxDist) {
    const px = x + Math.cos(angle) * d;
    const py = y + Math.sin(angle) * d;
    if (isSolidTile(grid, Math.floor(px / TILE), Math.floor(py / TILE))) break;
    d += step;
  }
  return Math.min(d, maxDist);
}

export function makeGuard(patrol, index) {
  const first = patrol[0];
  return {
    index,
    patrol,
    waypoint: 1 % patrol.length,
    x: (first.x + 0.5) * TILE,
    y: (first.y + 0.5) * TILE,
    facing: 0,
    state: GUARD_STATE.PATROL,
    awareness: 0, // 0..100 detection meter for this guard
    lastSeen: null, // {x, y} where the player was last spotted
    lastHeard: null, // {x, y} of a noise worth checking
    lookTimer: 0, // seconds spent looking around at an investigation point
    loseTimer: 0, // seconds the player has stayed out of sight while chased
    paused: 0, // seconds to stand still at a waypoint (patrol rhythm)
    stepPhase: Math.random() * Math.PI * 2,
  };
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.facing = angleTo(0, 0, dx, dy);
  return dist - step < 2;
}

// Can this guard see the player right now? Hiding in a planter always wins.
export function guardSeesPlayer(guard, player, grid) {
  if (player.hidden) return false;
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_VIEW_RANGE) return false;
  const toPlayer = angleTo(guard.x, guard.y, player.x, player.y);
  if (Math.abs(angleDiff(toPlayer, guard.facing)) > GUARD_VIEW_HALF_ANGLE) return false;
  if (lineBlocked(grid, guard.x, guard.y, player.x, player.y)) return false;
  return true;
}

// How fast the meter rises while this guard watches the player.
function detectionRate(guard, player, grid) {
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  let rate = DETECT_BASE_RATE;
  if (dist < 80) rate *= DETECT_CLOSE_MULT;
  else if (dist > 160) rate *= DETECT_FAR_MULT;
  if (player.running) rate *= DETECT_RUN_MULT;
  if (player.sneaking) rate *= DETECT_SNEAK_MULT;
  const tx = Math.floor(player.x / TILE);
  const ty = Math.floor(player.y / TILE);
  if (isLitTile(grid, tx, ty)) rate *= DETECT_LIGHT_MULT;
  if (isShadowTile(grid, tx, ty)) rate *= DETECT_DARK_MULT;
  return rate;
}

// One tick of guard behaviour. Returns an event string for sounds/HUD:
// 'spotted' when a guard first turns suspicious, 'alarm' when one starts a
// chase, 'lost' when a chase is given up, 'caught' when the player is taken.
export function updateGuard(guard, player, grid, dt) {
  let event = null;
  const sees = guardSeesPlayer(guard, player, grid);

  if (sees) {
    guard.lastSeen = { x: player.x, y: player.y };
    guard.loseTimer = 0;
    guard.awareness = Math.min(ALERT_AT, guard.awareness + detectionRate(guard, player, grid) * dt);
    guard.facing = angleTo(guard.x, guard.y, player.x, player.y);
  } else {
    guard.awareness = Math.max(0, guard.awareness - DETECT_DECAY_RATE * dt);
    if (guard.state === GUARD_STATE.CHASE) {
      guard.loseTimer += dt;
      if (guard.loseTimer > LOSE_TRACK_AFTER) {
        guard.state = GUARD_STATE.SUSPICIOUS;
        guard.lookTimer = 0;
        event = 'lost';
      }
    }
  }

  if (guard.awareness >= ALERT_AT && guard.state !== GUARD_STATE.CHASE) {
    guard.state = GUARD_STATE.CHASE;
    event = 'alarm';
  } else if (
    guard.awareness >= SUSPICIOUS_AT &&
    guard.state === GUARD_STATE.PATROL &&
    (guard.lastSeen || guard.lastHeard)
  ) {
    guard.state = GUARD_STATE.SUSPICIOUS;
    guard.lookTimer = 0;
    event = 'spotted';
  }

  // Hearing: running feet nearby, or a pebble's clink, pull a patrolling
  // guard over to listen — but hearing alone never starts a chase.
  if (guard.state === GUARD_STATE.PATROL && player.noise) {
    const d = Math.hypot(player.noise.x - guard.x, player.noise.y - guard.y);
    const radius = player.noise.kind === 'pebble' ? HEAR_PEBBLE_RADIUS : HEAR_RUN_RADIUS;
    if (d < radius) {
      guard.lastHeard = { ...player.noise };
      guard.state = GUARD_STATE.SUSPICIOUS;
      guard.lookTimer = 0;
      event = event ?? 'heard';
    }
  }

  if (guard.state === GUARD_STATE.PATROL) {
    const target = guard.patrol[guard.waypoint];
    const tx = (target.x + 0.5) * TILE;
    const ty = (target.y + 0.5) * TILE;
    if (guard.paused > 0) {
      guard.paused -= dt;
      guard.facing += dt * 0.7; // stand still and slowly scan the room
    } else if (moveToward(guard, tx, ty, GUARD_PATROL_SPEED, dt)) {
      guard.waypoint = (guard.waypoint + 1) % guard.patrol.length;
      guard.paused = 1.2; // pause and look around at each waypoint
    }
  } else if (guard.state === GUARD_STATE.SUSPICIOUS) {
    const target = guard.lastSeen ?? guard.lastHeard;
    if (target) {
      const arrived = moveToward(guard, target.x, target.y, GUARD_INVESTIGATE_SPEED, dt);
      if (arrived) {
        guard.lookTimer += dt;
        // Scan the room: slow turn while looking for the intruder.
        guard.facing += dt * 1.6;
        if (guard.lookTimer > 2.4) {
          guard.state = GUARD_STATE.PATROL;
          guard.lastSeen = null;
          guard.lastHeard = null;
          guard.awareness = Math.max(0, guard.awareness - 30);
        }
      }
    } else {
      guard.state = GUARD_STATE.PATROL;
    }
  } else if (guard.state === GUARD_STATE.CHASE) {
    moveToward(guard, player.x, player.y, GUARD_CHASE_SPEED, dt);
    if (Math.hypot(player.x - guard.x, player.y - guard.y) < CATCH_DISTANCE) {
      event = 'caught';
    }
  }

  return event;
}

// A player standing in a planter is hidden; anywhere else they are seen.
export function playerIsHidden(player, grid) {
  return isHidingTile(grid, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
}
