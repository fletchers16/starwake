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
| 21 (grade) | 5 | 7 | 7 | 6 | Mid-heat resume broken in multiplayer (sync posts d=0 before the restore reads); a reload wipes the zap ledger (phantom credits, replayed hits, dropped zaps); dodge toast overwritten; roll untimeable (no warning); late joiner bounced. Silent-drop eviction verified (39–47 s). Read: about #5 |
| 23 (grade) | 6 | 7 | 7 | 6 | Resume holds adversarially (guest and host mid-heat, late join auto-seated); both suites green; a reload repairs hull and drops the item (an exploit worth up to 140); hull double-counted on resume; phone roll timing; late-joiner waiting state; HUD clutter; stale tab title. Read: about #4, credible top 3 |
| 25 (grade) | 6 | 7 | 7 | 6 | Coach roll lesson fails (the armed bot spends its only shot on another NPC), so the coach suite is flaky; phone coach card covers the item slot and ROLL; roll copy contradicts; locks cancel then re-lock inside the roll cooldown; blocked zaps counted as landed; join CANCEL racy. Read: about #4 |
| 27 (grade) | 7 | 7 | 7 | 6 | All green (coach 7/7 ×3, battle 35/35, challenge 11/11); roll lesson reliable, reflect banner has punch; centre-screen text collides with the coach card; a committed lock can stick behind the fairness gate; a reload mid-roll gives 3 ammo; the coach bot over-punishes; phone coach hides its body text; still no live URL. Read: about #4, close to top 3 |
| 29 (grade) | 7 | 7 | 7 | 7 | All green; centre lane fixed on desktop; QR verified byte for byte; coach leaks into PvP after quitting a coached race (changes items); hub clip pushes the main button below the fold on phones; START HEAT needs a scroll; phone coach reappears over the reflect banner. Read: about #3–4, borderline top 3 |

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

**From grade 21:**
90. `done` (C21) [Execution] Resume must restore telemetry and the zap ledger from the server before sync starts; add a strict e2e check (reload at d>200, no phantom credit, a post-reload zap lands).
91. `done` (C21) [Polish] Dodge toast overwritten by "SNIPED…SHIELD BLOCKED"; dodge counted as a landed zap; bots dodge while stunned; reflection bypasses the 3-hit cap.
92. `done` (C21) [Creativity/Polish] Telegraph sim-pilot fire (0.45 s lock-on warning) so rolls can be timed.
93. `done` (C21) [Polish] The PvP shooter can't tell it was reflected.
94. `done` (C21) [Usefulness] Late joiner during a heat: wait and auto-join when the heat ends.
95. `done` (C21) [Polish] Copy: solo resume says "progress restored"; dropped friends vanish silently; solo-results reload lands in the lobby.

**From grade 23:**
96. `done` (C23) [Execution] Telemetry must carry hull, item, ammo, the raw score and bot swings; restore them on resume (no hull repair, no double-counted hull, no NPC score jumps).
97. `done` (C23) [Polish] Phone roll: a single-tap ROLL button, and a 0.6 s lock-on on touch.
98. `done` (C23) [Usefulness/Polish] Late joiners: a pinned waiting banner, and lobby copy that names the heat they'll join.
99. `done` (C23) [Polish] Declutter the race HUD (compact emote row everywhere); the GO banner can stick.
100. `done` (C23) [Polish] Stale tab title "Pilot the impossible".
101. `done` (C24) [Polish/Usefulness] A 20-second interactive first flight (forced pod, zap and roll prompt).

**From grade 25:**
102. `done` (C25) [Execution/Polish] Coach bot must target only the player (and retry); fixes the flaky coach suite.
103. `done` (C25) [Polish] Phone coach card covers the item slot and ROLL: dock it lower and compact.
104. `done` (C25) [Polish] Roll copy: "TAP ROLL" everywhere on touch.
105. `done` (C25) [Usefulness/Polish] A lock on you commits until it fires; a cancelled lock gets a 3.5 s grace.
106. `done` (C25) [Execution] Shield-blocked zaps counted as landed.
107. `done` (C25) [Execution] Join-banner CANCEL can be undone by an in-flight request.
108. `done` (C25) [Execution] Reload during the item roll loses the item (send pendingItem).
109. `done` (C27, user approved qrcode-generator) [Usefulness] QR code on the lobby invite (needs a QR encoder: a dependency or a hand-written one).

