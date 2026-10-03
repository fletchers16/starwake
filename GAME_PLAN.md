# Starwake improvement loop

Goal: make Starwake feel great to play, make each world look like its name, clean up content and progression, and make it polished and stable.

**Contest:** Handshake × OpenAI Multiplayer Game Challenge, due **2026-10-30 11:59 PM PT** (see `CONTEST.md`). Judging is 25% each for Execution, Creativity, Usefulness and Polish. Multiplayer reliability and demo-readiness on the deployed URL come first.

## How each round works
1. Take the top unchecked item in **Backlog**. If it's too big, split it and do the first slice.
2. Build it. Match the surrounding code style. Prefer new modules (e.g. `world-themes.js`) over making `game.js`'s long lines longer.
3. Verify in the browser pane (dev server `starwake`, http://127.0.0.1:5180): play a heat on the affected worlds, check the console for errors, and take a screenshot. `npx vite build` must pass.
4. Commit with a clear message (`Round N: …`), check the item off, and add a line to **Log**.
5. On rounds 4 and 8, a fresh playtest agent plays every mode cold and re-ranks the backlog.
6. **Don't stop at round 10.** The user asked (2026-10-03) for the loop to keep running overnight. Keep going through the backlog, then add and build new high-value items (contest criteria first). Every 5 rounds, refresh the **Morning summary** section. Never deploy, push, or post anything externally; local commits only.
7. Playtest agent: run it on rounds 4 and 8, then every 5 rounds after that.

## Backlog (ranked)

### Clean-up pass (user request 2026-10-03: "looks AI-generated, obstacles look dumb, need an objective screen, track should pass more attractions")
- [x] **Clean HUD + objective screen**
- [x] **Obstacle redesign**: one clear, intentional hazard language instead of lumpy random rocks and cone clusters
- [x] **Attractions**: each route flies through 3–4 named landmark set pieces per world, with an "ENTERING …" caption

### Playtest 3 fixes (round 20 cold playtest)
- [x] **Fairness + results bug bundle**: bots must compete at higher ranks (scale toward a clean run as rank rises; keep the rookie curve). Server score cap of 25k silently clamps boosted heats (raise it). Esc during the 3-2-1 doesn't pause solo. Results flight time contradicts itself: use HEAT / TOTAL / LAP columns. Season-bonus toast covers the main button. A guest who quits vanishes from standings (keep a LEFT row). Locked-hull module BUY buttons should be disabled. The guest bot stepper looks active. Make the Forge "Race this world" a real, focusable button.
- [ ] **Clarity pass**: desktop launch button is below the fold at 1440×900 (show a floating launch bar when it scrolls out of view). The Flight Vector panel blocks gates (shrink or move it, fade when close). A stale race scene and player ship render behind the Garage and Lobby. The "FINISH · LAP" banner mid-heat reads as race over ("LAP COMPLETE"), plus a clear clock-end moment. Garage hero art should reuse the 3D picker.
- [ ] **Free Flight shard direction indicator**.
- [ ] **Remove dead UI** (moved up): the hidden legacy `#world-prompt` still fires real forges.

### Playtest 2 fixes (round 8 cold playtest)
- [x] **Bug bundle + fairness**: breakdown missing the flight-time row (sums 60 short); bot times over 60s; Io lightning `setFromPoints` buffer warnings flooding the console; Enter in the Forge textarea should forge; stale toasts persist across screens. Rookie bot curve (new players always placed last; scale bots to the pilot's rank). True pause in solo (extend the server heat clock). Touch boost label says "HOLD · SPACE"; the II button overlaps "BOOST FUEL" on mobile.
- [x] **Results tell you how you did**: placement headline ("You placed 2nd · +40 RP"), a season verdict for you, and a rank progress bar.
- [x] **Visible callsign**: an editable pilot name on the hub and lobby, with a random default (e.g. NOVA-42) instead of everyone being the same name.
- [x] **Invite context**: the intro shows "Joining room XXXXX" for invite links.

### Playtest fixes (round 4 cold playtest; highest impact first)
- [x] **Skill must matter**: zero input scored 1,750 and placed 1st, while following the HUD arrow scored less and wrecked the hull. Gates must need a real lateral or vertical line (no passive passes), and a missed gate should cost points or speed. The guide arrow must route around hazards. Re-tune so steering clearly beats idling.
- [x] **Robustness bundle**: delete the dead `api('patch')` call (game.js ~line 200; about 60 console 400s per heat). Reset all HUD state at each heat start (score, lap, hull, ticker). Hide the standings ticker outside races (e.g. Free Flight). Fix the checkpoint counter disagreeing with "Next gate".
- [x] **Rankings that make sense**: the live place and ticker must agree with final results (rank by projected score, or score by distance). Bots get believable, spread-out results from their simulated runs, not clustered 1147/1146/1145 with identical times. Add a results score breakdown (rings, cores, laps, hull, time).
- [x] **Clear view of the track**: remove the static SVG `#craft-hull` overlay. Lower the 3D ship, move it back and shrink it so it doesn't hide gates (Bastion covers about 25% of the mobile screen). Keep rival ghosts from sitting on top of the player.
- [x] **Onboarding + race controls**: a device-aware first-heat controls card (don't show "drag to steer" on desktop), Esc/pause menu with resume and quit, and a punchy 3-2-1 instead of the 6s staging on heats 2–3.
- [x] **Solo vs PvP flow**: solo starts straight into a heat (no "build your crew" or invite link). Add a pilot-name field on the hub (everyone is "ACE" now). The invite intro says "Joining room XXXXX".
- [x] **Forge result card** with palette, gravity, hazards, a mini-map and a "Race this world" button. Make offline fallback messaging clear (now one tiny grey line).
- [x] **Free Flight**: give it world set pieces and collectibles, or drop it, and remove the "prototype" disclaimer.
- [x] **Hub layout**: launch button reachable without scrolling past 6 cards (sticky on mobile), the black blob on the Jovian card art, the clipped "SKIP INTRO", and the ticker overlapping the ship on mobile.

### Contest-critical (multiplayer + submission)
- [x] **Multiplayer hardening**: run a 2-browser PvP session end to end (create → join by code → 3 heats → results), using two tabs with separate storage locally. Live opponent ghosts and positions in race, clear handling of disconnects and a host leaving, and graceful errors. Validate scores server-side as far as is cheap.
- [x] **Multiplayer feel**: show the other human pilots' names over their ships, a live standings ticker, and a lobby that makes "share this code" obvious (copy button, share link with the code in the URL).
- [x] **Submission package**: generate a cover image (in-game screenshot composition), write the project description (OpenAI World Forge + multiplayer), and a deploy checklist (Netlify, `OPENAI_API_KEY`, two-device test).

### World identity (the races should feel new)
- [x] **Per-world environment module**: each world gets its own sky gradient, backdrop and set pieces instead of the shared black void, ring tunnel and corner planet.
  - Neon Rift: derelict orbital relay. Station trusses, broken transit spine, blinking beacons, electric-blue debris.
  - Io Storm: lava ocean glowing below, ash particles, lightning flashes in storm cells, volcanic plumes.
  - Titan Veil: thick amber haze (heavy fog), methane canal walls and ice spires on both sides, Saturn faint in the sky.
  - Helix Deep: layered violet nebula clouds, drifting rock, a gravity-well vortex glow.
  - Earthfall Circuit: huge curved Earth below with a cloud layer and atmosphere rim, satellites, the sun on the horizon.
  - Jovian Shear: giant banded Jupiter filling the sky, a visible ring plane the route crosses, ring-particle fields.
- [x] **Per-world tunnel frames and hazards**: frame and hazard meshes match the world (ice-crystal gates on Titan, lava-rock arches on Io, station girders on the Rift, satellite debris on Earth, ring chunks at Jupiter).
- [ ] *(lower priority per playtest)* **Per-world ambience**: a distinct music and drone layer plus particle weather for each world.
- [x] **Forged worlds** pick up the matching environment from their `kind` and tint it with their palette.

### Game feel
- [x] **Camera**: FOV kick and stretch on boost, a short shake on hit, camera roll following the bank, a slight lag behind the ship.
- [x] **High-tech flight effects** *(user idea)*: holographic HUD lines, energy exhaust trails, warp-stretch streaks on boost, shield shimmer on hits, scanline/chromatic flash on big moments. Speed streaks and dust scaled by speed.
- [x] **Hit feedback**: red vignette flash, shake, a brief slowdown, an animated hull-pip loss, a crunch sound, a few frames of invulnerability with a ship blink.
- [x] **Collect feedback**: ring pop particles, a rising pitch for consecutive rings (a combo counter with a score multiplier), a Star Core burst.
- [ ] **Controls**: tune acceleration and damping so steering feels responsive but weighty; check keyboard and touch drag; keep the ship from blocking the view of the track ahead.
- [x] **Finish line** *(user idea)*: a big, unmistakable finish/lap gate per world with a light tunnel, a checkered holo-banner and a fly-through burst.
- [x] **Ghost rivals** *(user idea, Mario Kart style)*: bots and other players render as translucent glowing ghost copies of their actual ships, with name tags and a trailing ribbon.
- [ ] **Race flow**: a punchier 3-2-1-GO countdown, lap-complete fanfare, a final-10-seconds tension cue, a clear finish moment.

### Content and progression
- [x] **Audit the economy**: RP ranks, credits, ship prices, module prices and stickers. Make the first unlock reachable in 2–3 races and give each later unlock a clear goal.
- [x] **Results screen**: score breakdown (rings, cores, laps, hull, time), RP and credits earned with a progress bar toward the next rank or unlock, personal best and sticker callouts.
- [x] **Fix the upgrade system + garage** *(user idea)*: clear stat bars, owned/equipped states, modules with effects you can feel in play, prices that make sense.
- [x] **Ship micro-figure select** *(user idea)*: a racing-game-style ship picker with a rotating 3D micro-figure of each ship on a lit pedestal, also on the hub before launching.
- [ ] **Interactive color scheme** *(user idea)*: ship paint/trail color picker, and UI accents that shift with the selected world and react to boosts and hits.
- [ ] **Titles + PB achievement stickers** *(user idea)*: rank and credits clearly build toward named titles; PB times earn collectible stickers shown in a sticker book and on the profile.
- [ ] **Per-course personal bests and medals** (bronze/silver/gold score targets) shown on the hub map cards.
- [ ] **Remove dead UI**: the legacy home-screen controls hidden behind the hub (duplicate World Forge, course arrows). Make sure nothing still depends on them.

### Polish and stability
- [x] **First-run onboarding**: a short controls card on the first heat; drop the "Exploration prototype" disclaimers where they're no longer true.
- [ ] **Mobile**: hub and race HUD at 375px width, touch steering, a boost button that doesn't overlap the HUD.
- [ ] **Performance**: dispose geometry and materials between races (check for leaks across 5 races), cap pixel ratio, code-split three.js so the main chunk drops under 500 KB.
- [ ] **Robustness**: offline and multiplayer error states, a pause on tab blur, no console errors through a full 3-heat PvE session.

### More worlds
- [ ] **New courses** *(user idea)*: more planet / atmosphere / galaxy themes with different obstacle mixes (e.g. Venus acid clouds, Saturn's Cassini gap, a black-hole accretion disk, Mars dust canyons).

### AI (stretch)
- [x] **Forge card track preview**: draw the forged path as a mini-map.
- [ ] **Remix button**: tweak the current forged course ("more hazards", "lower gravity").

## Morning summary
_(last update after round 20)_

**20 rounds done overnight.** Each round is its own git commit (`git log --oneline`), so anything can be reverted.

**Worlds and visuals**
- Every world looks like its name, with its own sky, ground, set pieces, gates and hazards (rounds 1–2).
- High-tech flight effects: energy trails, warp streaks, hex hit shield, perfect-line flash. A real finish line with a holo banner and light tunnel (round 17).
- Camera: FOV kick on boost, impact shake, ring-pop sparks (round 16).

**Multiplayer (the contest's core)**
- Rivals appear live as named ghost ships; invite links join directly; a live standings ticker matches the final results (rounds 3–4, 6).
- Disconnects and a host leaving are handled. Callsigns, and an invite intro ("JOIN ROOM X") (round 11).
- Sim bots fly real ship classes as Mario Kart-style ghosts with "NAME · SIM" tags (round 18).

**Gameplay**
- Skill matters: ring trails with ×5 combos, a mined centre line, and a guide line. Idle scores 360 vs about 18,000 flying well (round 5).
- Rookie bot curve so new players can win; true pause in solo (round 9).
- Free Flight works: the ship was invisible before; now it roams your chosen world collecting shards (round 13).

**Polish and flow**
- 3-2-1 countdown, first-heat controls card, Esc race menu (round 8). Solo starts instantly (round 12).
- Results say "You placed 2nd", with a breakdown and rank bar (rounds 6, 10).
- **Sound:** there was none, and the toggle was dead. Now there's an engine hum, combo-pitched ring chimes, hits, boost and fanfares (round 16). Please listen and tell me if anything is annoying.
- Hub: a ship picker with rotating 3D models (round 20), a mobile launch bar and layout fixes (round 14).
- Economy and garage: first unlock within 2–3 races, season bonus, stat deltas, clear module states (round 19).

**AI World Forge (the OpenAI showcase):** a result card with a track sketch and a "Race this world" button, plus a clear offline fallback (round 12).

**Submission:** `SUBMISSION.md` (title, description, judge guide, checklist) and `submission/cover.png` (round 15).

**Things only you can do**
1. On Netlify, set `OPENAI_API_KEY`, deploy, and forge one world (it should say "AI-FORGED", not offline).
2. Test PvP on two real devices using the invite link.
3. Listen to the sound and play a few heats; tell me what feels off.
4. Submit by **Oct 30, 11:59 PM PT** using `SUBMISSION.md` and the cover image.

**Next in the loop:** feedback from the third playtest, interactive colour scheme, titles and PB sticker book, medals on course cards, mobile and performance checks, new worlds.

## Ideas inbox
The user's ideas (from their OpenAI brainstorm) were merged into the backlog above and marked *(user idea)*. Add new ideas here, then triage them into the backlog.

## Log
- Round 0 (2026-10-02): git baseline; plan written. Playtest finding: Neon Rift, Io Storm and Titan Veil look nearly identical in race (black void, same corner planet and ring tunnel; only the tint changes).
- Round 1: added `world-themes.js`, a per-world sky dome, fog, ground and scrolling set pieces. Rift: neon station pylons, gantries, transit spine. Io: lava sea, volcanoes, plumes, ash and embers, lightning, Jupiter overhead. Titan: amber haze, ice-spire canal walls, methane canal, Saturn. Helix: nebula clouds, spiral vortex, drifting rock. Earth: curved planet below with atmosphere rim, sun, satellites. Jupiter: banded giant, ring plane, ring dust and chunks. Forged courses use the theme for their `kind`. Also fixed per-frame theme rebuilds on the home screen and raised the camera far plane to 450.
- Round 2: themed checkpoint gates (`buildWorldFrame`): hex relay gate, basalt arch with lava seams, octagonal crystal gate with ice spikes, spinning energy ring, orbital ring with solar wings, ring-chunk gate. Hazard rocks per world (`hazardLook`): metal debris, lava rock, ice crystals, nebula stone, satellite wreckage, ring ice. Saved the contest rules to `CONTEST.md` and added contest-critical items (multiplayer hardening, submission package).
- Round 3: multiplayer hardening. Added a dev middleware that runs the real Netlify functions with in-memory Blobs (`vite.config.js`, `dev/blobs-shim.js`). Server: live in-race telemetry (per-player keys, no write contention), a `leave` action, host handoff after 25s of silence, auto-resolving heats 12s after the clock with DNF scores from last telemetry, telemetry and score clamping, a guard against early fake completes, and joining humans displacing sim pilots. Client: other humans render as named ghost ships with interpolation, placement uses raw distance (fixes a 1500 m cap that tied everyone), a room-closed / lost-connection exit, a pagehide leave beacon, and DNF labels. Verified with a 2-tab race (ghost visible, disconnect resolved) and a 3-heat API run.
- Round 4: multiplayer feel. Invite links (`?room=CODE` auto-joins after the intro; the lobby button copies the link, or opens the share sheet on phones). Fixed the dead COPY CODE button (an older handler overrode it with a code-only copy) and Back now leaves the room on the server. Live standings ticker in races (you, human rivals in pink, bots, with metre gaps). Name tags on rival ghosts landed in round 3. Started the first playtest agent.
- Round 4 playtest report (subagent): see the Playtest fixes section. Protect the hub/intro art direction, multiplayer basics (invite, synced countdown, named ghosts) and the distinct worlds. Side effect: the test bought Bastion with the shared local profile.
- Round 5: skill-based scoring. Seven five-ring trails per lap held off-centre; rings score 100 × combo (up to ×5), a miss resets the combo, a full trail adds +300. Tighter capture, centre-line crystal pylons, stars moved off-centre. The HUD arrow and 3D guide line now lead through the next rings and stars and bend around hazards. Removed the dead `patch` call. Rescaled RP and credits (`heatRp`/`heatCredits`) and bot scores (4,000–11,000) to the new range. Verified on Neon Rift: idle 360 (0 rings, hull 0) vs autopilot 18,370 (36 rings, hull 6/8); before this change idle scored 1,750 and won.
- Round 6: robustness and rankings. The HUD resets at every heat start; the ticker is hidden outside races and in Free Flight. The gate counter ("GATES n / 05") agrees with the gates. Live place and ticker rank by projected score using the server's deterministic bot result, so they match the final table exactly (verified to the point). Fixed the bot hash that only changed by 1 between bots (the cause of the 1147/1146/1145 clustering) on both server and client; bot ghost pace follows bot score. Added a results breakdown (rings, perfect lines, cores, laps, hull, best combo).
- Round 7: clear view. Hid the static SVG `.flight-craft` overlay (a second fake ship that ignored the garage choice). The 3D ship is 80% size and the race camera sits higher, so the ship is lower in frame and gates and rings ahead are visible (checked desktop and 375px mobile). Rival ghosts fade to 20% when overlapping the player. Narrowed the mobile ticker.
- Round 8: onboarding and race controls. A 3-2-1 countdown (4s on server and local, was 7s) with a "HEAT n / 03" label. A device-aware controls card on a player's first 3 heats, dismissed on first steer. Input hints follow `pointer: coarse/fine` instead of width (no more "drag to steer" on desktop). An Esc race menu (and an on-screen II button) with Resume and Quit; Quit leaves the room and returns to the hub. It honestly notes that the synced heat clock keeps running. Verified end to end with no console errors.
- Round 8 playtest report (subagent): recent changes verified (idle 360 vs holding keys 16,535; ticker within 3 points of results; PvP results agree on both clients). New bugs and fairness issues added as "Playtest 2 fixes". Protect skill scoring, PvP sync and art direction. Side effect: the shared profile now owns Needle.
- Round 9: playtest-2 bug and fairness bundle. Rookie bot curve (`botSkill` 0.45–1 from the host's RP, applied on server and client, so live standings still match). True pause for solo heats (Esc freezes the clock; the new server `extend` action shifts the heat clock, allowed only in single-human rooms). The breakdown has a flight-time row and now sums to the heat score; bot times are 40–59s and labelled FLIGHT. The Io lightning uses a fixed buffer with `setDrawRange` (no more BufferGeometry warnings). Enter forges (Shift+Enter for a newline). Toasts clear on screen change. The touch boost label reads HOLD. The II button moves bottom-left on mobile. Verified on Io: clock frozen 5s, server scored the extended heat (no DNF), breakdown sums correctly, no console warnings.
- Round 10: results headline ("Heat won." / "You placed 3rd."), overall standing each heat, a season verdict with the points gap to the winner, and a rank progress bar toward the next title. Fixed the personal-best message, which was overwritten by the standings render and never shown.
- Round 11: identity and invites. A callsign field on the hub ("other pilots see this") synced with the game's pilot name, and a random default per new player (e.g. EMBER-41) instead of a shared name. The invite intro reads "You've been invited to a private race · JOIN ROOM XXXXX". Fixed the clipped "SKIP INTRO" (the cockpit frame layer sat above the intro copy).
- Round 12: solo goes straight into the heat (the room is created and started, no crew lobby or invite link). The Forge result card has an "AI-FORGED" tag, a track sketch of the lap, gravity/crosswind/hazard chips and a "Race this world" button that launches in the selected mode. The offline fallback shows an amber "OFFLINE FORGE · AI NOT CONNECTED" card explaining the closest-world match, with the same button. Fixed the card button being swallowed by the course-select handler. Callsign and invite context landed in round 11.
- Round 13: Free Flight rebuilt. Fixed the invisible ship (`free = state.freeFlight && …` evaluated to `true`, so the ship was placed at NaN). It now roams the hub-selected world's full environment (`setOrigin` moves the environment with the camera) and has signal-shard collectibles with a saved best. Removed the old dark procedural planets, the "prototype" disclaimer and the star-core hint; the HUD label shows shards, distance, best and device-aware controls.
- Round 14: hub layout. On phones the launch bar is pinned to the bottom (sticky can't work because `#app` clips overflow, so it's fixed and the hub gets bottom padding). The Ship Garage button sits inline under the launch button instead of floating over the course cards. The Jovian card's black blob was an unstyled SVG ellipse defaulting to a black fill; it's now outlined. "SKIP INTRO" clipping and the mobile ticker were fixed in rounds 11 and 7.
- Round 15: submission package. Generated `submission/cover.png` (1600×900) from a live autopiloted Jovian Shear heat mid ring-trail with a title overlay ("STARWAKE · Race worlds you imagine"). `SUBMISSION.md` (round 8) has the title, a paste-ready description, judge guide and deploy checklist. Added a dev-only `/__dev/save-image` endpoint (writes only `submission/*.png`) and a dev-only `capture()` hook, both stripped from production builds.
- Round 16: sound and game feel. The game had no audio and the sound toggle did nothing. Added `audio.js`, a dependency-free Web Audio synth: engine hum tied to boost, ring chimes rising with the combo on a pentatonic scale, a perfect-line arpeggio, a star sparkle, a combo-lost blip, a hit crunch, a boost whoosh, 3-2-1-GO beeps, lap and finish fanfares. Unlocked on the first gesture; the toggle works and persists. Camera: FOV kick to 71 on boost, a real shake on hits, stronger roll into turns. Hit feedback: the ship blinks during invulnerability and the red vignette is stronger. Collect feedback: soft particle bursts per ring (bigger with combo) and star. Checked off results screen, onboarding and Forge track preview (done in rounds 6/10, 8 and 12).
- Round 17: high-tech flight effects and finish line. Twin additive engine ribbons trace recent steering (white while boosting), a hex wireframe shield shimmers during post-hit invulnerability, warp streaks stretch 2.4× on boost, and a chromatic screen flash fires on Perfect Line. The finish gate gets a floating checkered "FINISH · LAP" holo banner and an approach tunnel of six pulsing light rings; crossing the line fires a white plus accent particle burst and a flash. Trails were first too long (they passed the camera as giant beams) and were shortened to about 4.5 m.
- Round 18: Mario Kart-style ghost rivals. Sim pilots now fly real ship classes (Kite, Bastion, Needle, Manta via a new `makeShipMesh` that builds a standalone ship without touching the player's globals) as translucent glowing pastel ghosts with "NAME · SIM" tags and short trail ribbons. Human rivals stay solid pink with their callsign (round 3), so the two are easy to tell apart. Ghost cleanup now disposes tags and trails.
- Round 19: economy and upgrades. Ships are cheaper (Bastion 300, Needle 480, Manta 650). With 75–110 credits per good heat plus a new season bonus (+50, and +100/60/30 for 1st/2nd/3rd), the first ship comes within 2–3 heats and modules (130–165) within 1–2. Speed matters more in play (`rate = 12 + speed × 0.075`, about a 15% pace spread across hulls, up from 10%). The garage shows green/red stat deltas against your active ship; modules show EQUIPPED / OWNED · TAP TO EQUIP / BUY · n ✧ (highlighted when affordable) / NEED n; the unlock button says how many credits you're short. Fixed a leftover handler at the end of `game.js` that overwrote the round-16 sound toggle with a no-op.
- Round 20: hub ship picker. A racing-game-style ship select sits above the callsign: a rotating 3D micro-figure on a pedestal lit in the ship's colour (its own small WebGL renderer, drawn only while the hub is visible), ‹ › to browse all four hulls, class and status (ACTIVE / OWNED / LOCKED, with locked ships shown translucent), mini stat bars, and one action (READY TO FLY / FLY THIS SHIP / "650 ✧ · OPEN GARAGE", which opens the garage on that ship). It stays in sync with garage changes. Mobile toasts moved above the pinned launch bar.
- Round 20 playtest report (subagent): PvP, solo flow and world art verified demo-ready. New issues are in "Playtest 3 fixes". Side effect: the shared profile now owns Manta and Ion Vector.
- Round 21: playtest-3 fairness and results bundle. Bots scale with rank from 0.45× to 2× (`.45 + rp/2400`; the server clamp was raised to match), so at mid rank they score about 7–14k against a human's typical 8–15k (a flawless run still wins). The server heat-score cap went from 25k to 60k (boosted runs were silently clamped). Esc during the 3-2-1 pauses solo. Results use HEAT / TOTAL / LAP columns, and the flight-time row became "TIME BONUS +60". Pilots who quit stay listed as LEFT. The season toast moves to the top on the results screen. Locked-hull module buttons are disabled ("UNLOCK HULL FIRST"); the guest bot stepper is dimmed with "· HOST ONLY". The Forge card is a div with a real, focusable "Race this world" button.
- Round 22 (partial, usage limit reached): the lap banner now reads "LAP LINE · KEEP SCORING" (it no longer looks like the race ended), and menu screens blur and dim the 3D scene behind them. Still open from the clarity pass: the desktop floating launch bar, a slimmer Flight Vector panel, the clock-end "TIME" moment and 3D art in the garage hero.
- Round 23 (clean-up pass): rebuilt the race HUD from scratch (same element IDs, new `hud2` classes). It's now a big score with a combo multiplier, slim hull and boost bars, a quiet centred course/lap line with a hairline progress bar, a big placing and clock top right, and a borderless standings list. Removed the centre Flight Vector box, the bottom hint rows, the boxed countdown and the boxed toasts (pickups now float as label + value). The boost button only shows on touch devices. Added an objective briefing (objective, three icon cards for ring trails / hazards / boost, device controls, the course quirk). It shows before every solo season (Enter to start), is reachable via the race menu's HOW TO PLAY, and replaces the PvP lobby's rules text.
- Round 24 (clean-up pass): obstacle redesign (`obstacles.js`). Every hazard glows one fixed danger red on all worlds, so "red hurts" always holds and hazards never blend with scenery. Mines (centre line and single hazards) are a bright core in a wireframe cage with a turning warning ring. Blockers became laser fences (two posts, pulsing beams, a faint field). Asteroid rocks are clean low-poly in the world's material with red outlines: no random warping, stuck-on bits or ring per rock. Ring planes are broken arcs with a guide ring. Removed the 1px course rails, engine trails and ghost trails (the wiry debug look). Scenery instances start hidden and are culled from the flight corridor near the camera; bot name tags hide when a ghost is alongside. Added a ResizeObserver so the renderer refits on any layout change.
- Round 25 (clean-up pass): attractions (`landmarks.js`). Each world's lap now flies through three named set pieces at fixed lap fractions (the same for every pilot), each with an "ENTERING · NAME" caption. Rift: The Broken Halo, Relay Tunnel, Docking Spire. Io: Pele's Arch, Eruption Field, Storm Cell. Titan: Crystal Cathedral, Methane Falls, Frozen Gate. Helix: The Eye, Dust Pillars, The Derelict. Earthfall: Orbital Station, Aurora Curtain, Satellite Swarm. Jovian: The Cassini Gap, Europa Flyby, Magnetic Arc. They're scenery only, with a clear opening of radius 9 or more around the route; forged worlds get the set for their kind. Verified captures on Rift, Io and Jupiter, and an error-free step-through on Titan, Helix and Earthfall.
