# Starwake improvement loop

Goal: make Starwake feel great to play, make each world look like its name, clean up content and progression, and make it polished and stable.

**Contest:** Handshake × OpenAI Multiplayer Game Challenge, due **2026-10-30 11:59 PM PT** (see `CONTEST.md`). Judging is 25% each for Execution, Creativity, Usefulness and Polish. Multiplayer reliability and demo-readiness on the deployed URL come first.

## How each round works
1. Take the top unchecked item in **Backlog**. If it's too big, split it and do the first slice.
2. Build it. Match the surrounding code style. Prefer new modules (e.g. `world-themes.js`) over making `game.js`'s long lines longer.
3. Verify in the browser pane (dev server `starwake`, http://127.0.0.1:5180): play a heat on the affected worlds, check the console for errors, and take a screenshot. `npx vite build` must pass.
4. Commit with a clear message (`Round N: …`), check the item off, and add a line to **Log**.
5. On rounds 4 and 8, a fresh playtest agent plays every mode cold and re-ranks the backlog.
6. Stop after round 10 and write a summary for the user.

## Backlog (ranked)

### Contest-critical (multiplayer + submission)
- [ ] **Multiplayer hardening**: run a 2-browser PvP session end to end (create → join by code → 3 heats → results), using two tabs with separate storage locally. Live opponent ghosts and positions in race, clear handling of disconnects and a host leaving, and graceful errors. Validate scores server-side as far as is cheap.
- [ ] **Multiplayer feel**: show the other human pilots' names over their ships, a live standings ticker, and a lobby that makes "share this code" obvious (copy button, share link with the code in the URL).
- [ ] **Submission package**: generate a cover image (in-game screenshot composition), write the project description (OpenAI World Forge + multiplayer), and a deploy checklist (Netlify, `OPENAI_API_KEY`, two-device test).

### World identity (the races should feel new)
- [x] **Per-world environment module**: each world gets its own sky gradient, backdrop and set pieces instead of the shared black void, ring tunnel and corner planet.
  - Neon Rift: derelict orbital relay. Station trusses, broken transit spine, blinking beacons, electric-blue debris.
  - Io Storm: lava ocean glowing below, ash particles, lightning flashes in storm cells, volcanic plumes.
  - Titan Veil: thick amber haze (heavy fog), methane canal walls and ice spires on both sides, Saturn faint in the sky.
  - Helix Deep: layered violet nebula clouds, drifting rock, a gravity-well vortex glow.
  - Earthfall Circuit: huge curved Earth below with a cloud layer and atmosphere rim, satellites, the sun on the horizon.
  - Jovian Shear: giant banded Jupiter filling the sky, a visible ring plane the route crosses, ring-particle fields.
- [x] **Per-world tunnel frames and hazards**: frame and hazard meshes match the world (ice-crystal gates on Titan, lava-rock arches on Io, station girders on the Rift, satellite debris on Earth, ring chunks at Jupiter).
- [ ] **Per-world ambience**: a distinct music and drone layer plus particle weather for each world.
- [x] **Forged worlds** pick up the matching environment from their `kind` and tint it with their palette.

### Game feel
- [ ] **Camera**: FOV kick and stretch on boost, a short shake on hit, camera roll following the bank, a slight lag behind the ship.
- [ ] **High-tech flight effects** *(user idea)*: holographic HUD lines, energy exhaust trails, warp-stretch streaks on boost, shield shimmer on hits, scanline/chromatic flash on big moments. Speed streaks and dust scaled by speed.
- [ ] **Hit feedback**: red vignette flash, shake, a brief slowdown, an animated hull-pip loss, a crunch sound, a few frames of invulnerability with a ship blink.
- [ ] **Collect feedback**: ring pop particles, a rising pitch for consecutive rings (a combo counter with a score multiplier), a Star Core burst.
- [ ] **Controls**: tune acceleration and damping so steering feels responsive but weighty; check keyboard and touch drag; keep the ship from blocking the view of the track ahead.
- [ ] **Finish line** *(user idea)*: a big, unmistakable finish/lap gate per world with a light tunnel, a checkered holo-banner and a fly-through burst.
- [ ] **Ghost rivals** *(user idea, Mario Kart style)*: bots and other players render as translucent glowing ghost copies of their actual ships, with name tags and a trailing ribbon.
- [ ] **Race flow**: a punchier 3-2-1-GO countdown, lap-complete fanfare, a final-10-seconds tension cue, a clear finish moment.

### Content and progression
- [ ] **Audit the economy**: RP ranks, credits, ship prices, module prices and stickers. Make the first unlock reachable in 2–3 races and give each later unlock a clear goal.
- [ ] **Results screen**: score breakdown (rings, cores, laps, hull, time), RP and credits earned with a progress bar toward the next rank or unlock, personal best and sticker callouts.
- [ ] **Fix the upgrade system + garage** *(user idea)*: clear stat bars, owned/equipped states, modules with effects you can feel in play, prices that make sense.
- [ ] **Ship micro-figure select** *(user idea)*: a racing-game-style ship picker with a rotating 3D micro-figure of each ship on a lit pedestal, also on the hub before launching.
- [ ] **Interactive color scheme** *(user idea)*: ship paint/trail color picker, and UI accents that shift with the selected world and react to boosts and hits.
- [ ] **Titles + PB achievement stickers** *(user idea)*: rank and credits clearly build toward named titles; PB times earn collectible stickers shown in a sticker book and on the profile.
- [ ] **Per-course personal bests and medals** (bronze/silver/gold score targets) shown on the hub map cards.
- [ ] **Remove dead UI**: the legacy home-screen controls hidden behind the hub (duplicate World Forge, course arrows). Make sure nothing still depends on them.

### Polish and stability
- [ ] **First-run onboarding**: a short controls card on the first heat; drop the "Exploration prototype" disclaimers where they're no longer true.
- [ ] **Mobile**: hub and race HUD at 375px width, touch steering, a boost button that doesn't overlap the HUD.
- [ ] **Performance**: dispose geometry and materials between races (check for leaks across 5 races), cap pixel ratio, code-split three.js so the main chunk drops under 500 KB.
- [ ] **Robustness**: offline and multiplayer error states, a pause on tab blur, no console errors through a full 3-heat PvE session.

### More worlds
- [ ] **New courses** *(user idea)*: more planet / atmosphere / galaxy themes with different obstacle mixes (e.g. Venus acid clouds, Saturn's Cassini gap, a black-hole accretion disk, Mars dust canyons).

### AI (stretch)
- [ ] **Forge card track preview**: draw the forged path as a mini-map.
- [ ] **Remix button**: tweak the current forged course ("more hazards", "lower gravity").

## Ideas inbox
The user's ideas (from their OpenAI brainstorm) were merged into the backlog above and marked *(user idea)*. Add new ideas here, then triage them into the backlog.

## Log
- Round 0 (2026-10-02): git baseline; plan written. Playtest finding: Neon Rift, Io Storm and Titan Veil look nearly identical in race (black void, same corner planet and ring tunnel; only the tint changes).
- Round 1: added `world-themes.js`, a per-world sky dome, fog, ground and scrolling set pieces. Rift: neon station pylons, gantries, transit spine. Io: lava sea, volcanoes, plumes, ash and embers, lightning, Jupiter overhead. Titan: amber haze, ice-spire canal walls, methane canal, Saturn. Helix: nebula clouds, spiral vortex, drifting rock. Earth: curved planet below with atmosphere rim, sun, satellites. Jupiter: banded giant, ring plane, ring dust and chunks. Forged courses use the theme for their `kind`. Also fixed per-frame theme rebuilds on the home screen and raised the camera far plane to 450.
- Round 2: themed checkpoint gates (`buildWorldFrame`): hex relay gate, basalt arch with lava seams, octagonal crystal gate with ice spikes, spinning energy ring, orbital ring with solar wings, ring-chunk gate. Hazard rocks per world (`hazardLook`): metal debris, lava rock, ice crystals, nebula stone, satellite wreckage, ring ice. Saved the contest rules to `CONTEST.md` and added contest-critical items (multiplayer hardening, submission package).
