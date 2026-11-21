# Velvet Shadow

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/kongkong070/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/kongkong070/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A top-down stealth game in a moonlit museum. You are **Wren**, a cat
burglar with one job tonight: lift the **Ember Opal** and slip out the green
door — unseen.

## How it plays

- **Guards patrol with raycast vision cones.** Stay out of the cones, or
  the detection meter fills: suspicious at half, chase at full. Break line
  of sight and the guard loses you — you can recover from a near miss.
- **Light is the whole game.** Lamp pools speed detection up; shadow
  carpets slow it down; leafy planters hide you entirely. Display cases
  block sight, so plan your route around them.
- **Noise matters.** Walk quietly, sneak with Shift (slow, near-silent), or
  run with Space (fast, loud — guards hear your feet and come looking).
  Click to toss a pebble and lure a guard away to investigate the clink.
- **Two wings.** Clear the Ember Gallery with its two guards, then the
  tighter Vault Wing with three guards around the Opal's glass vault.
  Steal the Opal, then reach the exit.
- **Optional loot.** Six cyan trinkets sit in risky spots — under a lamp,
  beside a patrol route. Never required, always tempting.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sneak (quiet, slow) |
| Space | Run (fast, loud) |
| Click | Toss a pebble toward the mouse |
| P / Esc | Pause |
| M | Mute |
| R | Restart the wing |
| Enter | Start / next wing |

## Run it

No build step, no network: every file the game loads sits under `game/`.
All sound is synthesized with WebAudio — there are no audio files.

```sh
node serve.ts        # serves game/ at http://localhost:8080
```

Or open `game/index.html` directly in desktop Chrome.

## Layout

- `game/index.html` — the page and canvas
- `game/src/main.js` — state machine, game loop, win/lose rules
- `game/src/level.js` — the two museum wings (tile maps + patrol routes)
- `game/src/guards.js` — patrols, vision cones, suspicion, chase
- `game/src/player.js` — movement, sneaking, running, pebble toss
- `game/src/render.js` — floor, lighting, cones, entities, HUD, screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesized footsteps, clinks, alarms
- `game/src/config.js` — every tuning number in one place
- `game/src/shots.js` — staged scenes for the screenshots (`?shot=`)
- `main.ts` — the make.fun hand-in program (copies `game/` +
  `screenshots/` to `/output`, writes `dossier.json`)
- `screenshots/` — real renders of the game in a browser

MIT licensed. Original art, names and code — nothing borrowed from a
commercial game.
