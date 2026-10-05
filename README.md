# Starwake: cartoon battle racing

Race your friends and zap them. Starwake is a browser battle racer for 2–8 players on any device: grab "?" pods, snipe rivals with laser blasters, steal their points, and out-fly five alien rivals whose trash talk is written by OpenAI. Play live through an invite link, or dare a friend to beat your recorded run whenever they're free.

Built for the Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge. The submission copy is in [SUBMISSION.md](SUBMISSION.md).

## How to play

- **Score the most points across three 60-second heats** (a challenge is a single heat).
- **"?" pods** give a random item, and racers further behind get better ones:
  - **Laser Blaster:** 3 shots that auto-aim at the racer ahead.
  - **Comet Seeker:** hunts down 1st place.
  - **Bubble Shield:** blocks one zap.
  - **Turbo Snack:** an instant boost.
- **Zaps** spin the target out and **steal 8% of their points** (minimum 40). The leader wears a **crown** worth double. In the final 15 seconds, **Zap Frenzy** doubles every steal again.
- **Ring trails** score 100 × your combo (up to ×5), and a perfect trail adds +300. Gold stars refill boost. **Space cows** are worth +250. Glowing-outlined rocks and mines cost hull.
- **Controls:**
  - Steer with **A/D** or **←/→**, climb with **W/S** or **↑/↓**.
  - **Space** boosts and **F** fires.
  - **1–3** send emotes in multiplayer.
  - On a phone, drag to steer and use the on-screen buttons.

## Playing together

- **Live battles:** **⚔ BATTLE → OPEN A BATTLE ROOM**, then share the invite link. Friends join from any phone or laptop with no install or account.
  - The server keeps every screen in sync: live positions, zaps, victim-confirmed point steals, the room-wide steal feed and emotes.
  - After heat 3, the host can **REMATCH** with the same crew.
  - Sim pilots fill empty seats.
- **Async dares:** on any results screen, press **BEAT MY RUN**.
  - Your friend races your recorded flight on the exact same track layout, as a ghost they can zap. The target stays fixed.
  - Each chain of dare links keeps a **ladder** of everyone who tried.
  - The hub's **Your dares** card shows who replied.

## Built with OpenAI

- **AI rivals:** ZORP, BLIX, MUNGO, QUEEP and GLORB taunt you when they zap you, get zapped, or take the lead.
  - Lines are written per world by `netlify/functions/banter.ts` and cached once per course.
  - `npm run warm:ai <site>` pre-generates them after deploy.
- **AI announcer:** a two-sentence recap of every heat and a three-sentence story at the end of each season, from the real standings and stats.
- **World Forge:** turns a sentence into a raceable world (track shape, palette, gravity, crosswind, hazards) using structured outputs. `course-forge.js` clamps every value so AI tracks are fair and flyable.
- **Limits and fallbacks:**
  - Every AI call is rate-limited per IP per day, and repeated prompts are cached.
  - Without `OPENAI_API_KEY` the game falls back to canned lines and template recaps.

## Architecture

| Area | Files |
|---|---|
| Rendering | three.js, a toon/ink cartoon style, six hand-built worlds (`world-themes.js`, `landmarks.js`, `skyline.js`, `textures.js`), a post-processing grade |
| Battle systems | `combat.js` (items, zaps, NPC racers, bounty, frenzy), `aliens.js` (alien pilots, canned lines), `critters.js` (space cows, UFO spectators, crown), `challenge.js` (run recording, links) |
| Game shell | `game.js` (race loop, HUD, lobby, results), `mode-hub.js` / `mode-bridge.js` (hub, invite and dare landings) |
| Server | `netlify/functions/game.ts`, `forge.ts`, `banter.ts`, `netlify/lib/openai.ts` |

### `netlify/functions/game.ts`

Rooms live on Netlify Blobs with strong consistency and conditional writes.

- **Who can act:** each pilot has a private token that authorises every action. The server is authoritative for heat clocks, sim-pilot scores (rubber-banded to the human field) and score caps (by time flown).
- **Zaps and steals:** zap inboxes and confirmed steals are scoped by room, season round and heat.
- **Challenges:** stored with ladders. A dare's target and every ladder entry come from scores the server recorded for a signed-in pilot.

## Development

```bash
npm install
npm run dev
```
That serves http://127.0.0.1:5180, running the real Netlify functions with an in-memory Blobs store. `window.__starwake` exposes dev hooks: `state`, `scene`, `combat`, `capture()` and `stats()`.

```bash
npm run test:battle
```
A laptop and an emulated iPhone, in isolated browsers, play a full PvP season. They join through an invite link, zap each other (the keyboard on one, the touch FIRE button on the other), check credits, emotes, standings and security, keep the room when the host finishes last, and run a rematch. 28 checks.

## Deploy (Netlify)

`netlify.toml` builds with `npm run build`, publishes `dist/` and serves functions from `netlify/functions`. Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-5-mini`) in the site's environment variables, redeploy, then run `npm run warm:ai https://<site>`.
