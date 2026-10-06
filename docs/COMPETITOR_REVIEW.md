# Competitor review (Oct 6, 2026)

Found by searching GitHub for entries that name the Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge, then reading each README and opening the live ones. Public repos only: most entries probably aren't public yet, so this is a sample, not the field.

## Entries

| Entry | What it is | Live | Notable strengths |
|---|---|---|---|
| [Off Course](https://github.com/tominister/off-course) | Co-op space rescue, 2–6; everyone holds a different part of the ship's controls | Yes | Clear one-line pitch ("Better lost together"), game preview on the landing, solo flight school, original SVG art, server-authoritative WebSockets, real two-client network tests, verification notes |
| [Block & Bell](https://github.com/zahid23saim/block-and-bell) | 1897 railway signalling, 2–4; your orders are printed on your neighbour's screen | Yes | Strongest original idea seen: asymmetric information enforced by the server; every shift is generated and solved before it's printed (600 lines certified) |
| [Signal Garden](https://github.com/cristiangramada/signal-garden) | Co-op light-routing puzzle, 2–6; you get clues about someone else's tiles | Yes | Beautiful, distinctive landing with a preview card and the create-room form on the first screen; hashed session tokens |
| [CYBERANTE](https://github.com/dsn999/cyberante) | Poker × fighting-game card battler, 1v1 | Yes | Three.js neon visuals, procedural synth music, solo bot with 3 personalities, 4-lesson tutorial, contest-readiness doc, verified on Windows + iPad |
| [VOLT//SHIFT](https://github.com/Vedlogged/VOLT-SHIFT) | 1v1 neon arena; capturing energy reshapes the arena | Yes | Rubric-alignment table, 4 node types, sudden death on ties, health endpoint, procedural audio, 4 test suites |
| [Gravity Duel](https://github.com/vikasvardhan07/gravity-duel) | 1v1 one-button orbit duel around a black hole | Yes (sleeps) | Elegant one-input design, quick match, practice vs bot, shrinking rim in the last 30 s |
| [Turing Trap](https://github.com/Arvind-Jana/turing-trap-multiplayer) | Party game: spot the AI's answer among your friends' | No | AI is the core mechanic, not flavour; "AI literacy" value pitch |
| [Chaos](https://github.com/hehehe10086-dev/chaos) | Historical role-play; your lines are rewritten in the era's voice | Design only | AI fills every empty seat and stands in for disconnects; auto room assignment |
| [ROOMREAD](https://github.com/JohnFiorello/roomread) | Vote vs predict-the-room social game, 2–8 | — | Simple, clear scoring; WebRTC peer-to-peer |
| [Pulse Protocol: Reactor Rush](https://github.com/codewithnayab/PULSE-PROTOCOL-Reactor-Rush) | Reactor-decoding race, 2–6 | — | Supabase with row-level security; rounds advance without any single client |
| [Drop Dilemma](https://github.com/IainAmosMelchizedek/drop-dilemma) | Game-theory DJ battle | No (archived) | Betrayal is audible (your music layer drops out); 2,000+ scoring tests |
| [Last Night on Maple Street](https://github.com/OfficialEseosa/last-night-on-maple-street) | Two-player co-op adventure, different roles | — | Narrative, first-person 3D opening |
| [Signal & Noise](https://github.com/sachinhq/signal-and-noise) | Room-code trivia, 1–12 | — | Simple, finished |
| [Cricket Clash](https://github.com/vishwanathHarikenche/Hari-Cricket-Clash-game) | 2-player cricket | Replit | — |

## What the official rules say (read from the rules PDF)

- Entry = "the project(s) you built with **OpenAI: Create a Multiplayer Game mission** in Handshake": title, cover image, description, link. Window 9/22–10/30/2026 11:59 PM PT. Multiple entries allowed.
- Round 1 scores each category 1–5; the top 20 go to a judge panel on the same criteria; top 3 win $1,000.
- 5/5 Execution: "exceeds the project requirements; fully functional, stable, and demo-ready end-to-end." 5/5 Creativity: "fresh concept, unexpected use case, or particularly clever implementation." 5/5 Usefulness: "highly compelling — meaningfully serves its purpose or delights its intended audience." 5/5 Polish: "feels intentional and 'real,' with thoughtful details, edge cases, and clear guidance."
- Off Course's README (not the PDF) reports the submission form caps the description at **500 characters**, asks for a screenshot of a key game screen as the preview, and requires **Share to Showcase** to be selected or the entry isn't in the challenge. It also reports the mission "requires ChatGPT with Work mode."

## Where Starwake stands

**Ahead:** the only real-time 3D game in the sample; the deepest moment-to-moment play (items, reflects, bounty, forks); OpenAI used in three places at runtime; proven live multiplayer (three full laptop-vs-throttled-phone seasons, 0 errors); the most test coverage (live playtest + 3 suites).

**Behind:**
- **Landing clarity:** Off Course, Signal Garden and VOLT//SHIFT put the pitch, a game preview, and create/join/solo on the very first screen. Ours is an intro screen, then a busy hub.
- **Cohesive look:** their whole site shares one style. Our race view is cartoon now; the hub, lobby and results are still the older sci-fi style.
- **Players needing each other:** the most original entries (Block & Bell, Off Course, Signal Garden) are built on players depending on each other. Ours is competitive racing with interaction through zaps.
- **AI as the mechanic:** Turing Trap and Chaos make AI the game itself; ours is flavour plus the World Forge.
- **Judge-facing docs:** VOLT//SHIFT and Turing Trap map features to the rubric; CYBERANTE and Off Course publish verification and readiness notes.
