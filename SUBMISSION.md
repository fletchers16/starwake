# Starwake: submission kit

Everything the Handshake "Create a Multiplayer Game" mission asks for. Deadline: **Oct 30, 2026, 11:59 PM PT** (see `CONTEST.md`).

## 1. Project title
**Starwake: Zap Your Friends**

(Alternatives: "Starwake: Cartoon Battle Racing", "Starwake")

## 2. Project cover image
`submission/cover-battle.png` (1600×900, captured from a live heat: alien racers, a laser zap, "?" pods, the crown and the steal feed). The older `submission/cover.png` is from the pre-battle version.

## 3. Project description (paste this)

> **Starwake is a cartoon battle racer you play with friends on any device, live or whenever they're free.**
>
> Fly through rainbow **?** pods for items: a Laser Blaster that snipes the racer ahead, a Comet Seeker that hunts down 1st place, a Bubble Shield, a Turbo Snack. Every zap spins your rival out and **steals 8% of their points**. The leader wears a crown worth double, and the final 15 seconds are a **Zap Frenzy** where every steal doubles again. Time a **barrel roll** and a laser bounces straight back at whoever fired it. Rescue space cows, chain ring trails, and watch the live steal feed decide the race.
>
> **Play together:**
> - **Live battles:** send an invite link. Friends join from a phone or laptop with no install or account, and race three synchronized heats. Emotes and a REMATCH button keep the crew going.
> - **Async dares:** after any race, send a "beat my run" link. Your friend races your recorded flight on the exact same track as a ghost they can zap, and every reply lands on that link's leaderboard.
>
> **Built with OpenAI:** five alien rivals (ZORP, BLIX, MUNGO, QUEEP and GLORB) trash-talk you mid-race in lines OpenAI writes for each world. An AI announcer recaps every heat and tells the story of your season. **World Forge** turns any sentence ("a canyon race through a shattered moon") into a new raceable world, using structured outputs validated so every AI-built track is fair and flyable.
>
> **Built with:** OpenAI Responses API (structured outputs), three.js, Vite, Netlify Functions and Blobs.

*(Short version, about 280 characters: "A cartoon battle racer for friends on any device. Grab ? pods, zap rivals and steal their points in live three-heat battles, or dare a friend to beat your recorded run. OpenAI writes your alien rivals' trash talk, recaps every race and forges new worlds from a sentence.")*

## 4. Project link/URL
Your Netlify URL, after deploying (see the checklist below).

---

## How a judge should try it (about 5 minutes)
1. Open the link and press **START BLASTING** (or Skip intro). The briefing explains every rule on one screen.
2. **Solo vs the aliens:** pick a world, then **RACE THE ALIENS**. Fly through a **?** pod, press **F** (or tap **FIRE**) to zap the racer ahead, and watch the steal feed and the crown.
3. **Battle a friend:** select **⚔ BATTLE**, then **OPEN A BATTLE ROOM**, then **COPY INVITE LINK**, and open it on a phone. The host presses Start. Zap each other, and press **1–3** (or tap the chips) for emotes. After heat 3, press **REMATCH**.
4. **Dare a friend:** on any results screen, press **BEAT MY RUN** and open the link in another browser. Race the ghost, and see the verdict and the link's ladder.
5. **World Forge:** describe a world, press **Forge**, then race it.

## Deploy checklist (only you can do these)
- [ ] Deploy to Netlify (build `npm run build`, publish `dist/`, functions in `netlify/functions`; `netlify.toml` already sets this).
- [ ] In **Site configuration → Environment variables**, add `OPENAI_API_KEY`. Optional: `OPENAI_MODEL` (default `gpt-5-mini`).
- [ ] Redeploy after adding the key.
- [ ] Run `npm run warm:ai https://<your-site>.netlify.app` so the alien rivals' AI lines are ready for a judge's first race (each course is generated once and cached).
- [ ] Forge one world on the live site and confirm it says **FORGED**, not **OFFLINE FORGE**; finish a heat and confirm the recap says **WRITTEN BY OPENAI**.
- [ ] Two-device test on the live URL: a laptop opens a battle room, a phone joins via the invite link, you zap each other, play 3 heats, then REMATCH. (`npm run test:battle` runs the same flow automatically against a local dev server.)
- [ ] Submit in Handshake: title, cover image, description, URL.
