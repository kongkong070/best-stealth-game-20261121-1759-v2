// Velvet Shadow — tuning numbers, all in one place.
// Every distance is in pixels, every speed in pixels per second.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

export const PLAYER_RADIUS = 13;
export const WALK_SPEED = 135;
export const SNEAK_SPEED = 72;
export const RUN_SPEED = 215;

export const GUARD_PATROL_SPEED = 62;
export const GUARD_SUSPICIOUS_SPEED = 108;
export const GUARD_CHASE_SPEED = 168;
export const GUARD_VIEW_RANGE = 230;
export const GUARD_VIEW_HALF_ANGLE = 0.61; // about 35 degrees each side
export const GUARD_TURN_SPEED = 3.4; // radians per second

export const DETECT_BASE_RATE = 55; // meter points per second at point blank
export const DETECT_DECAY = 20; // meter points per second while unseen
export const CHASE_DECAY = 8; // slower decay while a chase is cooling off
export const SUSPICIOUS_AT = 50;
export const CHASE_AT = 100;
export const CATCH_DISTANCE = 26;
export const LOSE_SIGHT_SECONDS = 2.5;

export const PEBBLE_RANGE = 320;
export const PEBBLE_NOISE_RADIUS = 300;
export const PEBBLE_FLIGHT_SECONDS = 0.45;
export const RUN_NOISE_RADIUS = 260;
export const RUN_NOISE_INTERVAL = 0.55;
export const PEBBLES_PER_WING = 5;
export const LOOT_TOTAL = 6;

// Detection multipliers for where the player stands and how they move.
export const LIGHT_LAMP = 1.7; // standing in a lamp pool
export const LIGHT_SHADOW = 0.45; // standing on a shadow carpet
export const MOVE_SNEAK = 0.5;
export const MOVE_WALK = 1.0;
export const MOVE_RUN = 1.6;
export const MOVE_IDLE = 0.8;