**From grade 27:**
110. `done` (C27) [Polish] Centre message lane: coach card vs race toasts vs reflect banner collide.
111. `done` (C27) [Execution] A committed lock stuck behind the fairness gate (the warning hangs, then fires untelegraphed).
112. `done` (C27) [Execution] Reload during the item roll restores 3 ammo of any item.
113. `done` (C27) [Usefulness] The coach bot over-punishes (3 ammo; coachTarget not cleared on cancel or finish).
114. `done` (C27) [Usefulness] The phone coach hides why the moves matter (body text hidden).
115. `blocked (user)` [Usefulness/Execution] Deploy with OPENAI_API_KEY, run warm:ai, and do a real two-device session on the live URL.

**From grade 29:**
116. `done` [Execution/Polish] Coach state leaks into later races after quitting a coached one: reset on quit and whenever the coach is skipped.
117. `done` [Usefulness/Polish] Hub clip pushes the main button below the fold on phones: move it below the course cards on narrow screens.
118. `done` [Polish] START HEAT needs a scroll (the QR adds height): make it sticky.
119. `blocked (encoder)` [Polish] Clip is VP8-only: an H.264 fallback needs an encoder that isn't installed.
120. `done` [Polish] Phone coach card returns over the reflect banner (fixed 1400 ms yield; duplicate "Perfect reflect!"); rapid reflects cut the yield short.

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
- Cycle 21: real seamless rejoin.
  - **Resume snapshot:** `resume` now returns the pilot's telemetry and the heat's zap/steal ledger (zaps on me, my zaps with reflections, paid, credits). The client applies them inside startRace before live sync sends anything, which fixes the d=0 race, phantom credits, replayed hits and dropped post-reload zaps.
  - **Strict e2e:** reload at 281 m resumes at 276 m on the first frame, a zero zap delta, and the phone's post-reload zap lands.
  - **Telegraphed fire:** sim pilots hold a 0.45 s lock-on ("⚠ BLIX LOCKED ON · Q TO ROLL", plus a beep) before firing at you, so rolls can be timed.
  - **Dodges:** get their own message, aren't landed zaps, can't happen while stunned, and count toward the 3-hit cap.
  - **PvP reflections:** the shooter sees "BOUNCED BACK BY X" (zap records carry a reflected count).
  - **Late joiners:** auto-join when the heat ends (retry for up to 2 min).
  - **Copy:** "X DROPPED OUT" when a rival leaves mid-race; solo resume only claims "progress restored" when there was telemetry; a solo-results reload goes home.
  - **Tests:** e2e 34/34.
- Cycle 22: coverage and build hygiene.
  - **Async e2e:** new `tests/challenge.e2e.mjs` (`npm run test:challenge`, 11/11): dare link, named landing, briefing, ghost, verdict == ladder, the sender's card shows the reply, TRY AGAIN targets the reply run.
  - **Scripts:** `npm test` runs both suites.
  - **Build:** three.js split into its own vendor chunk (game code 224 kB); no bundle warning.
  - **Fix:** the reload test tolerance accounts for telemetry age (it was flaky at 5 m).
- Cycle 23: fixed the grade-23 findings.
  - **Reload exploit:** telemetry carries the raw score, hull, held item and ammo, plus sim-pilot swings, and resume restores them exactly. That closes the hull-repair exploit and the double-counted hull bonus, keeps the held item, and stops NPC standings jumping. New e2e check: hull 1 and a held seeker survive a reload.
  - **Phone roll:** the ROLL chip is a single-tap button on touch, and the lock-on lasts 0.6 s on touch (0.45 s on keyboards).
  - **Late joiners:** a pinned "⚔ JOINING CODE" banner with CANCEL while waiting; the lobby copy names the heat they'll race from.
  - **HUD:** a compact horizontal emote row everywhere; the GO banner clears against the race clock.
  - **Tab title:** "Starwake: Zap Your Friends".
  - **Tests:** e2e 35/35 + 11/11.
