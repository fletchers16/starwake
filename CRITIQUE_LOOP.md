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
| 3 (grade) | 6 | 7 | 6 | 5 | C2 fixes hold mostly; `--ink` override made titles dark on dark (regression); novices still crushed by the bot floor and minimum steal; end-of-heat steals lost; player ids double as secrets; bot swings stackable; 279 draw calls on phone |
| 5 (grade) | 7 | 7 | 6 | 6 | No errors across solo, season, challenge and PvP; max 183 calls; recap written from partial standings; cast cache poisonable; zap counts unbounded; challenge still a 3-heat season; bot lap times 59.5 s |
| 7 (grade) | 6 | 7 | 6 | 6 | Draw calls back over budget (alien ships about 26 meshes each, peak 293); HUD, crown and standings use different scores; challenge results contradict themselves; strip text 7–9 px; late PvP zaps dropped; paid steals unchecked |

## Backlog
(ready / in-progress / done; each item notes the criterion it moves)

**From grade 1:**
1. `done` (C2) [Usefulness/Polish] **Scoring balance.** Bots score ~10k against a human's ~1k, so a 150-point zap barely matters. Bots should track the human field (rubber-banded), and steals should scale with the target's score.
2. `done` (C2) [Execution] **Server trusts scores.** Cap a heat score by elapsed time, and cap bot adjustments.
3. `done` (C2) [Execution] **PvP steal desync.** The shooter banks points even when the victim's shield blocks; leader multipliers differ per client. The victim should report the actual amount stolen back through the zap inbox.
4. `done` (C4, needs OPENAI_API_KEY on deploy) [Usefulness] **OpenAI optional.** The forge 503s without a key. Add an always-on AI touch (rival personalities and taunts, an AI race recap), with a key check on deploy.
5. `done` (C4) [Execution/Security] **Forge rate limit** (per IP per day) plus a prompt cache.
6. `in-progress` (C2: in-flight guard, empty-room cleanup; challenge blobs still have no TTL) [Execution] **Live sync.** No in-flight guard on the 450 ms interval; zap, challenge and room blobs never expire.
7. `done` (C2, retry with backoff) [Polish] **Failed finish.** Retry `complete` with backoff, and fall back to the local score in solo (currently DNF 0 after ~70 s).
8. `done` (C2) [Polish] **Intro headline unreadable** ("RACE YOUR FRIENDS." dark on dark).
9. `in-progress` (C2: copyable link fallback; the mobile CTA overlap remains) [Polish] **Share failure.** Shows "LINK READY ✓" next to a failure toast, with no copyable URL. The mobile sticky CTA covers the course cards.
10. `in-progress` (C2: ghosts removed, shared textures kept, star sprites disposed; game.js split remains) [Execution] **Dead code and textures.** botGhosts remnants; combat.js disposes shared glow/star textures on every effect; bot dizzy sprites never disposed; game.js monolith.
11. `ready` [Execution] **Draw calls** 287 mid-heat on Io (budget 220).
12. `done` (C4) [Creativity/Usefulness] AI rival personalities (OpenAI): names, taunts on zap, AI-written recap.
13. `idea` [Usefulness] Challenge ladder plus a daily "Zap Cup" (chain challenge links via `parent`, home-screen rematch nudges).
14. `idea` [Creativity] Signature items with counterplay: Cow Catapult, a reflecting dodge-roll, team mode.

**From grade 3:**
15. `done` (C3) [Polish] **`--ink` regression:** the cartoon outline variable overrode the light text colour, so titles render dark on dark.
16. `done` (C3) [Execution] **End-of-heat steals lost:** live sync stops at done, and credits after done are ignored.
17. `done` (C3) [Execution/Security] **Player ids double as secrets** (broadcast to everyone; they authorise leave, complete and start). Issue a separate token.
18. `done` (C3) [Execution] **Bot swings stackable:** `botAdjust` is added on every `complete` call.
19. `done` (C3) [Usefulness] **Novices crushed:** the 0.45·base bot floor and the 150 minimum steal. Scale with time flown, cap bot zaps per heat, steal 8%.
20. `done` (C3) [Polish] **Rules text wrong:** "steals 150"; bounty, Frenzy and shield not explained; the challenge says three heats; the challenger is missing from the standings.
21. `in-progress` (C3: lap times; the CTA overlap, briefing centring and winner-name repeat remain) [Polish] **Small UI faults:** bot lap times always 59.5 s; repeated winner name; mobile CTA overlap; mobile briefing off-centre.
22. `done` (C6) [Polish/Usefulness] Live standings strip with a steal ticker ("−120 → BLIX"), crown and Frenzy markers.

