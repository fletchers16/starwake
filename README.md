# Starwake: cartoon battle racing

**Play: https://starwakeracing.netlify.app**

First place is a target. Starwake is a cartoon space battle racer for 2–8 friends on any phone or laptop. Share a link or QR code: no install, no account. Grab crates, blast whoever is ahead to steal their points, barrel-roll their lasers straight back, and fight for the crown. OpenAI writes the alien rivals' trash talk, recaps every race, and fuses everyone's ideas into a brand-new world.

Built for the Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge. Submission copy: [SUBMISSION.md](SUBMISSION.md).

## How it maps to the judging criteria

| Criterion | What Starwake does |
|---|---|
| **Execution** | Live multiplayer for 2–8 on separate devices, verified with full three-heat seasons on the deployed site (laptop vs a throttled-4G phone: 0 errors, both screens agree on every standing, each screen shows the other player within a second). Reloads mid-race resume your seat; the room survives the host leaving; rematches; server-side score caps and signed pilot tokens. Automated suites plus a live playtest. See [docs/VERIFICATION.md](docs/VERIFICATION.md). |
| **Creativity** | Racing plus combat: steal points with zaps, reflect shots with a barrel roll, a crown worth double, a final-15-second Zap Frenzy, forks with a boost lane and a ring lane. **Forge Party** fuses every player's one-line idea into the track the room races. Async "beat my run" dares replay your flight as a ghost your friend can zap. |
| **Usefulness / value** | A 3-minute session that works across phones and laptops with one link or a QR code. Solo races against five alien rivals when friends are busy; dares when they're in another time zone; a coached first race and Flight School so nobody needs the rules explained. |
| **Polish** | Hand-built cartoon ships, crates and grumpy asteroids with ink outlines; comic ZAP!/POW!/BOING! bursts; six themed worlds; a cartoon HUD sized separately for phones; season awards and a heat-by-heat chart; graceful AI fallbacks; reduced-motion support. |

## How to play

- **Score the most points across three 60-second heats** (a dare is a single heat).
- **"?" crates** give a random item, and racers further behind get better ones: a **Laser Blaster** (3 shots that auto-aim at the racer ahead), a **Comet Seeker** (hunts 1st place), a **Bubble Shield** (blocks one zap) or a **Turbo Snack** (instant boost).
- **Zaps** spin the target out and **steal 8% of their points** (never more than half). The leader wears a **crown** worth double, and in the final 15 seconds **Zap Frenzy** doubles every steal again.
- **Barrel roll** (**Q**, or tap **ROLL**): a zap that lands mid-roll bounces back at whoever fired it. Alien rivals flash **LOCKED ON** before they shoot, so you can time it.
- **The track** sweeps left, right, up and down. At a **fork**, a pillar wall splits it: the left lane has boost gates, the right lane a ring trail and a crate. **Boost gates** give a burst of speed; **ring trails** come as arcs, slaloms, corkscrews and dives and score 100 × your combo (up to ×5). Grumpy asteroids and sea-mines cost hull.
- **Controls:** steer with **A/D** or **←/→**, climb with **W/S** or **↑/↓**, **Space** boosts, **F** fires, **Q** rolls, **1–3** send emotes. On a phone, drag to steer and use the on-screen buttons.
- **Flight School** (in the hub) replays the coached first race: fly through a crate, zap the racer it puts ahead, then roll a telegraphed shot.

## Playing together

- **Live battles:** **PLAY WITH FRIENDS** opens a room; share the link or let friends scan the lobby's QR code. The server keeps every screen in sync: positions, zaps, victim-confirmed steals, the steal feed and emotes. After heat 3, the host can **REMATCH**. Alien rivals fill empty seats.
- **Forge Party:** in the lobby, everyone pitches a world ("candy volcano", "haunted space station"), and the aliens chip in too. The host fuses the ideas and OpenAI builds the course the whole room races. One live fusion produced *SUGARFIRE: a haunted candy station perched above molten syrup vents*.
- **Async dares:** on any results screen, **BEAT MY RUN** sends a link. Your friend races your recorded flight on the same layout as a ghost they can zap; every reply joins that link's ladder.

## Built with OpenAI

- **Alien rivals:** ZORP, BLIX, MUNGO, QUEEP and GLORB taunt you when they zap you, get zapped, or take the lead, in lines written per world (`netlify/functions/banter.ts`, cached per course).
- **Announcer:** a two-sentence recap of every heat and a three-sentence season story, written from the real standings and stats.
- **World Forge and Forge Party:** a sentence (or everyone's fused ideas) becomes a raceable world: track shape, palette, gravity, crosswind and hazards, via structured outputs. `course-forge.js` clamps every value so AI tracks are fair and flyable.
- **Limits and fallbacks:** per-IP daily limits, a site-wide daily cap (`AI_DAILY_CAP`) and caching. Without a key or credit, the game uses canned lines, template recaps and remixed built-in worlds, so nothing breaks.

## Architecture

| Area | Files |
|---|---|
| Rendering | three.js with a toon/ink style: `ships3d.js` (cartoon ships), `obstacles.js` (asteroids, mines, boost gates, fork pillars), `world-themes.js`, `landmarks.js`, `skyline.js` |
| Battle systems | `combat.js` (crates, items, zaps, comic bursts, alien racers, bounty, frenzy), `aliens.js`, `critters.js`, `challenge.js`, `coach.js` |
| Game shell | `game.js` (race loop, HUD, lobby, Forge Party, results, awards), `mode-hub.js` / `mode-bridge.js` (landing, hub, invite and dare links), `cartoon-skin.css` |
| Server | `netlify/functions/game.ts` (rooms on Netlify Blobs with strong consistency and conditional writes), `forge.ts`, `banter.ts`, `netlify/lib/openai.ts` |

The server is authoritative for heat clocks, alien racer scores (rubber-banded to the human field), score caps and room state. Each pilot has a private token that authorises its actions; zap and steal records are scoped by room, season and heat.

## Development

```bash
npm install
npm run dev
```
Serves http://127.0.0.1:5180 with the real Netlify functions and an in-memory Blobs store. `window.__starwake` exposes dev hooks (on a deployed site only when a test sets the `starwake-playtest` localStorage flag).

```bash
npm test
```
Runs the battle (35 checks), challenge (11) and coach (8) suites against a local dev server.

```bash
node tests/live-playtest.mjs https://starwakeracing.netlify.app
```
Plays a full live season on a deploy: a laptop and a phone on throttled 4G with a phone-speed CPU, both steering, firing and rolling. Reports sync lag, teleports, frame rate, rejected server calls and whether both screens agree on the standings.

## Deploy (Netlify)

`netlify.toml` builds with `npm run build`, publishes `dist/` and serves functions from `netlify/functions`. Set `OPENAI_API_KEY` (optionally `OPENAI_MODEL`, default `gpt-5-mini`, and `AI_DAILY_CAP`, default 800), redeploy, then run `npm run warm:ai https://<site>`.