- Cycle 24: first flight.
  - **Coach (`coach.js`):** a brand-new player's first solo race is coached live in three steps. Fly through a ? pod; zap the racer it places just ahead (it can't dodge during the lesson); roll when a sim pilot telegraphs a shot (`coachArm` lines one up and clears the fairness window for that one shot). It ends with "Perfect reflect!", is skippable and runs once.
  - **Tests:** new `tests/coach.e2e.mjs` (7/7); `npm test` runs all three suites (battle 35/35, challenge 11/11, coach 7/7).
  - **Note:** the challenge suite flaked once right after the new module landed (a dev-server reload); stable on rerun.
- Cycle 25: a reliable roll lesson and lock fairness.
  - **Coach target:** the coach's sim pilot only targets you (3 ammo), and if you're hit before rolling the coach says "Too slow! Once more" and re-arms one telegraphed shot. The coach suite is 7/7 on four consecutive runs (it was 5–7/7).
  - **Committed locks:** a lock on you holds until it fires; a cancelled lock gives a full roll cooldown before the next one.
  - **Small fixes:** blocked zaps aren't "landed"; the phone coach card sits compact below the item slot and ROLL; "TAP ROLL" copy everywhere on touch; join-banner CANCEL wins over in-flight requests; a reload mid item-roll keeps the pending item.
  - **Tests:** battle 35/35, challenge 11/11.
- Cycle 26: reflect juice. A perfect barrel-roll reflect now triggers a screen flash, the perfect chime, white and cyan bursts, a quick camera FOV punch and a big "PERFECT REFLECT! · ZORP ate their own laser" banner (verified headlessly through the coach flow). The desktop coach card moved below the taunt bubble. The QR-code invite (109) waits on the user's OK to add a QR encoder dependency.
- Cycle 27: QR invites and a calmer teaching screen.
  - **QR invite** (user-approved `qrcode-generator`, MIT): a "SCAN TO JOIN" QR of the invite link on the lobby card, so a laptop judge can scan a phone straight in.
  - **Centre lane:** while coaching, race toasts drop below the coach card, and the card yields to the PERFECT REFLECT banner.
  - **Locks:** a lock held back by the fairness gate is called off cleanly (no hanging warning, no untelegraphed shot).
  - **Small fixes:** a reload mid item-roll restores the item's real ammo; the coach's sim pilot carries one shot and stands down when the lesson ends or a lock is cancelled; phone coach steps keep a short reason line.
  - **Tests:** coach 7/7 ×2, challenge 11/11, battle 35/35.
