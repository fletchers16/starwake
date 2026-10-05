import { getStore } from "@netlify/blobs";
import { json, hasKey, structured, underDailyLimit, MODEL } from "../lib/openai";
import { COURSE_CATALOG } from "../../course-catalog.js";

// AI rivals with OpenAI:
// - "cast": trash talk for the alien racers, written for a specific course. Generated once
//   per course and cached, so every race shows AI lines at almost no cost.
// - "recap": a two-sentence sportscaster recap of the heat you just flew.
// Without OPENAI_API_KEY this returns 503 "unconfigured" and the game uses canned lines.

const ALIENS = ["ZORP", "BLIX", "MUNGO", "QUEEP", "GLORB"];
const clean = (value: unknown, max: number) => String(value ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

const CAST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["aliens"],
  properties: {
    aliens: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "zap", "zapped", "lead"],
        properties: {
          name: { type: "string", enum: ALIENS },
          zap: { type: "string", description: "Taunt after zapping the player. Max 42 characters." },
          zapped: { type: "string", description: "Reaction after the player zaps them. Max 42 characters." },
          lead: { type: "string", description: "Gloat when overtaking the player for 1st. Max 42 characters." },
        },
      },
    },
  },
};

const CAST_INSTRUCTIONS = `You write trash talk for five cartoon alien racers in Starwake, a family-friendly cartoon space battle racer where players zap each other with laser blasters and steal points.
Personalities: ZORP (one-eyed, overconfident show-off), BLIX (three-eyed, dizzy and dramatic), MUNGO (grumpy, hates losing), QUEEP (tiny, hyper, squeaky), GLORB (laid-back, weird space philosopher).
Write one short line for each situation per alien, playful and PG, max 42 characters each, no emojis, and work in the course's world when it's funny.`;

const RECAP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["recap"],
  properties: { recap: { type: "string", description: "Two punchy sportscaster sentences, max 260 characters." } },
};

const RECAP_INSTRUCTIONS = `You are the excitable announcer of Starwake, a cartoon space battle racer (laser zaps steal points, space cows, alien rivals ZORP, BLIX, MUNGO, QUEEP, GLORB).
Write a two-sentence recap of the heat from the player's point of view, using the stats given. Name the winner and one standout moment. Playful, PG, no emojis, max 260 characters.`;

const SEASON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["story"],
  properties: { story: { type: "string", description: "Three short sportscaster sentences, max 360 characters." } },
};