**From grade 5:**
23. `done` (C5) [Execution/Polish] Recap written once from incomplete standings: write it when the room reaches results or complete, and redo it if standings change.
24. `done` (C5) [Execution/Security] Banter cast cache keyed by client-supplied course: use the server catalog for built-ins, hash forged courses, add a version.
25. `done` (C5) [Execution] Victims apply any claimed zap count: cap new zaps per shooter per sync on both sides.
26. `done` (C5) [Polish] Bot lap times still 59.5 s at rookie scores: base them on pace, not score.
27. `done` (C5) [Usefulness/Polish] A challenge continues into a 3-heat season: end after one heat and lead with SEND IT BACK.
28. `done` (C5) [Polish] Fallback recap wording is wrong ("kept it clean" after being zapped); include place.
29. `done` (C5) [Polish] Taunt bubble covers the item card on mobile; checkpoint label wraps.
30. `in-progress` (C5: names, pause cap, 403; the rate-limit atomicity and forge helper dedupe remain) [Execution] Duplicate pilot names; non-atomic, non-expiring rate limit; unbounded solo pause; auth errors return 400; forge duplicates helpers; PB sticker on an idle run.

**From grade 7:**
31. `in-progress` (C7: ships 27→~12 meshes, LOD, beacons 16→1, pods without outlines; Io max 196, Neon Rift median 160–185 but peaks 225–240) [Execution] Draw calls 267–293: merge ship parts by material.
32. `done` (C7) [Polish/Execution] One score everywhere: the HUD shows r.score while standings show the projected score; the crown uses r.score too.
33. `done` (C7) [Polish/Usefulness] Challenge results: subtitle says "heat 1 of 3"; the recap ignores the head-to-head.
34. `done` (C7) [Usefulness] Pin the challenger and human rivals in the live strip.
35. `done` (C7) [Polish] Strip and feed text 7–9 px; the LAP banner covers the HUD; "−0 pts" on ties.
36. `done` (C7) [Execution] Late PvP zaps dropped after done; zapSeen jumps past the 2-hit cap.
37. `done` (C7) [Execution/Security] Paid steals need a matching zap record and a cap; the C6 log overstated the feed (it shows your own steals only).
38. `done` (C8) [Creativity/Usefulness] Season-end AI story card with share/challenge buttons.
39. `in-progress` (C8: REMATCH done; the steal broadcast and emotes remain) [Usefulness/Polish] Social PvP: broadcast all human steals, emote taunts, REMATCH.

## Log
- Cycle 2: fixed the top grade-1 findings.
  - **Bots:** rubber-banded to the human field (`0.55·pace·field + 0.45·base`, identical on client and server); steals are 6% of the target's score (min 150). In a solo test the bots stayed within about 20% of the player.
  - **Server:** caps heat scores by time flown (1500 + 320/s) and per-report bot swings (±1500), which accumulate across humans.
  - **PvP steals:** victim-confirmed through a new `paid/` inbox, so the shooter is credited exactly what the victim lost. New e2e check; 17/17 pass.
  - **Reliability:** live sync has an in-flight guard; empty rooms clean up their blobs; heat reports retry with backoff.
  - **Polish:** the intro headline uses a shadow outline instead of a stroke; failed shares show a copyable link.
  - **Cleanup:** the dead ghost system is removed (two leftover loops would have thrown in Free Flight); shared textures are no longer disposed per effect.
