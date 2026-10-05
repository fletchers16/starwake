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

## Backlog
(ready / in-progress / done; each item notes the criterion it moves)

## Log
