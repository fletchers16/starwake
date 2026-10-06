# Starwake: submission kit

Everything the Handshake "Create a Multiplayer Game" mission asks for. Deadline: **Oct 30, 2026, 11:59 PM PT** (see `CONTEST.md`).

## 1. Project title
**Starwake: Cartoon Battle Racing**

## 2. Project cover image
`submission/cover-battle.png` (1600×900): a real frame from a live heat with the cartoon ships, a zap burst, crates and the HUD.

## 3. Project description (paste this; the form allows at most 500 characters, this is 455)

> Starwake is a cartoon space battle racer for 2–8 friends on any phone or laptop: share a link or QR code, no install. Grab crates, blast whoever's ahead to steal their points, and barrel-roll their lasers back. The leader wears a crown worth double. OpenAI writes the alien rivals' trash talk, live race recaps, and whole new tracks from a sentence. Can't race live? Send a beat-my-run dare. Hardest part: keeping every screen in sync over phone networks.

## 4. Project link/URL
https://starwakeracing.netlify.app

---

## How a judge should try it (about 5 minutes)
1. Open the link and press **PLAY NOW** (or Skip intro). A brand-new player's first solo race is coached live.
2. **Solo vs the aliens:** pick a world, then **RACE THE ALIENS**. Fly through a **?** crate, press **F** (or tap **FIRE**) to zap the racer ahead, and watch the steal feed and the crown.
3. **Battle a friend:** select **⚔ BATTLE**, then **OPEN A BATTLE ROOM**, then scan the lobby's **QR code** with a phone (or use **COPY INVITE LINK**). The host presses Start. Zap each other, and press **1–3** (or tap the chips) for emotes. After heat 3, press **REMATCH**.
4. **Dare a friend:** on any results screen, press **BEAT MY RUN** and open the link in another browser. Race the ghost, and see the verdict and the link's ladder.
5. **World Forge:** describe a world, press **Forge**, then race it.

## Before you submit
- [x] Deployed to Netlify with `OPENAI_API_KEY` set; AI lines warmed for all six worlds.
- [x] Live two-device seasons verified (`node tests/live-playtest.mjs`): 0 errors, standings agree on both screens.
- [ ] **Check the build-tool question.** The rules describe entries as "the project(s) you built with OpenAI: Create a Multiplayer Game mission," and another entrant reports the mission requires ChatGPT. Starwake was built with Claude Code and uses the OpenAI API at runtime. Confirm with the mission page or Handshake, and describe it truthfully.
- [ ] Play one round on a real phone.
- [ ] Submit in the Handshake mission form (by hand; scripted entries are disqualified): title, cover image, description, URL.
- [ ] **Leave "Share to Showcase" selected**, or the entry isn't entered in the challenge.