- Cycle 28: a gameplay loop in the hub. A 14-second clip (`public/media/starwake-loop.webm`, 1 MB, VP8) recorded headlessly from a scripted heat (countdown, snipe, telegraphed lock, perfect reflect) with Playwright's built-in video and cached ffmpeg, so nothing new was downloaded. It plays muted and looping in the hub's intro column ("GRAB · ZAP · ROLL IT BACK") and hides itself on browsers without WebM. Challenge 11/11, coach 7/7.
- Cycle 29: coach.reset() on quit and whenever the coach is skipped, so a coached race can't leak into PvP (new e2e check). The reflect yield waits for the banner's animationend, and the coach card no longer repeats "Perfect reflect!". The hub clip goes under the launch button on phones. START HEAT is pinned to the viewport on phones and short screens (#app clips overflow, so sticky can't work). Battle 35/35, challenge 11/11, coach 8/8 twice.

## Blind grade, Oct 11 (tested an older build: before Quick Match, music, Team Battle, watch-while-waiting)
Official 1–5: Execution 4, Creativity 3, Usefulness 3, Polish 4 (~3.6 avg; "top quartile, plausible top 20, not yet a top-3 favourite").
Backlog, in order:
1. `ready` [Usefulness] Sim pilots' scores are derived from the humans' (game.ts scoreBots), so a pilot with pace ≥1.22 can't be beaten and sims win human seasons/awards. Tie sims to the player's own performance, keep them below a top human who flies well, exclude them from Champion, derive their lap times from score.
2. `ready` [Usefulness] Hull does nothing at 0: add a spin-out/limp and a points penalty so steering matters.
3. `ready` [Creativity] Forge Party offline shows no trace of the ideas: generate a name/palette from the ideas, tint the world, show "Racing X · ideas by …" on HUD/results; raise AI_DAILY_CAP for judging.
4. `ready` [Polish] Hub launch button below the fold at 1440×900; drop the hub's duplicate hero column.
5. `ready` [Polish] Pre-race briefing, landing background and top header still old navy/monospace: reskin.
6. `ready` [Value] No BEAT MY RUN / share after a multiplayer season.
7. `ready` [Polish] Centre-screen message pile-up early in a race (coach, banter, toasts, lock-on): one prioritised slot.
8. `ready` [Polish] Phone: comic bursts too big (cover FIRE); header clips the music button.
9. `ready` [Polish] Results: ~8 px labels, unreadable heat chart, CTA below fold, vague "VIEW FLIGHT DECK".
10. `ready` [Execution] Client-reported scores: validate against server telemetry, tighten the cap.
11. `ready` [Polish] Return 200 {fallback:true} instead of 503 when AI is unconfigured/capped (no red console errors).
12. `ready` [Polish] Small: dare landing shows party chips; alien Forge ideas differ per device; "You placed 3rd" vs table order; FORGE WORLD text clipped; frenzy timer low contrast.

## Priority list (user, Oct 11): build in this order, top first
A. `done` **Skill decides races** [Usefulness] (critic #1): alien scores follow your own performance, not the human field; a pilot who flies well beats the aliens; aliens excluded from Champion; lap times derived from score.
B. `done` **Hull has consequences** [Usefulness] (critic #2): at 0 hull you spin out / limp for ~3 s and lose a share of points; hull refills slowly or from stars.
C. `done` **Missable checkpoint gates** [Usefulness, Creativity] (user): gates are smaller and placed off-centre so you have to steer through them; missing one costs a 1.5 s slowdown and points ("MISSED GATE"); gate count shown in the HUD; aliens can miss too.
D. `done` **More gadgets** [Creativity, Usefulness] (user): new items from crates, each synced in PvP through the zap inbox with a `kind` field:
   - **Slow-Mo Goo**: while active (6 s), bumping into a rival slows them to half speed for 3 s (purple goo trail, "SLOOOW" burst).
   - **Space Banana / Oil Slick**: drop behind you; whoever flies through spins out.
   - **Magnet**: yanks you toward the racer ahead and steals their held item.
   - **Decoy Crate**: drop a fake "?" crate that zaps whoever grabs it.
   - **Ink Cloud**: splats the screens of racers right behind you for 2 s.
   - **Swap Ray**: trade places with the racer just ahead (rare, back of the pack only).
   Keep the item odds rubber-banded (better items further back) and add each to the coach/briefing and Flight School.
E. `done` **Adventure tracks** [Creativity, Polish] (user): each lap becomes a sequence of set pieces instead of one corridor: tunnels and caves, a dive, a corkscrew spiral, a split shortcut that needs a boost gate, moving hazards per world (Io lava geysers on a timer, Titan falling icicles, Jovian ring-plane weave, Earthfall satellite field, Helix gravity well that pulls you, Neon collapsing gantries). Landmark captions name each section.
F. `done` **Forge Party unmistakable** [Creativity] (critic #3): fused world name and "ideas by …" on HUD and results; offline remix generates a name and palette from the ideas; raise AI_DAILY_CAP for judging.
G. `done` **First impressions** [Polish] (critic #4, #5, #7, #8, #9): hub button above the fold, briefing/header reskin, one centre message slot, smaller phone bursts, readable results.
H. `ready` **Real phones**: the user plays a real match with friends before the final deploy.
- Oct 13–14: built A–G in order (skill-based alien scoring; hull breach; missable off-centre gates; six gadgets synced in PvP with a new gadgets suite; two set-piece sections a lap with moving hazards; Forge Party offline remix + credits; first-impression polish), plus the season-end dare button and a telemetry score cap. All suites green (35 / 11 / 8 / 4). Blind re-grade launched on 41065a5.

## Blind re-grade, Oct 14 (commit 41065a5): Execution 5, Creativity 3, Usefulness 4, Polish 4 (~16/20, "credible top-20, not yet a top-3 lock")
Backlog from it, in build order:
1. `done` [Polish] Race-screen text collisions: toast over LOCKED ON, speech bubble over the team bar, plain white pop-up numbers. Separate lanes, cartoon font.
2. `done` [Polish] Mobile results: see-through pinned button over content. Make it opaque with padding.
3. `done` [Execution] Neon Rift draw calls reach 255 about 12 s in (merge the Relay Tunnel landmark and other multi-mesh props).
4. `done` [Polish] Fastest Lap award and lap PB stickers aren't skill-based. Use best heat score / most gates; PB on score.
5. `done` [Polish] Headlines contradict the table ("Heat won." while 3rd overall); dare verdict should lead; TOP PILOT only with 2+ humans; number formatting in recaps; "Grab pods" on the invite page; bigger heat-chart tiles; "GATES 0 / 0".
6. `done` [Polish/Usefulness] Briefing is a wall of text. Three lines plus a collapsible "all the rules".
7. `done` [Polish] Invited guests can't pick a name. Add a callsign field on the invite landing.
8. `done` [Usefulness] Zap losses can swamp a trailing player. Cap a pilot's total steal losses per heat (~30% of gross).
9. `done` [Creativity] Forge Party offline ignores the ideas' theme. Keyword-driven palette/sky/hazard skin; feature Forge Party on the landing.
10. `done` [Polish] Hub: line-chart track art, sticky bar over ship stats at 1440×900, 4 px phone overflow; set-piece arches look the same on every world.
11. `later` [Execution] Client-reported scores and botAdjust; untested 3+ human load.
12. `done` [Creativity] AI in the moment-to-moment game: OpenAI writes live announcer call-outs per world (frenzy, lead, breach, set piece, reflect, clean lap of gates), cached with the taunts (cast/v2, so re-run warm:ai after deploy); canned fallbacks without a key.

## Blind re-grade, Oct 14 (commit 6049a54): Execution 4, Creativity 4, Usefulness 3, Polish 4
Biggest gap: balance. A judge's first race ends last, thousands behind three aliens (coached 358 vs 5,872; active solo season 4,263 vs 15,458), with a negative "PERFECT LINES" row.
1. `done` [Usefulness] Rubber band must hold: clamp alien scores near the human field (rookies can win by flying straight and firing). game.ts scoreBots + game.js botProfile/live score.
2. `done` [Polish] "PERFECT LINES −1,150": split gates bonus from missed-gate penalties; soften the miss penalty.
3. `done` [Polish] Phone hub clips on the right at 390px.
4. `done` [Execution] Toasts, misses and announcer lines fire after 00:00.
5. `done` [Usefulness] Coach step 1 ("fly through a crate") never times out: hand over the item after ~10 s.
6. `done` [Polish] Solo season end: REMATCH should be primary; no "BACK TO LOBBY".
7. `done` [Polish] Landing leftovers ("READY", "HOLD FAST", old hub copy in DOM).
8. `done` [Execution] Guest lap time shows "—".
9. `done` [Polish] Phone guest sees "SCAN TO JOIN" QR; desktop lobby emote row outside padding.
10. `done` [Polish/Creativity] README lists 4 items (9 exist); offline Forge Party should show a real AI-forged sample.
Also: three.js warns flatShading on MeshToonMaterial; touch buttons rely only on (pointer:coarse).
All 10 done (Oct 14). Balance: BOT_PAR 12000 → 4000 plus a per-alien cap of 0.7–1.2× the best human (+300·skill); casual and idle test heats now finish 2nd, within ~400 of 1st. Also fixed a flaky coach case (a crate replacing the lesson's blaster).

## Blind re-grade, Oct 14 (commit ab25974): Execution 5, Creativity 4, Usefulness 4, Polish 4 (17/20)
Biggest gap: no tension vs aliens. A pilot who never steers finished 2nd (3,042 vs 3,243); a skilled pilot won a season 22.5k vs 13.5k.
1. `done` [Usefulness] Lead alien tracks ~0.95–1.1× the best human both ways; no free gates/rings on the default line.
2. `done` [Polish] Hull meter draws 5 pips for a 4-hull ship.
3. `done` [Polish] Coached race finishes all lessons in 8 s; hold each step ~4 s.
4. `done` [Polish] Debris hits at launch: spawn grace.
5. `done` [Polish] Overlapping centre messages; toast runs off a 390px screen.
6. `done` [Creativity] Offline Forge Party: ship real AI fusions as course JSON, matched by keyword.
7. `done` [Polish] Template season story repeats the same number three times.
8. `done` [Polish] Phone HUD has no rival list; results sorted by total but HEAT column first; desktop name truncation.
9. `done` [Polish] Alien scores jump at the buzzer.
10. `done` [Polish] README "five alien rivals" (solo has 3); TIME BONUS row meaningless; sticky hub launch covers garage; hub defaults to BATTLE after solo. (flatShading already fixed in e43d12f.)
Done Oct 14 (except: sticky hub launch bar left as is, by design). Balance now: lead alien = 1.0 × (0.8 × best human + 0.2 × 6000 × skill), the others step down 0.88/0.8…; the lead role rotates per heat. Autopilot tests: skilled won narrowly (by 14% and 2%), casual and idle placed 2nd–4th. Offline Forge Party serves pooled real OpenAI worlds, seeded by warm:ai. Coach test: one flake in 5 runs before the "aliens hold fire while coaching" fix; then 6 of 6 passed.

## Game-design critique, Oct 15 (commit 2a23be5): gameplay and concept proposals
Diagnosis: track position barely matters (everyone flies about the same distance); alien scores are a formula with late jumps; humans rarely zap each other (auto-aim hits aliens); the most frequent feedback is "MISSED GATE"; firing is a no-brainer; the AI is decoration. The best beat: LOCKED ON, then roll it back.
Proposals, ranked by impact per effort:
1. `proposed` [BOLD, M] Wish Comet: between heats every pilot (aliens too) writes a wish; OpenAI rules GRANTED / TWISTED / DENIED and turns it into real effects for the next heat (goo, crown, frenzy timing, lucky crates, aliens hunt X...). Server-side ruling, clamped effect enum, offline keyword rules + a pooled set of real rulings.
2. `done` [S] Nemesis: the human next to you in the standings (an alien solo); auto-aim prefers them, steals ×1.5, NEMESIS tag.
3. `done` [S] Gates as a reward: miss = −25 and streak lost, no stall; guide to the next gate; 5 clean = PERFECT LAP ×2.
4. `proposed` [S–M] Wake-riding: draft anyone's wake to charge boost and siphon points (generalise the Team Battle slipstream).
5. `proposed` [M] Alien scouting report: OpenAI reads your telemetry and picks a real tactic per alien for the next heat.
6. `ready` [S–M] Alien scores move only on visible events (no last-second jumps).
7. `proposed` [S–M] Announcer voice (OpenAI TTS, cached per course).
8. `proposed` [BOLD, L] Crew mode: pilot + phone gunner with a radar of hidden information.
Top pick: Wish Comet, plus Nemesis and the gate change.

## Blind judge, Oct 15 (commit 2a23be5): Execution 4, Creativity 4, Usefulness 3, Polish 3
Biggest gap: solo was visibly rubber-banded (idle finished 2nd; skilled won every heat by ~10%). Then: stacked centre messages, camera clipping into pillars/beams, phone ROLL far from thumbs, zap spam outscoring flying, announcer "you take the lead" while 4th, sticky CTAs over season awards, no WebGL fallback, offline Forge Party button/scroll/caption issues, small HUD details.
1. `done` [Usefulness] Alien difficulty (user's spec): EASY / MEDIUM / EXPERT / PRO, each alien at its own level (share of a measured strong run per world: easy .32, medium .6, expert .95, pro 1.2), ±6% catch-up, your steals from one alien capped at 25% of its heat. Shared difficulty.js used by client and server. Autopilot checks: idle last on easy, casual close 3rd on easy and last on medium, strong autopilot won 2 of 3 runs on each of expert and pro.
2. `ready` [Polish] One centre message at a time (queue).
3. `ready` [Execution] Camera clipping into geometry.
4. `ready` [Usefulness] Phone: ROLL by the thumbs, emotes out of the drag zone, use the empty bottom, no tap highlight.
5. `done` (via the 25% cap) [Usefulness] Zap spam outscoring flying.
6. `ready` [Polish] Announcer "lead" only after ~1 s in 1st.
7. `ready` [Polish] Season/results cleanup (CTA padding, HEAT 3 label, numbers once).
8. `ready` [Execution] WebGL fallback message.
9. `ready` [Polish] Forge Party: RE-FUSE state, scroll guests to the result, caption font.
10. `ready` [Polish] Small HUD details.