- Cycle 3: fixed the grade-3 findings.
  - **Regression:** `--ink` (my cartoon CSS had overridden the light text colour) is now `--outline`, with a luminance check added to the e2e test.
  - **Late steals:** multiplayer keeps syncing 2 s past the clock and applies late credits before reporting.
  - **Security:** pilots get a private token (never sent in room data), required for live/leave/complete/start/next; e2e confirms you can't act with someone else's public id.
  - **Bot swings:** counted once per pilot per heat.
  - **Novices:** the bot floor is capped at 1.4× the field + 300; steals are 8% (min 40); sim pilots zap you at most 3 times per heat.
  - **Rules text:** the briefing states the real rules (8%, crown ×2, Frenzy ×2, item list); a challenge says one heat; the challenger is listed in the results table; bot lap times vary.
  - **Tests:** e2e 20/20.
- Cycle 4: always-on OpenAI layer.
  - **Rivals:** `netlify/functions/banter.ts` writes per-course trash talk for the five aliens (cached per course in Blobs, so about one call per course ever) and a two-sentence announcer recap after each heat.
  - **In race:** a speech bubble when an alien zaps you, gets zapped or takes the lead ("AI" tag when OpenAI wrote it).
  - **Results:** a race-recap card ("WRITTEN BY OPENAI").
  - **Fallbacks:** canned lines and a template recap without a key.
  - **Rate limits:** shared `netlify/lib/openai.ts` (structured outputs plus a per-IP daily limit); the forge is limited to 15/day/IP with a prompt cache.
  - **Verified:** 503 fallback path, taunt bubble, recap card; e2e 20/20. The real AI path needs `OPENAI_API_KEY` on Netlify.
- Cycle 5: fixed the grade-5 findings.
  - **Recap:** written only from final standings and redone when they change; the fallback names your place and zap balance.
  - **Cast cache:** keyed from the server catalog (built-ins) or a hash (forged), versioned.
  - **Zaps:** max 2 new per shooter per update on server and client; back-to-back hits steal from the remaining score.
  - **Bot laps:** from pace and skill (now 51–54 s instead of always 59.5).
  - **Challenges:** one heat (HUD "★ CHALLENGE · 1 HEAT", results say BACK TO HANGAR plus the verdict).
  - **Mobile:** the taunt bubble sits above FIRE/BOOST; the checkpoint label no longer wraps.
  - **Server:** duplicate names get a number, solo pause is capped at 120 s per heat, auth failures return 403.
  - **Deploy:** `npm run warm:ai <url>` pre-warms the AI lines for all six courses.
  - **Tests:** e2e 20/20.
- Cycle 6: live battle readability. The standings strip marks the crowned leader (♛) and shows a ZAP FRENZY header in the final 15 s. A new steal feed lists every point swing as it happens ("YOU +47 from BLIX", NPC-on-NPC, and your own confirmed PvP steals; other players' steals aren't broadcast), coloured by whether you gained or lost. Phones now get a compact top-3 strip and feed (standings used to be hidden under 760 px). e2e 20/20.
- Cycle 7: fixed the grade-7 findings.
  - **Draw calls:** ship hulls are merged by material (body, trim, ink) with NPC glow parts merged too, so a ship is about 12 meshes instead of 27. Distant NPCs hide their pilot, bowl and tag. Neon Rift's 16 beacon sprites are one point cloud, and pods dropped their outline mesh. Io max is now 196; Neon Rift peaks are still 225–240 (median about 170).
  - **One score:** projectedScore everywhere (HUD, standings, crown and steal size).
  - **Challenges:** a head-to-head subtitle, and the recap includes the duel (fallback and AI input).
  - **Strip:** pins human rivals and the challenger; text at least 11 px (9 px on phones); toasts sit beneath the HUD; ties show ±0.
  - **Late PvP zaps:** accepted during the 2 s grace; zapSeen advances only by applied hits.
  - **Paid steals:** need a matching zap record and are capped at 1500 per zap.
  - **Tests:** e2e 20/20.
- Cycle 8: season finale.
  - **Season story:** after heat 3 the recap becomes a three-sentence story (OpenAI `season` request: champion, rivalry, a dare to run it back), with a template fallback built from the season table and accumulated zap/cow stats.
  - **REMATCH · SAME CREW:** a new host-only `rematch` server action restarts heat 1 for the whole room with scores and bot swings cleared. Other players are pulled in by the poll (heat 3→1 resets their total); non-hosts see "waiting for the host".
  - **Verified:** full 3-heat solo season → story → rematch → heat 1; e2e 20/20.
