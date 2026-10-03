# Starwake

Starwake is a sci-fi flight racer with a cinematic cockpit intro, a PvE/PvP race hub, a ship garage, and an endless free-flight prototype. Pilots race the same seeded course, collect signal rings, avoid debris, and earn rank points and credits to unlock ship variants.

## Race rules

- A heat lasts 60 seconds. In a multiplayer lobby, every device receives the same start and finish timestamps and course seed.
- Each course is a closed, curved 3D circuit. Crossing the finish gate starts another lap without slowing or freezing the ship; the shared heat clock decides when everyone stops.
- Signal rings and Star Cores each add 250 points. Collecting a Star Core also restores one boost-fuel segment and triggers a brief speed burst. Each remaining hull point adds 35 points, each lap adds 300 points, and flight time adds 1 point per second.
- The highest three-heat score wins. Ties go to the pilot with the fastest total flight time.
- Ships are sidegrades: speed, handling, hull, fuel, and width change together. Wider ships can take more hits and carry more fuel, but are harder to steer through gaps.
- Race routes change direction in three dimensions. Shared course and route seeds keep a lobby's layout consistent across devices.

## Flight deck

- Choose PvE to race sim pilots, or PvP to create a room or join with a five-character code.
- Select one of six race maps: Neon Rift, Io Storm, Titan Veil, Helix Deep, Earthfall Circuit, and Jovian Shear. Earthfall adds a steady pull toward the planet; Jovian Shear adds magnetic crosswind and dangerous ring-plane crossings.
- Free Flight streams seeded planetary and asteroid domains ahead as you explore, while recycling distant regions to bound memory. It is a forward-thrust prototype with lateral and altitude steering; it does not yet provide full six-axis thrust, saved discoveries, or network-shared sectors.
- World Forge sends your prompt to OpenAI (through `netlify/functions/forge.ts`), which designs a new course with structured outputs: name, setting, palette, track shape, gravity, crosswind, and hazards. `course-forge.js` clamps every value into ranges the engine can fly, so the forged course races like an authored one. It is saved to your profile, and in a lobby it travels with the room so every pilot gets the same course. Without the AI (local preview or no API key), it falls back to the closest authored map with a prompt-seeded variant.

## Controls

- Steer left/right with **A / D** or **← / →**; change altitude with **W / S** or **↑ / ↓**. On touchscreens, drag in either direction.
- Hold **Space** or the **BOOST** button to spend fuel for a burst of speed.
- Fly through teal signal rings. Dodge asteroids, blocker gates, and broken ring arcs.
- Chase the gold Star Cores for a fuel refill and a short, free boost burst.
- In Free Flight, forward thrust is automatic; steer laterally and vertically to roam between domains.

## Multiplayer

On a deployed site, choose **PvP → Create Private Race**, share the five-character code, and have friends join from their own devices. The host can add sim pilots to open seats and starts each shared heat. The local preview uses browser storage, so its lobbies are limited to that browser; deploy the project to enable cross-device rooms. Scores are still client-submitted in this prototype, so treat online matches as casual until result validation moves server-side.

## Netlify

The project is configured to build with `npm run build` and publish `dist/`. Multiplayer room state is handled by `netlify/functions/game.ts` and Netlify Blobs with strong consistency and conditional writes. The browser calls `/.netlify/functions/game` directly.

To enable the AI World Forge, set `OPENAI_API_KEY` in **Site configuration → Environment variables** on Netlify. Optional: `OPENAI_MODEL` (default `gpt-5-mini`) and `OPENAI_REASONING_EFFORT` (default `minimal`; set it empty for models without reasoning). The key stays server-side; the browser only calls `/.netlify/functions/forge`.

The companion `netlify-ready-game.zip` contains the source, lockfile, Netlify configuration, and function. Upload it using the publishing flow from the competition brief. After Netlify gives you a public URL, test two devices in the same lobby before sharing it as your submission.
