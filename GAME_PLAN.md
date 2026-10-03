# Starwake improvement loop

Goal: make Starwake feel great to play, make each world look like its name, clean up content and progression, and make it polished and stable.

## How each round works
1. Take the top unchecked item in **Backlog**. If it's too big, split it and do the first slice.
2. Build it. Match the surrounding code style. Prefer new modules (e.g. `world-themes.js`) over making `game.js`'s long lines longer.
3. Verify in the browser pane (dev server `starwake`, http://127.0.0.1:5180): play a heat on the affected worlds, check the console for errors, and take a screenshot. `npx vite build` must pass.
4. Commit with a clear message (`Round N: …`), check the item off, and add a line to **Log**.
5. On rounds 4 and 8, a fresh playtest agent plays every mode cold and re-ranks the backlog.
6. Stop after round 10 and write a summary for the user.

## Backlog (ranked)

### World identity (the races should feel new)
- [ ] **Per-world environment module**: each world gets its own sky gradient, backdrop and set pieces instead of the shared black void, ring tunnel and corner planet.
  - Neon Rift: derelict orbital relay. Station trusses, broken transit spine, blinking beacons, electric-blue debris.
  - Io Storm: lava ocean glowing below, ash particles, lightning flashes in storm cells, volcanic plumes.
  - Titan Veil: thick amber haze (heavy fog), methane canal walls and ice spires on both sides, Saturn faint in the sky.
  - Helix Deep: layered violet nebula clouds, drifting rock, a gravity-well vortex glow.
  - Earthfall Circuit: huge curved Earth below with a cloud layer and atmosphere rim, satellites, the sun on the horizon.
  - Jovian Shear: giant banded Jupiter filling the sky, a visible ring plane the route crosses, ring-particle fields.
- [ ] **Per-world tunnel frames and hazards**: frame and hazard meshes match the world (ice-crystal gates on Titan, lava-rock arches on Io, station girders on the Rift, satellite debris on Earth, ring chunks at Jupiter).
- [ ] **Per-world ambience**: a distinct music and drone layer plus particle weather for each world.
- [ ] **Forged worlds** pick up the matching environment from their `kind` and tint it with their palette.

### Game feel
- [ ] **Camera**: FOV kick and stretch on boost, a short shake on hit, camera roll following the bank, a slight lag behind the ship.
- [ ] **Speed sense**: a field of near-ship streaks and dust scaled by speed; an exhaust trail.
- [ ] **Hit feedback**: red vignette flash, shake, a brief slowdown, an animated hull-pip loss, a crunch sound, a few frames of invulnerability with a ship blink.
- [ ] **Collect feedback**: ring pop particles, a rising pitch for consecutive rings (a combo counter with a score multiplier), a Star Core burst.
- [ ] **Controls**: tune acceleration and damping so steering feels responsive but weighty; check keyboard and touch drag; keep the ship from blocking the view of the track ahead.
- [ ] **Race flow**: a punchier 3-2-1-GO countdown, lap-complete fanfare, a final-10-seconds tension cue, a clear finish moment.

### Content and progression
- [ ] **Audit the economy**: RP ranks, credits, ship prices, module prices and stickers. Make the first unlock reachable in 2–3 races and give each later unlock a clear goal.
- [ ] **Results screen**: score breakdown (rings, cores, laps, hull, time), RP and credits earned with a progress bar toward the next rank or unlock, personal best and sticker callouts.
- [ ] **Garage cleanup**: clear stat bars, a ship preview, an owned/equipped state, and module effects you can feel in play.
- [ ] **Per-course personal bests and medals** (bronze/silver/gold score targets) shown on the hub map cards.
- [ ] **Remove dead UI**: the legacy home-screen controls hidden behind the hub (duplicate World Forge, course arrows). Make sure nothing still depends on them.

### Polish and stability
- [ ] **First-run onboarding**: a short controls card on the first heat; drop the "Exploration prototype" disclaimers where they're no longer true.
- [ ] **Mobile**: hub and race HUD at 375px width, touch steering, a boost button that doesn't overlap the HUD.
- [ ] **Performance**: dispose geometry and materials between races (check for leaks across 5 races), cap pixel ratio, code-split three.js so the main chunk drops under 500 KB.
- [ ] **Robustness**: offline and multiplayer error states, a pause on tab blur, no console errors through a full 3-heat PvE session.

### AI (stretch)
- [ ] **Forge card track preview**: draw the forged path as a mini-map.
- [ ] **Remix button**: tweak the current forged course ("more hazards", "lower gravity").

## Log
- Round 0 (2026-10-02): git baseline; plan written. Playtest finding: Neon Rift, Io Storm and Titan Veil look nearly identical in race (black void, same corner planet and ring tunnel; only the tint changes).