const SEASON_INSTRUCTIONS = `You are the excitable announcer of Starwake, a cartoon space battle racer (laser zaps steal points, space cows, alien rivals ZORP, BLIX, MUNGO, QUEEP, GLORB).
A three-heat season just ended. Write a three-sentence season story from the player's point of view: crown the champion, name the rivalry or comeback, and end with a line daring the player to run it back. Playful, PG, no emojis, max 360 characters.`;

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!hasKey()) return json({ error: "AI rivals are not configured on this deployment.", code: "unconfigured" }, 503);
  let body: any = {};
  try { body = await request.json(); } catch {}
  // Built-in courses come from the server's own catalog (clients can't rename them); forged ones are
  // keyed by a hash of what was sent, so a crafted request can't overwrite another course's lines.
  const sent = { id: clean(body.course?.id, 40), name: clean(body.course?.name, 40), planet: clean(body.course?.planet, 40), world: clean(body.course?.world, 60) };
  const known = (COURSE_CATALOG as any[]).find((c) => c.id === sent.id);
  const course = known ? { id: known.id, name: clean(known.name, 40), planet: clean(known.planet, 40), world: clean(known.world, 60) } : sent;
  const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(36);

  try {
    if (body.kind === "cast") {
      if (!course.id) return json({ error: "Missing course." }, 400);
      const store = getStore({ name: "starwake-ai", consistency: "strong" });
      const key = known ? `cast/v1/${course.id}` : `cast/v1/forged-${hash(`${course.name}|${course.planet}|${course.world}`)}`;
      const cached = await store.get(key, { type: "json" }).catch(() => null);
      if (cached) return json({ cast: cached, model: MODEL, cached: true });
      if (!(await underDailyLimit(request, "cast", 20))) return json({ error: "Daily AI limit reached.", code: "limited" }, 429);
      const result = await structured<{ aliens: { name: string; zap: string; zapped: string; lead: string }[] }>({
        instructions: CAST_INSTRUCTIONS,
        input: `Course: ${course.name} on ${course.planet} (${course.world}).`,
        name: "starwake_cast",
        schema: CAST_SCHEMA,
      });
      const cast = Object.fromEntries(result.aliens.filter((a) => ALIENS.includes(a.name)).map((a) => [a.name, { zap: clean(a.zap, 48), zapped: clean(a.zapped, 48), lead: clean(a.lead, 48) }]));
      await store.setJSON(key, cast).catch(() => {});
      return json({ cast, model: MODEL });
    }
    if (body.kind === "recap") {
      if (!(await underDailyLimit(request, "recap", 40))) return json({ error: "Daily AI limit reached.", code: "limited" }, 429);
      const standings = (Array.isArray(body.standings) ? body.standings : []).slice(0, 8).map((s: any) => `${clean(s.name, 18)}${s.you ? " (the player)" : ""}: ${Math.floor(Number(s.score) || 0)}`);
      const st = body.stats || {};
      const input = `Course: ${course.name} on ${course.planet}. Final standings: ${standings.join("; ")}. Player stats: place ${Math.floor(Number(st.place) || 0)}, rings ${Math.floor(Number(st.rings) || 0)}, best combo x${Math.floor(Number(st.bestCombo) || 0)}, zaps landed ${Math.floor(Number(st.zapsLanded) || 0)}, points stolen ${Math.floor(Number(st.stolen) || 0)}, points lost to zaps ${Math.floor(Number(st.lost) || 0)}, space cows rescued ${Math.floor(Number(st.cows) || 0)}.${body.challenge ? ` This was a head-to-head challenge against ${clean(body.challenge.name, 18)}'s recorded run: player ${Math.floor(Number(body.challenge.you) || 0)} vs ${Math.floor(Number(body.challenge.them) || 0)}. Mention who won the duel.` : ''}`;
      const result = await structured<{ recap: string }>({ instructions: RECAP_INSTRUCTIONS, input, name: "starwake_recap", schema: RECAP_SCHEMA, maxTokens: 600 });
      return json({ recap: clean(result.recap, 280), model: MODEL });
    }
    if (body.kind === "season") {
      if (!(await underDailyLimit(request, "recap", 40))) return json({ error: "Daily AI limit reached.", code: "limited" }, 429);
      const table = (Array.isArray(body.table) ? body.table : []).slice(0, 8).map((s: any) => `${clean(s.name, 18)}${s.you ? " (the player)" : ""}: ${Math.floor(Number(s.total) || 0)} total, heats ${(Array.isArray(s.heats) ? s.heats : []).slice(0, 3).map((h: any) => Math.floor(Number(h) || 0)).join("/")}`);
      const st = body.stats || {};
      const input = `Course: ${course.name} on ${course.planet}. Season table: ${table.join("; ")}. Player season stats: zaps landed ${Math.floor(Number(st.zapsLanded) || 0)}, points stolen ${Math.floor(Number(st.stolen) || 0)}, points lost to zaps ${Math.floor(Number(st.lost) || 0)}, space cows ${Math.floor(Number(st.cows) || 0)}.`;
      const result = await structured<{ story: string }>({ instructions: SEASON_INSTRUCTIONS, input, name: "starwake_season", schema: SEASON_SCHEMA, maxTokens: 700 });
      return json({ story: clean(result.story, 380), model: MODEL });
    }
    return json({ error: "Unknown request." }, 400);
  } catch (error) {
    console.error("[banter] failed", error instanceof Error ? error.message : error);
    return json({ error: "The announcer lost signal." }, 502);
  }
};
