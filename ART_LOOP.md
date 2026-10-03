# Starwake art & quality loop

Goal: make Starwake look and feel like a hand-crafted indie game, not a generated one. Borrow proven styles, ideas and techniques from indie games and CC0 asset packs, build them into the game, and keep hardening quality.

Started 2026-10-03 at the user's request. Runs **until the user stops it**.

## Rules
- **Assets: CC0 only, and ask first.** Before any download, ask the user in chat with the file name, source URL, size and license, and wait for a clear yes. If the user isn't around, park the idea as `needs-asset-approval` and move on. Log every approved asset in **Asset log**. Never hotlink; vendor approved files into `public/assets/` with the license noted.
- **Ideas, not copies.** Take techniques and moods from other games; never copy their art, names, logos or UI.
- **Protect what works:** world identity, the clean HUD, one danger red for hazards, skill-based ring trails, multiplayer sync, the briefing screen.
- Local commits only, one per round. Never deploy, push or post.

## How each round works
1. **Research** (when fewer than 3 ideas are `ready`): spawn a background research agent with web search. It returns idea briefs (reference game or pack, what makes it look good, how to build it in three.js here, cost, risk) and candidate CC0 sources (exact URL, license, size). It never downloads or edits game files. Triage the briefs into **Idea backlog**. While it runs, do a hardening task rather than game edits that would disturb it.
2. **Implement**: take the top `ready` idea. Build it in the matching module (`world-themes.js`, `landmarks.js`, `obstacles.js`, `audio.js`, HUD CSS, or a new focused module).
3. **Verify**: `npx vite build` passes. Capture real frames (`window.__starwake.capture()` → `/__dev/save-image`) on at least two worlds and look at them. Check the console for errors, and check the frame rate didn't regress (watch `renderer.info` draw calls and triangles).
4. **Harden**: fix anything the frames reveal. Every 3rd round, spawn a cold playtest agent and triage its findings into the backlog.
5. **Commit** as `Art N: …`, mark the idea done, add a **Log** line.

## Idea backlog
Status: `ready` · `needs-asset-approval` · `in-progress` · `done` · `rejected`

_(filled by research rounds)_

## Asset log
| File | Source | License | Size | Approved | Used in |
|---|---|---|---|---|---|

## Log
