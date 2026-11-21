// Velvet Shadow — guard patrols, vision cones and the detection meter.
// A guard patrols waypoints, grows suspicious when it glimpses the player,
// and gives chase when the meter fills. Break line of sight and the guard
// cools off: the player can always recover from a near miss.
import {
  DETECT_BASE_RATE,
  DETECT_DECAY,
  CHASE_DECAY,
  CHASE_AT,
  SUSPICIOUS_AT,
  GUARD_CHASE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_SUSPICIOUS_SPEED,
  GUARD_TURN_SPEED,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_VIEW_RANGE,
  LIGHT_LAMP,
  LIGHT_SHADOW,
  LOSE_SIGHT_SECONDS,
  MOVE_IDLE,
  MOVE_RUN,
  MOVE_SNEAK,
  MOVE_WALK,
  TILE,
} from './config.js';
import { isSolidPx, lightAt, tileCenter } from './level.js';

export function createGuards(def, level) {
  return def.guards.map((g) => {
    const first = tileCenter(g.waypoints[0][0], g.waypoints[0][1]);
    const second = tileCenter(g.waypoints[1][0], g.waypoints[1][1]);
    return {
      x: first.x,
      y: first.y,
      dir: Math.atan2(second.y - first.y, second.x - first.x),
      waypoints: g.waypoints.map(([c, r]) => tileCenter(c, r)),
      waypointIndex: 1,
      state: 'patrol', // patrol | suspicious | investigate | chase
      meter: 0,
      lastSeen: null,
      investigateTarget: null,
      pauseTimer: 0,
      lookTimer: 0,
      loseTimer: 0,
      level,
    };
  });
}

// Step along the segment in small hops; a solid tile anywhere blocks sight.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 4));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (isSolidPx(level, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(guard, targetDir, dt) {
  const diff = angleDiff(targetDir, guard.dir);
  const step = Math.max(-GUARD_TURN_SPEED * dt, Math.min(GUARD_TURN_SPEED * dt, diff));
  guard.dir += step;
}

export function guardSeesPlayer(guard, player, level) {
  if (player.hidden) return false;
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_VIEW_RANGE) return false;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), guard.dir)) > GUARD_VIEW_HALF_ANGLE) return false;
  return hasLineOfSight(level, guard.x, guard.y, player.x, player.y);
}

// How fast the meter climbs while this guard watches the player.
function detectionRate(guard, player, level) {
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const closeness = 1.15 - (dist / GUARD_VIEW_RANGE);
  const light = lightAt(level, player.x, player.y);
  const lightFactor = light === 'lamp' ? LIGHT_LAMP : light === 'shadow' ? LIGHT_SHADOW : 1;
  const moveFactor = player.sneaking ? MOVE_SNEAK
    : player.running ? MOVE_RUN
    : player.moving ? MOVE_WALK : MOVE_IDLE;
  return DETECT_BASE_RATE * Math.max(0.15, closeness) * lightFactor * moveFactor;
}

function moveToward(guard, target, speed, dt) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  turnToward(guard, Math.atan2(dy, dx), dt);
  return dist - step < 2;
}

