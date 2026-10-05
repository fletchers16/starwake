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
| 9 (grade) | 6 | 7 | 6 | 6 | REMATCH reuses the last season's zap/paid records (phantom credits, dropped zaps); REMATCH button visible mid-season; pinned rivals hidden on phones; no second-season bonus; false leader toast at 0–0; vague challenge landing; Io peaks 217–223 |
| 11 (grade) | 6 | 7 | 7 | 6 | Social loop complete (invite, season, rematch, feed, emotes, named dare); bots drain the challenge ghost's score (wrong verdicts); phone overlaps; PvP heat recap ignores the human rival. Read: top 5–8, not reliably top 3; blocker = phone first impression and challenge trust |
| 13 (grade) | 6 | 7 | 7 | 6 | Ladder writes unauthenticated (60,000 posted with curl); verdict vs ladder disagree on the challenger's score; briefing opens scrolled to the bottom (focus); the sender never sees replies. Read unchanged (top 5–8); blocker = challenge trust |
| 15 (grade) | 5 | 7 | 6 | 6 | Live season deadlock: host handed off mid-heat (racing doesn't refresh lastSeen) and clients never re-read hostId; ladder still forgeable via challenge-save; dares card stale and miscounts; tie place mismatch; invite copy has no fallback; mid-season results offer to leave the crew. Read: not top 3 until the deadlock is fixed |
| 17 (grade) | 6 | 7 | 7 | 6 | Deadlock fix holds (close tab, hangar and simultaneous finish all OK); live and async loops work end to end; session fragility: reload = permanently out, VIEW FLIGHT DECK doesn't leave, rematch scores stale telemetry. Read: edging into top 5 |
| 19 (grade) | 6 | 7 | 7 | 6 | Between-heat reload, late join, rematch and emotes all work; a mid-heat reload restarts at 0; the seat can expire on the intro; silent drops never evicted (+13 s per heat); fake results for late joiners; device ids leak; bfcache. Read: about #4–5 |

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
14. `in-progress` (C20: barrel-roll reflect done) [Creativity] Signature items with counterplay: Cow Catapult, a reflecting dodge-roll, team mode.

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
39. `done` (C8–C10) [Usefulness/Polish] Social PvP: broadcast all human steals, emote taunts, REMATCH.

**From grade 9:**
40. `done` (C9) [Execution] REMATCH must not reuse zap/paid records (add a round to the keys; guard pre-start credits) and needs an e2e check.
41. `done` (C9) [Polish] `[hidden]` overridden by `.secondary-button{display:flex}`, so REMATCH shows mid-season.
42. `done` (C9) [Usefulness] Pinned rivals hidden on phones by an nth-child rule.
43. `done` (C9) [Usefulness/Polish] Season bonus keyed by score count, so it isn't paid after a rematch.
44. `done` (C9) [Polish] "YOU TOOK 1ST" toast at a 0–0 tie during staging.
45. `done` (C9) [Usefulness] Challenge landing should say who dared you, the score and the course.
46. `done` (C9) [Polish] Guest results button text; season fallback ignores human rivals; client name not synced after the server renames a duplicate.
47. `ready` [Execution] Io draw-call peaks 217–223.

**From grade 11:**
48. `done` (C11) [Usefulness/Execution] Sim pilots zap the challenge ghost, so the target drops ~60%. Only the player may zap it.
49. `done` (C11) [Polish] Feed credits YOU for bot hits on the ghost.
50. `done` (C11) [Polish] Phone emote chips overlap the bubble and the track.
51. `done` (C18) [Usefulness] Emotes on lobby and results screens.
52. `done` (C11) [Polish/Usefulness] PvP heat recap should mention the human rival.
53. `done` (C11) [Polish] The dare should be the challenge landing's headline.
54. `done` (C11) [Polish] Strip gaps unlabeled: show "175 AHEAD" / "40 BEHIND".
55. `done` (C11) [Polish] "Sticker unlocked" repeats every PB.
56. `done` (C11, verified: at full scroll every card clears the pinned CTA; the briefing is centred, 20 px each side, no horizontal overflow; the critic's screenshot included pane padding) [Polish] Phone first impression: hub sticky CTA covers course cards; briefing off-centre (now the top-3 blocker).
57. `done` (C12) [Usefulness] Challenge ladder: per-link leaderboard of replies.

**From grade 13:**
58. `done` (C13) [Execution/Usefulness] Trusted ladder: challenge-result must use the server-recorded score of an authenticated pilot in a room tied to that challenge.
59. `done` (C13) [Polish/Execution] One target number: the verdict should use the challenger's raw score (zaps on the ghost add to your score but don't move the target).
60. `done` (C13) [Polish] Briefing opens scrolled to the bottom (`go.focus` without preventScroll).
61. `done` (C13) [Usefulness] The sender never sees replies: add a hub card of sent dares with ladder counts and RACE BACK.
62. `done` (C13) [Usefulness] Each BEAT MY RUN tap creates a new ladder; reuse the saved id per race.
63. `done` (C13) [Polish] Live-invite landing should headline "JOIN NAME ON COURSE".
64. `done` (C13) [Polish] "Grab ? pods" reads like a broken glyph; render the ? as a chip.
65. `done` (C13) [Polish] Duplicate hangar buttons on challenge results.

**From grade 15:**
66. `done` (C15) [Execution] **Host hand-off deadlock:** count live telemetry as activity; clients derive `state.host` from `room.hostId` on every poll; add an e2e assert.
67. `done` (C15) [Execution/Usefulness] Ladder forgeable via challenge-save: take the sender's score from the server record (authenticated), and add no rung on send-back saves.
68. `done` (C15) [Usefulness] Dares card is built once at load: rebuild when the hub shows; count replies by name.
69. `done` (C15) [Polish] Tie place mismatch between the title and the recap.
70. `done` (C15) [Polish] Invite copy failure shows only the code: add a copyable link field.
71. `done` (C15) [Polish] Mid-season results in a live room offer BEAT MY RUN / INVITE (leaves the crew): hide until the season ends.
72. `done` (C15) [Polish] "ZAP STEALS" is net: label it "NET ZAPS".
73. `done` (C16) [Usefulness] Store replier runs so RACE BACK races them.

**From grade 17:**
74. `done` (C17) [Execution] Rematch must clear live telemetry; VIEW FLIGHT DECK must leave the room.
75. `done` (C17) [Usefulness/Execution] Seat resume after reload (grace instead of instant leave), and joining between heats.
76. `done` (C17) [Polish] Dares card repeats a chain: group by root and show the rival.
77. `done` (C17) [Execution] Ladder rungs keyed by display name: key by a device pilot id.
78. `done` (C17) [Polish] Payback headline when the dare answers yours.
79. `done` (C17) [Polish] Season-bonus toast covers the results title.
80. `done` (C17) [Usefulness] Invite without &from: name the host from room data.
81. `done` (C17) [Execution] Dev: the local fallback hides server errors; fall back only on network failure.

**From grade 19:**
82. `done` (C19) [Execution] A resumed racer restarts at 0: seed distance and score from its own telemetry.
83. `done` (C19) [Execution] Resume immediately at load (skip the intro when a seat exists); toast when the seat expired.
84. `done` (C19) [Execution] Evict pilots silent on both lastSeen and telemetry for more than 45 s.
85. `done` (C19) [Polish] Late joiners and reloaded pilots see a fake 0-score results screen.
86. `done` (C19) [Execution] Ladder device ids leak (rung hijack): return a hash only.
87. `done` (C19) [Execution] bfcache: skip the soft leave when persisted; resume on pageshow.
88. `done` (C19) [Polish] The stored seat keeps the pre-rename name.
89. `done` (C19) [Usefulness] Dares rows can look identical: add your score and age.

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
- Cycle 9: fixed the rematch path end to end.
  - **Server:** zap/paid records are keyed by a season round, bumped by REMATCH.
  - **Client:** ignores pre-start credits; the season bonus is keyed by the round.
  - **e2e:** now plays a full PvP season and a rematch, and asserts no phantom credits and that zaps work afterwards (26/26).
  - **Bugs:** `[hidden]` always wins (REMATCH no longer shows mid-season); phones keep pinned rivals visible; no crown or "you took 1st" at 0–0.
  - **Copy:** the challenge landing names the dare ("★ LYRA-99 DARES YOU: BEAT 145 ON HELIX DEEP"); guests see "WAITING FOR THE HOST"; the season story names your human rival; the client name syncs after a server rename.
  - **Still open:** Io peaks (47).
- Cycle 10: social PvP.
  - **Steal feed:** the live response carries the room-wide confirmed-steal list (shooter taken from the paid key), so every player's feed shows steals between other humans too ("SAM +80 from NOVA").
  - **Emotes:** GG! / NICE SHOT! / COMING FOR YOU, via keys 1–3 or the emote chips shown only in multiplayer races. They appear in rivals' bubbles for 6 s, and empty rooms clean up emote blobs.
  - **Tests:** e2e has an emote check (27/27).
- Cycle 11: fixed the top-3 blockers from grade 11.
  - **Challenge ghost:** only you can zap it now (sim pilots used to drain the target about 60%); the feed names the real shooter.
  - **Phones:** emote chips are one compact row at the bottom-left (short labels), clear of the bubble, pause and FIRE; the hub CTA and briefing were measured and are fine.
  - **Strip:** gaps read "1 BEHIND" / "175 AHEAD" / "TIED".
  - **Challenge landing:** the dare is the headline ("BEAT 1,325 ON JOVIAN SHEAR."), with the name in the eyebrow and an explanation line.
  - **Recap:** the PvP heat recap names the human rival's margin.
  - **Stickers:** the unlock line shows only when newly earned.
  - **Tests:** e2e 27/27.
- Cycle 12: challenge ladders.
  - **Server:** every chain of challenge links (the original plus each send-it-back) shares one leaderboard keyed by the root challenge, holding each pilot's best (new `challenge-result` action; `challenge-get` returns the ladder).
  - **Results:** a challenge heat posts its score and shows "★ THIS TRACK'S LADDER · N PILOTS".
  - **Landing:** adds "N pilots have tried; best X by NAME". The dare headline is smaller for long course names, and a placeholder dare replaces the flash of the generic slogan.
  - **Verified:** two pilots on one link, ladder ordering, landing copy; e2e 27/27.
- Cycle 13: trusted challenges.
  - **Ladder:** `challenge-result` now needs the room code and the pilot's token, the room must have been opened for that challenge (`challengeId` at create), and it posts the score the server already recorded and capped for that pilot, once per pilot. The critic's 60,000 forgery is rejected.
  - **One target number:** the verdict uses the challenger's raw score; zapping the ghost adds to your score but doesn't move the target, so the verdict matches the ladder (1,940 vs 1,040 on both).
  - **Sender loop:** a "★ YOUR DARES" hub card lists your sent dares with "N tried · best X by NAME" and RACE BACK; BEAT MY RUN reuses one link per race.
  - **Landings:** live invites say "JOIN ORION-7 ON TITAN VEIL." plus the lobby count.
  - **Polish:** the briefing opens at the top (preventScroll); the "?" pods render as a chip; one hangar button on challenge results.
  - **Tests:** e2e 27/27.
- Cycle 14: submission readiness.
  - **README:** rewritten for the battle racer (rules, live and async multiplayer, the OpenAI features, architecture, dev hooks, e2e, deploy).
  - **SUBMISSION.md:** rewritten (title "Starwake: Zap Your Friends", a paste-ready description, a 5-minute judge walkthrough, a deploy checklist including `warm:ai` and the AI checks).
  - **Cover:** new `submission/cover-battle.png` (1600×900), staged from a live Jovian Shear heat (a laser locking onto ZORP, crown, UFO spectators, rings) with a cartoon title overlay.
- Cycle 15: fixed the live-season deadlock (the top blocker).
  - **Deadlock:** host presence now counts live telemetry, which is read through results too, so a racing host is no longer replaced. Clients take `state.host` from `room.hostId` on every poll.
  - **New e2e scenario:** the guest finishes heat 2 and the host races on for 28 s (past the 25 s timeout). With the old logic it fails, confirmed; it passes now.
  - **Ladder:** challenge-save is authenticated and uses the server-recorded score for the sender's heat (name included); send-it-back saves add no rung.
  - **Dares card:** rebuilt each time the hub shows; counts replies by name; says "you still hold the top spot" (DEFEND) or who leads (TRY AGAIN).
  - **Results:** tie-aware places shared by the title and recap; live rooms hide BEAT MY RUN / INVITE mid-season; "NET ZAPS" label.
  - **Lobby:** invite copy falls back to a selectable link field.
  - **Tests:** e2e 28/28.
- Cycle 16: the async reply loop is closed.
  - **Replies:** finishing a dare now saves your run as a reply challenge on that chain, and the ladder rung records it (validated: same chain, same pilot). New dares put the sender's own run on their rung.
  - **Dares card:** TRY AGAIN links to the leader's reply run, so the sender races whoever beat them (verified: ACE-1's card points at RIVAL-B's run); replies also land in the replier's own dares list.
  - **Tests:** e2e 28/28.
- Cycle 17: session resilience.
  - **Reloads:** a reload or closed tab sends a soft leave, so the seat is held for 30 s. The tab stores its seat (sessionStorage) and resumes it with its token, landing back in the race or in the room for the next heat.
  - **Joining:** new pilots can join between heats.
  - **Rematch and exit:** rematch clears old telemetry, so stale DNF scores are gone; VIEW FLIGHT DECK really leaves the room.
  - **Heat reports:** retried after a server "only just started" refusal (the new reload test exposed that it gave up).
  - **Ladders:** keyed by a per-device pilot id (renames follow you; same callsigns no longer merge).
  - **Dares card:** one row per chain, naming rivals; payback eyebrow ("PAYBACK · RIVAL-B BEAT YOUR 740") when a dare answers yours.
  - **Invites:** without &from, the landing names the host from the room, with phase-accurate copy.
  - **Results:** the season bonus moved into the results subtitle (no toast over the title).
  - **Dev:** the local API fallback now runs only on network failure, so server errors surface.
  - **Tests:** e2e 29/29 (new: the phone reloads between heats and keeps its seat).
- Cycle 18: quick chat beyond races. A new authenticated `emote` action, and room polls carry friends' recent emotes. The lobby and results screens get an emote row (GG! / NICE SHOT! / CATCH ME! / OOPS) in multiplayer rooms, with friends' emotes as toasts. e2e has a lobby emote check (30/30).
- Cycle 19: seamless rejoin.
  - **Mid-heat reload:** the racer resumes at its own last telemetry (distance and points); NPCs are placed around it and passed obstacles recycle.
  - **Intro skip:** a held seat skips the intro and resumes immediately; an expired seat says so.
  - **Silent drops:** pilots silent on both polls and telemetry for 45 s are released (multiplayer only, since solo racers stream nothing).
  - **Late joiners:** no fake 0-score results; late joiners and reloaded pilots wait in the room.
  - **Ladders:** device ids leave the server only as hashes.
  - **Reload edge cases:** bfcache restores skip the soft leave and resume on pageshow; the stored seat keeps the server-assigned name.
  - **Dares rows:** show your score and age.
  - **Tests:** e2e 31/31 (new: the phone reloads mid-heat and keeps its progress).
- Cycle 20: counterplay.
  - **Barrel roll** (Q / double-tap, 0.55 s, 3.5 s cooldown): a zap landing mid-roll bounces back at the shooter. Against NPCs it hits them directly; in PvP the reflection travels back through the zap channel, so the shooter's client applies it and pays you.
  - **NPCs:** dodge-roll your shots 12% of the time; reflections can't be re-dodged (a ping-pong bug found in testing).
  - **UI:** a ↻ ROLL chip shows readiness; the briefing, README and submission copy mention it.
  - **Tests:** e2e has a PvP reflect check (32/32).
