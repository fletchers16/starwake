# Starwake art & quality loop

Goal: make Starwake look and feel like a hand-crafted indie game, not a generated one. Borrow proven styles, ideas and techniques from indie games and CC0 asset packs, build them into the game, and keep hardening quality.

Started 2026-10-03 at the user's request. Runs **until the user stops it**.

## Rules
- **Assets: CC0 only, and ask first.** Before any download, ask the user in chat with the file name, source URL, size and license, and wait for a clear yes. If the user isn't around, park the idea as `needs-asset-approval` and move on. Log every approved asset in **Asset log**. Never hotlink; vendor approved files into `public/assets/` with the license noted.
- **Ideas, not copies.** Take techniques and moods from other games; never copy their art, names, logos or UI.
- **Protect what works:** world identity, the clean HUD, one danger red for hazards, skill-based ring trails, multiplayer sync, the briefing screen.
- Local commits only, one per round. Never deploy, push or post.

## How each round works
1. **Research** (when fewer than 3 ideas are `ready`): spawn a background research agent with web search. It returns idea briefs (reference game or pack, what makes it look good, how to build it in three.js here, cost, risk) and candidate CC0 sources (exact URL, license, size). It never downloads or edits game files. Triage the briefs into **Idea backlog**. While it runs, do a hardening task rather than game edits that would disturb it.
2. **Implement**: take the top `ready` idea. Build it in the matching module (`world-themes.js`, `landmarks.js`, `obstacles.js`, `audio.js`, HUD CSS, or a new focused module).
3. **Verify**: `npx vite build` passes. Capture real frames (`window.__starwake.capture()` → `/__dev/save-image`) on at least two worlds and look at them. Check the console for errors, and check the frame rate didn't regress (watch `renderer.info` draw calls and triangles).
4. **Harden**: fix anything the frames reveal. Every 3rd round, spawn a cold playtest agent and triage its findings into the backlog.
5. **Commit** as `Art N: …`, mark the idea done, add a **Log** line.

## Style rules (adopted from research round 1)
1. **Three hues per world.** Each world has a base, a complement and an accent, plus two global reserved colours: ring gold and danger red. Nothing else is saturated, and only the accent, rings and engines may bloom.
2. **Four depth layers.** Hero (rim-lit), midground (ramp-shaded), far (fog band) and sky, with stepped value contrast. The far fog colour always equals the sky's horizon colour.
3. **Silhouette first.** Every hero object, hazard and landmark must read as a solid shape against the fog with textures off. Use a rim or outline for that, not blanket emissive glow. Only hazards use red.

## Performance budget (baseline 2026-10-03, dev `window.__starwake.stats()`)
Baseline is 132–155 draw calls, 22k–35k triangles, about 4–6 ms CPU per frame across the six worlds. **Budget: under 220 calls, under 80k triangles, under 9 ms CPU.** Re-measure after every visual change.

## Idea backlog
Status: `ready` · `needs-asset-approval` · `in-progress` · `done` · `rejected`

1. `done` (Art 1) **Depth-ramp fog plus a matched horizon** (Firewatch). Patch `fog_fragment` to sample a per-world 3-band ramp by depth, with the far band equal to the sky horizon. Sources: ctrl500.com Firewatch article; halisavakis.com multi-coloured fog. Asset: none.
2. `done` (Art 2: grade pass + bloom threshold; per-world palette tightening split out as idea 9) **Palette discipline plus a grade pass** (Sayonara Wild Hearts). Tighten each world to three hues; add a ShaderPass after bloom for vignette, subtle grain and split-tone; raise the bloom threshold so only rings, engines and the accent bloom. Asset: none.
3. `done` (Art 3) **Fresnel rim light on hero objects** (Redout). Add a `rim.js` onBeforeCompile helper and apply it to the ship, landmarks and rocks; cut blanket emissive. Asset: none.
4. `ready` **Inverted-hull ink outline** on obstacles (danger red) and landmarks (dark ink). Use creased normals for flat geometry. Asset: none.
5. `ready` **Speed language**: screen-edge radial speed lines in the grade pass driven by speed, plus velocity-stretched dust quads. Sources: Codrops high-speed light trails; Anime-Speed-Lines. Asset: optional (idea 7).
6. `ready` **Two-tone ramp shading on scenery** (MeshToonMaterial with a 3-step gradientMap per world); exempt Titan ice, Earth and the ship. Asset: none.
7. `ready` (download approved by the user 2026-10-03) **Soft particle sprites** from the Kenney Particle Pack (CC0, https://kenney.nl/assets/particle-pack, about a 9.8 MB zip; vendor about 6 PNGs at 128 px, under 100 KB total) for Io plumes, Titan haze, pickup bursts and speed streaks.
9. `ready` **Per-world palette tightening**: audit each world's materials down to base, complement and accent (plus gold and red), and desaturate stray hues in scenery and particles.
8. `ready` (download approved by the user 2026-10-03) **Low-poly station modules** from the Kenney Space Kit (CC0, https://kenney.nl/assets/space-kit, about 6.5 MB zip; vendor 3–5 GLBs) to give the Neon Rift and Earthfall landmarks real modelled detail.

## Asset log
| File | Source | License | Size | Approved | Used in |
|---|---|---|---|---|---|

## Log
- Research round 1 (subagent): diagnosis: too many similar-saturation hues, everything glowing, no depth layering or silhouettes. Seven ideas and CC0 candidates triaged above; style rules adopted. Performance baseline measured (and fixed the measurement: `renderer.info` auto-resets per pass, so the dev `stats()` hook now accumulates across the composer).
- 2026-10-03: the user approved downloading the Kenney Particle Pack and Kenney Space Kit (CC0). Re-check the license on each page at download time; vendor only the files used.
- Art 1: depth-ramp fog (`fog-ramp.js`). Every material's fog chunk is patched via onBeforeCompile to step through per-world near/mid bands into the far fog colour, with shared uniforms so a world switch needs no recompile. The sky horizon is now set to equal the far fog (style rule 2). Forged worlds derive their ramp from their accent. Verified on Rift, Titan and Helix captures; no errors; 121–139 calls, 20–23k triangles, about 1 ms render CPU (within budget).
- Art 2: grade pass (`grade-pass.js`, last composer pass): split-tone (shadows toward the world's base/fog hue, highlights toward its accent), vignette 0.28, 3% animated grain. Bloom threshold raised from 0.72 to 0.84 (strength 0.26), so only rings, engines and neon accents bloom instead of every surface. Verified on Rift, Io and Jupiter: crisper contrast, rings read as the focus. 107–125 calls, about 1 ms CPU.
- Art 3: fresnel rim light (`rim.js`). The onBeforeCompile helper adds a rim term to emissive radiance and chains with the fog-ramp patch, driven by one shared colour (the world's near haze brightened 25%). Applied to the ship (0.7), landmarks (0.6), rocks (0.55) and all trackside scenery (0.45). Verified on Titan (ice spires now read as crisp silhouettes against the haze), Helix and Rift; 124–145 calls, under 1 ms CPU, no errors.
