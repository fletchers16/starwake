# Starwake: submission kit

Everything the Handshake "Create a Multiplayer Game" mission asks for. Deadline: **Oct 30, 2026, 11:59 PM PT** (see `CONTEST.md`).

## 1. Project title
**Starwake: Race Worlds You Imagine**

(Shorter alternatives: "Starwake", "Starwake: AI-Forged Multiplayer Space Racing")

## 2. Project cover image
`submission/cover.png` (1600×900, captured from the game). The loop regenerates it from a live race on Jovian Shear with the title overlay. If you'd rather make your own, use a mid-race moment with a ring trail and a rival ghost in view.

## 3. Project description (paste this)

> **Starwake is a multiplayer space racer where you can race on worlds you describe.**
>
> Type any idea into **World Forge**, like "a canyon race through a shattered moon" or "lava storms under Jupiter". OpenAI designs a raceable course from it: track shape, colour palette, gravity, crosswinds and hazards. Strict validation keeps every AI-built track fair and flyable. Then send your friends an invite link. Everyone races the same forged world at the same time, and rival pilots appear live as named ghost ships.
>
> Races are three synchronized 60-second heats. You score by flying **ring trails**: each ring is worth more as your combo climbs to ×5, a perfect line earns a bonus, and the centre line is mined, so skill beats autopilot. The live standings match the final results. Six hand-built worlds each look like their name: Io's lava seas and lightning, Titan's amber ice canals, low orbit above a curved Earth, Jupiter's ring plane, a derelict neon relay station and a violet nebula vortex.
>
> Between races, earn rank and credits to unlock ships with different trade-offs and collect personal-best stickers.
>
> **Built with:** OpenAI Responses API (structured outputs) for World Forge, three.js, Vite, and Netlify Functions plus Blobs for real-time multiplayer rooms.

*(Short version, about 280 characters: "A multiplayer space racer where OpenAI turns your words into raceable worlds. Describe a planet, send an invite link, and race friends live as ghost ships across three synchronized heats. Ring-trail combos reward skill; six hand-built worlds plus infinite AI ones.")*

## 4. Project link/URL
Your Netlify URL, after deploying (see checklist below).

---

## How a judge should try it (also good for the description or a pinned comment)
1. Open the link → **Launch** (or Skip intro).
2. **World Forge**: describe a world → **Forge**. Your course appears as a card.
3. **PvP → Create private race** → **Copy invite link**, then open it on a second device or browser.
4. The host presses **Start heat**. Steer with ←→↑↓ / WASD (or drag on a phone), **Space** to boost, and follow the gold line through the rings.

## Deploy checklist (only you can do these)
- [ ] Push the project to Netlify (build `npm run build`, publish `dist/`, functions in `netlify/functions`; `netlify.toml` already sets this).
- [ ] In **Site configuration → Environment variables**, add `OPENAI_API_KEY`. Optional: `OPENAI_MODEL` (default `gpt-5-mini`).
- [ ] Redeploy after adding the key.
- [ ] Forge one world on the live site and confirm it says **FORGED**, not **OFFLINE FORGE**.
- [ ] Two-device test: create a room on a laptop, join from a phone via the invite link, race 3 heats, check that both see each other's ghosts and the same results.
- [ ] Submit in Handshake: title, cover image, description, URL.