function nearestWaypointIndex(guard) {
  let best = 0;
  let bestDist = Infinity;
  guard.waypoints.forEach((w, i) => {
    const d = Math.hypot(w.x - guard.x, w.y - guard.y);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

export function updateGuards(guards, dt, ctx) {
  const { player, level, audio } = ctx;
  let caught = false;

  for (const guard of guards) {
    const seen = guardSeesPlayer(guard, player, level);
    const wasChasing = guard.state === 'chase';

    if (seen) {
      guard.meter = Math.min(CHASE_AT, guard.meter + detectionRate(guard, player, level) * dt);
      guard.lastSeen = { x: player.x, y: player.y };
      guard.loseTimer = 0;
      if (guard.meter >= CHASE_AT && guard.state !== 'chase') {
        guard.state = 'chase';
        audio.alert();
      } else if (guard.meter >= SUSPICIOUS_AT && guard.state === 'patrol') {
        guard.state = 'suspicious';
        audio.suspicious();
      }
    } else {
      const decay = guard.state === 'chase' ? CHASE_DECAY : DETECT_DECAY;
      guard.meter = Math.max(0, guard.meter - decay * dt);
      if (guard.state === 'chase') {
        guard.loseTimer += dt;
        if (guard.loseTimer > LOSE_SIGHT_SECONDS) {
          guard.state = 'suspicious';
          guard.loseTimer = 0;
        }
      } else if (guard.state === 'suspicious' && guard.meter < SUSPICIOUS_AT && !guard.lastSeen) {
        guard.state = 'patrol';
      }
    }

    // A chasing guard that reaches the player ends the run.
    if (guard.state === 'chase'
      && Math.hypot(player.x - guard.x, player.y - guard.y) < 26) {
      caught = true;
    }

    if (guard.state === 'patrol') {
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        guard.dir += dt * 0.7; // glance around while waiting
      } else {
        const target = guard.waypoints[guard.waypointIndex];
        if (moveToward(guard, target, GUARD_PATROL_SPEED, dt)) {
          guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
          guard.pauseTimer = 1.2;
        }
      }
    } else if (guard.state === 'suspicious') {
      if (guard.lastSeen) {
        if (moveToward(guard, guard.lastSeen, GUARD_SUSPICIOUS_SPEED, dt)) {
          guard.lookTimer += dt;
          guard.dir += dt * 1.6; // scan the spot where the player was
          if (guard.lookTimer > 2.2) {
            guard.lookTimer = 0;
            guard.lastSeen = null;
            guard.waypointIndex = nearestWaypointIndex(guard);
            guard.state = 'patrol';
          }
        }
      } else {
        guard.state = 'patrol';
      }
    } else if (guard.state === 'investigate') {
      if (guard.investigateTarget) {
        if (moveToward(guard, guard.investigateTarget, GUARD_SUSPICIOUS_SPEED, dt)) {
          guard.lookTimer += dt;
          guard.dir += dt * 1.8;
          if (guard.lookTimer > 2.5) {
            guard.lookTimer = 0;
            guard.investigateTarget = null;
            guard.waypointIndex = nearestWaypointIndex(guard);
            guard.state = 'patrol';
          }
        }
      } else {
        guard.state = 'patrol';
      }
    } else if (guard.state === 'chase') {
      moveToward(guard, player, GUARD_CHASE_SPEED, dt);
    }

    if (wasChasing && guard.state !== 'chase') {
      // The chase cooled off; the meter keeps draining from here.
    }
  }
  return caught;
}

// A noise (pebble clink, running feet) pulls nearby patrolling guards over.
export function alertGuardsToNoise(guards, x, y, radius) {
  for (const guard of guards) {
    if (guard.state === 'chase') continue;
    if (Math.hypot(guard.x - x, guard.y - y) > radius) continue;
    guard.state = 'investigate';
    guard.investigateTarget = { x, y };
    guard.lookTimer = 0;
    guard.meter = Math.max(guard.meter, 25);
  }
}

// The points of one vision cone, raycast so walls cut the light short.
export function conePolygon(guard, level) {
  const rays = 26;
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rays; i += 1) {
    const a = guard.dir - GUARD_VIEW_HALF_ANGLE
      + (2 * GUARD_VIEW_HALF_ANGLE * i) / rays;
    let reach = GUARD_VIEW_RANGE;
    for (let d = 8; d <= GUARD_VIEW_RANGE; d += 8) {
      if (isSolidPx(level, guard.x + Math.cos(a) * d, guard.y + Math.sin(a) * d)) {
        reach = d;
        break;
      }
    }
    points.push({ x: guard.x + Math.cos(a) * reach, y: guard.y + Math.sin(a) * reach });
  }
  return points;
}

export { TILE };
