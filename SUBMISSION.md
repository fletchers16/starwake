# Starwake: submission kit

Everything the Handshake "Create a Multiplayer Game" mission asks for. Deadline: **Oct 30, 2026, 11:59 PM PT** (the mission page says Oct 31; the official rules say Oct 30, and the rules win) (see `CONTEST.md`).

## 1. Project title
**Starwake: Cartoon Battle Racing**

## 2. Project cover image
`submission/cover-battle.png` (1600×900): a real frame from a live heat with the cartoon ships, a zap burst, crates and the HUD.

## 3. Project description (paste this; the form allows at most 500 characters, this is 449)

> Starwake is a cartoon space battle racer for 2–8 friends on any phone or laptop: share a link or QR code, no install. Grab crates, zap whoever's ahead to steal their points, and barrel-roll their lasers back. Between heats, everyone makes a wish and the OpenAI-powered Wish Comet grants it, twists it or denies it, changing the next heat. OpenAI also writes the aliens' trash talk and whole new tracks from your ideas. Solo? Pick Easy to Pro aliens.

## 4. Project link/URL
https://starwakeracing.netlify.app

---

## How a judge should try it (about 5 minutes)
1. Open the link. A brand-new player's first solo race is coached live; press **RACE THE ALIENS** to start it.
2. **Solo vs the aliens:** after the coached race, press **RACE THE ALIENS** again (or **BROWSE WORLDS & SHIPS** to pick a world) and choose **EASY / MEDIUM / EXPERT / PRO** on the briefing. Fly through a **?** crate, press **F** (or tap **FIRE**) to zap the racer ahead, and roll (**Q** / **ROLL**) when you see LOCKED ON.
3. **Battle a friend:** press **PLAY WITH FRIENDS**, then scan the lobby's **QR code** with a phone (or copy the invite link). Pitch world ideas in **Forge Party**, then the host presses Start.
4. **Wish Comet:** after heat 1, type a wish on the results screen ("slow-mo goo on BEN"). When the host continues, the Comet rules on every wish (yours and the aliens') and the effects hit heat 2.
5. **Dare a friend:** on any results screen, press **BEAT MY RUN** and open the link in another browser. Race the ghost, and see the verdict and the link's ladder.
6. **World Forge:** in **BROWSE WORLDS & SHIPS**, describe a world, press **Forge World**, then race it.

## Before you submit
- [x] Deployed to Netlify with `OPENAI_API_KEY` set; AI lines warmed for all six worlds.
- [x] Live two-device seasons verified (`node tests/live-playtest.mjs`): 0 errors, standings agree on both screens.
- [x] Mission steps done: Starwake was started in ChatGPT through the mission's Talk and Build steps, then continued with other AI tools; it uses the OpenAI API in-game. Nothing in the official rules requires one tool.
- [ ] Play one round on a real phone.
- [ ] Submit in the Handshake mission form (by hand; scripted entries are disqualified): title, cover image, description, URL.
- [ ] **Leave "Share to Showcase" selected**, or the entry isn't entered in the challenge.
