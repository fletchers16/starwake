import { getStore } from "@netlify/blobs";
import { FORGE_INSTRUCTIONS, FORGE_SCHEMA, sanitizeForgedCourse } from "../../course-forge.js";
import { underDailyLimit } from "../lib/openai";

// World Forge: turn a pilot's prompt into a raceable course with OpenAI
// structured outputs. Requires OPENAI_API_KEY; OPENAI_MODEL and
// OPENAI_REASONING_EFFORT are optional overrides.
const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const EFFORT = process.env.OPENAI_REASONING_EFFORT ?? "minimal";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function outputText(response: any): string {
  if (typeof response?.output_text === "string") return response.output_text;
  for (const item of response?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
      if (part?.type === "refusal") throw new Error("The forge declined that prompt. Try describing a different world.");
    }
  }
  throw new Error("The forge returned no course.");
}

// Every world OpenAI forges is kept in a small pool. When AI is unavailable (no key, out of credit, rate-limited,
// upstream error), the forge serves the pooled real fusion that best matches the prompt's words, clearly labelled,
// instead of a generic remix. Seeded by `npm run warm:ai` after a deploy.
const POOL_KEY = "forge-pool/index";
type PoolEntry = { prompt: string; key: string };
const words = (t: string) => new Set(t.toLowerCase().match(/[a-z]{3,}/g) || []);

async function addToPool(cache: ReturnType<typeof getStore>, prompt: string, key: string) {
  const pool = ((await cache.get(POOL_KEY, { type: "json" }).catch(() => null)) as PoolEntry[] | null) || [];
  if (pool.some((e) => e.key === key)) return;
  await cache.setJSON(POOL_KEY, [{ prompt, key }, ...pool].slice(0, 40)).catch(() => {});
}

async function fromPool(cache: ReturnType<typeof getStore>, prompt: string) {
  const pool = ((await cache.get(POOL_KEY, { type: "json" }).catch(() => null)) as PoolEntry[] | null) || [];
  if (!pool.length) return null;
  const want = words(prompt);
  const scored = pool.map((e) => ({ e, score: [...words(e.prompt)].filter((w) => want.has(w)).length + Math.random() * 0.5 }));
  scored.sort((a, b) => b.score - a.score);
  const pick = scored[0].e;
  const course = await cache.get(pick.key, { type: "json" }).catch(() => null);
  return course ? { course, pooled: true, pooledPrompt: pick.prompt } : null;
}

async function fallback(cache: ReturnType<typeof getStore>, prompt: string, error: string, code: string) {
  const pooled = await fromPool(cache, prompt);
  return json({ fallback: true, error, code, ...(pooled || {}) });
}

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Use POST to forge a world." }, 405);
  const key = process.env.OPENAI_API_KEY;
  let prompt = "";
  try {
    prompt = String((await request.json())?.prompt ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
  } catch {}
  if (prompt.length < 3) return json({ error: "Describe a world to forge." }, 400);
  if (!key) return fallback(getStore({ name: "starwake-ai", consistency: "strong" }), prompt, "World Forge AI is not configured on this deployment.", "unconfigured");

  // Same prompt, same world: serve repeats from cache. New prompts are rate-limited per IP per day.
  const cacheKey = `forge/${[...prompt.toLowerCase()].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(36)}-${prompt.length}`;
  const cache = getStore({ name: "starwake-ai", consistency: "strong" });
  const cached = await cache.get(cacheKey, { type: "json" }).catch(() => null);
  if (cached) return json({ course: cached, model: MODEL, cached: true });
  if (!(await underDailyLimit(request, "forge", 15))) return fallback(cache, prompt, "You've forged a lot of worlds today. Try again tomorrow, or race one you've made.", "limited");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model: MODEL,
        instructions: FORGE_INSTRUCTIONS,
        input: prompt,
        ...(EFFORT ? { reasoning: { effort: EFFORT } } : {}),
        text: { format: { type: "json_schema", name: "starwake_course", strict: true, schema: FORGE_SCHEMA } },
        max_output_tokens: 4000,
        store: false,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[forge] OpenAI error", response.status, data?.error?.message);
      return fallback(cache, prompt, "The forge is overloaded. Try again in a moment.", "upstream");
    }
    const course = sanitizeForgedCourse(JSON.parse(outputText(data)), prompt);
    await cache.setJSON(cacheKey, course).catch(() => {});
    await addToPool(cache, prompt, cacheKey);
    return json({ course, model: MODEL });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[forge] failed", message);
    if (/declined/.test(message)) return json({ error: message }, 422);
    return fallback(cache, prompt, "The forge could not finish that world. Try again.", "upstream");
  }
};
