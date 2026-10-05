# Starwake critique loop

Goal: push Starwake's contest score up, one graded cycle at a time. A cold critic analyses the code and plays the build, grades it on the contest rubric, and the findings are built, verified and committed before the next grade.

Started 2026-10-05 at the user's request. Runs **until the user stops it**. Replaces the art loop as the active loop (ART_LOOP.md keeps its style rules and performance budget, which still apply).

## Rubric (Handshake × OpenAI challenge, 25% each)
1. **Execution:** it works. Multiplayer on separate devices, no errors, no soft-locks, stable frame rate, state that agrees across screens.
2. **Creativity:** it's fresh. Battle racing with alien NPCs, items, the AI World Forge, challenges and quirky rules.
3. **Usefulness & value:** people would actually play it with friends. Quick to start, playable on phone and laptop, async challenges, replayability.
4. **Polish & thoughtfulness:** it feels finished. Onboarding a judge can follow alone, readable HUD, juice, consistent cartoon style, sound, accessibility.

Score each 1–10 with evidence. A 10 is demo-ready on a phone with no explanation needed.

## Rules
- Local commits only, one per cycle (`Cycle N: …`). **Never deploy, push or post.**
- Assets: CC0 only, and ask the user before any download (file, source, size, license).
- Protect what works: battle mode as the headline, multiplayer sync, the two-device test, the draw-call budget (220), the cartoon style.
- The OpenAI key stays server-side.

## How each cycle works
1. **Grade** (odd cycles, and whenever the backlog has fewer than 3 `ready` items): spawn a cold critic agent. It:
   - reads the code for bugs, dead code, desyncs, error handling and maintainability risks;
   - runs `npx vite build` and `npm run test:battle`;
   - plays solo and battle in the browser pane via the `window.__starwake` hooks;
   - returns rubric scores with evidence and the top issues ranked by score impact.
   It doesn't edit or commit anything. While it runs, don't edit game files (that reloads the page it's testing).
2. **Triage** its findings into **Backlog** (with the rubric criterion each one moves).
3. **Build** the top 1–3 `ready` items (biggest score gain per hour first).
4. **Verify:** `npx vite build`, `npm run test:battle` (16/16), frame captures of what changed, console clean, `__starwake.stats()` under budget.
5. **Commit**, mark items done, add a **Log** line with the latest scores.

## Scores
| Cycle | Execution | Creativity | Usefulness | Polish | Notes |
|---|---|---|---|---|---|
| 1 (grade) | 6 | 7 | 6 | 6 | Build OK, battle test 16/16; server trusts scores, PvP steal desync, solo scoring lopsided (bots ~10k vs human ~1k), 287 draw calls mid-heat, intro headline unreadable |

## Backlog
(ready / in-progress / done; each item notes the criterion it moves)

**From grade 1:**
1. `done` (C2) [Usefulness/Polish] **Scoring balance.** Bots score ~10k against a human's ~1k, so a 150-point zap barely matters. Bots should track the human field (rubber-banded), and steals should scale with the target's score.
2. `done` (C2) [Execution] **Server trusts scores.** Cap a heat score by elapsed time, and cap bot adjustments.
3. `done` (C2) [Execution] **PvP steal desync.** The shooter banks points even when the victim's shield blocks; leader multipliers differ per client. The victim should report the actual amount stolen back through the zap inbox.
4. `ready` [Usefulness] **OpenAI optional.** The forge 503s without a key. Add an always-on AI touch (rival personalities and taunts, an AI race recap), with a key check on deploy.
5. `ready` [Execution/Security] **Forge rate limit** (per IP per day) plus a prompt cache.
6. `in-progress` (C2: in-flight guard, empty-room cleanup; challenge blobs still have no TTL) [Execution] **Live sync.** No in-flight guard on the 450 ms interval; zap, challenge and room blobs never expire.
7. `done` (C2, retry with backoff) [Polish] **Failed finish.** Retry `complete` with backoff, and fall back to the local score in solo (currently DNF 0 after ~70 s).
8. `done` (C2) [Polish] **Intro headline unreadable** ("RACE YOUR FRIENDS." dark on dark).
9. `in-progress` (C2: copyable link fallback; the mobile CTA overlap remains) [Polish] **Share failure.** Shows "LINK READY ✓" next to a failure toast, with no copyable URL. The mobile sticky CTA covers the course cards.
10. `in-progress` (C2: ghosts removed, shared textures kept, star sprites disposed; game.js split remains) [Execution] **Dead code and textures.** botGhosts remnants; combat.js disposes shared glow/star textures on every effect; bot dizzy sprites never disposed; game.js monolith.
11. `ready` [Execution] **Draw calls** 287 mid-heat on Io (budget 220).
12. `idea` [Creativity/Usefulness] AI rival personalities (OpenAI): names, taunts on zap, AI-written recap.
13. `idea` [Usefulness] Challenge ladder plus a daily "Zap Cup" (chain challenge links via `parent`, home-screen rematch nudges).
14. `idea` [Creativity] Signature items with counterplay: Cow Catapult, a reflecting dodge-roll, team mode.

## Log
- Cycle 2: fixed the top grade-1 findings.
  - **Bots:** rubber-banded to the human field (`0.55·pace·field + 0.45·base`, identical on client and server); steals are 6% of the target's score (min 150). In a solo test the bots stayed within about 20% of the player.
  - **Server:** caps heat scores by time flown (1500 + 320/s) and per-report bot swings (±1500), which accumulate across humans.
  - **PvP steals:** victim-confirmed through a new `paid/` inbox, so the shooter is credited exactly what the victim lost. New e2e check; 17/17 pass.
  - **Reliability:** live sync has an in-flight guard; empty rooms clean up their blobs; heat reports retry with backoff.
  - **Polish:** the intro headline uses a shadow outline instead of a stroke; failed shares show a copyable link.
  - **Cleanup:** the dead ghost system is removed (two leftover loops would have thrown in Free Flight); shared textures are no longer disposed per effect.
