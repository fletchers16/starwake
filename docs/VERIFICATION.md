# Verification

What has been tested, how, and what hasn't. Last updated Oct 6, 2026.

## Live seasons on the deployed site

`node tests/live-playtest.mjs https://starwakeracing.netlify.app` plays a full three-heat season with two isolated browsers: a laptop (1280×800) and an emulated iPhone 13 on a throttled link (110 ms latency, 6 Mbps down, 2 Mbps up) with a 4× slower CPU. Both pilots steer for crates, rings and boost gates, pick a fork lane, fire when they hold an item and roll when LOCKED ON shows, through the real keyboard and touch buttons. Two alien rivals fill the other seats.

| Run | World | Errors | Standings agree on both screens | Sync lag (avg / worst) | Frame rate |
|---|---|---|---|---|---|
| 1 | Neon Rift | 3 rejected double-presses (harmless, since fixed) | Yes (one late score showed "—" briefly; now shown as LANDING…) | ~7 m / 20 m | 60 / 60 fps |
| 2 | Io Storm | 0 | Yes | ~8 m / one 100 m stall (fixed: rivals now dead-reckon up to 5 s) | 60 / 60 fps |
| 3 | Titan Veil | 0 | Yes | ~7.5 m / 23 m | 60 / 60 fps |

At race speed (~25 m/s), 7 m is about a quarter of a second. The phone joined the room in under 3 s each time. AI recaps and season stories were generated live and matched the standings.

## Automated suites (local dev server)

- `tests/battle.e2e.mjs` (35 checks): a laptop and a touch phone join through an invite link, zap each other (keyboard and the touch FIRE button), credits match what the victim lost, emotes, standings, security (wrong token rejected), the room survives the host finishing last, phone reloads mid-heat and between heats resume the seat without repairing hull or replaying hits, a barrel roll reflects a zap, and a rematch starts a clean season.
- `tests/challenge.e2e.mjs` (11): a "beat my run" dare between two devices, the verdict matches the ladder, the sender sees the reply, TRY AGAIN races the reply.
- `tests/coach.e2e.mjs` (8): the coached first race, including that quitting mid-lesson leaves nothing behind.

## Also verified

- Forge Party on the live site with real OpenAI: three ideas fused into a new world that both devices then showed.
- AI fallbacks: with no key or no credit the game keeps working (canned lines, template recaps, remixed built-in worlds), and `npm run warm:ai` reports OpenAI's status code if a call fails.
- Phone layouts (landing, hub, lobby, race HUD) checked in an emulated iPhone 13, including Netlify's hosted badge.

## Not yet verified

- A match between two real physical devices on separate networks (the phone runs are emulated).
- Touch steering feel on real hardware.
- Rooms with more than two humans at once (the server supports 8; tests use 2 humans plus aliens).
