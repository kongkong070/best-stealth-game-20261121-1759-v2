// Velvet Shadow — shared tuning constants for the whole game.
// One place for every number a designer would tweak: tile size, speeds,
// vision, detection rates, light. No logic lives here.
export const TILE = 32;
export const MAP_W = 30;
export const MAP_H = 20;
export const VIEW_W = MAP_W * TILE; // 960
export const VIEW_H = MAP_H * TILE; // 640

// Player movement (pixels per second)
export const PLAYER_WALK_SPEED = 118;
export const PLAYER_SNEAK_SPEED = 62;
export const PLAYER_RUN_SPEED = 178;

// Guard movement
export const GUARD_PATROL_SPEED = 52;
export const GUARD_INVESTIGATE_SPEED = 78;
export const GUARD_CHASE_SPEED = 132;

// Vision: how far a guard sees, and how wide the cone is (half-angle).
export const GUARD_VIEW_RANGE = 215;
export const GUARD_VIEW_HALF_ANGLE = 0.61; // ~35 degrees

// Detection meter 0..100. Rates are per second while the player is seen.
export const DETECT_BASE_RATE = 46; // lit, walking, mid-range
export const DETECT_CLOSE_MULT = 1.9; // very close to a guard
export const DETECT_FAR_MULT = 0.55; // at the edge of the cone
export const DETECT_RUN_MULT = 1.6; // running is loud and obvious
export const DETECT_SNEAK_MULT = 0.55; // sneaking is hard to spot
export const DETECT_LIGHT_MULT = 1.45; // standing in a lamp pool
export const DETECT_DARK_MULT = 0.6; // standing in shadow
export const DETECT_DECAY_RATE = 26; // meter drains when unseen
export const SUSPICIOUS_AT = 50; // guard investigates
export const ALERT_AT = 100; // guard chases
export const LOSE_TRACK_AFTER = 3.5; // seconds unseen before a chase ends
export const CATCH_DISTANCE = 20; // guard touching the player = caught

// Hearing: running footsteps and pebble clinks pull guards in.
export const HEAR_RUN_RADIUS = 170;
export const HEAR_PEBBLE_RADIUS = 280;
export const PEBBLES_START = 3;

// Colours (canvas)
export const COLORS = {
  floor: '#2e2a33',
  floorAlt: '#322e38',
  carpet: '#241f2e', // shadow carpet: safer ground
  carpetAlt: '#28222f',
  wall: '#17131d',
  wallTop: '#3a3247',
  crate: '#5a4632',
  crateTop: '#6e583f',
  display: '#3d4a5c',
  displayTop: '#54708c',
  planter: '#1e3a24',
  planterLeaf: '#2f6b3a',
  lampGlow: '#ffd98a',
  coneCalm: 'rgba(255, 214, 90, 0.30)',
  coneSuspicious: 'rgba(255, 150, 50, 0.42)',
  coneAlert: 'rgba(255, 60, 50, 0.48)',
  player: '#e8e4f2',
  playerCloak: '#7a5cff',
  guard: '#ff5a4e',
  guardUniform: '#3f4a5e',
  gem: '#ff9d2e',
  loot: '#5ce1e6',
  exit: '#58e6a8',
  darkness: 'rgba(6, 4, 12, 0.62)',
};
