import { getStore } from "@netlify/blobs";

// Shared OpenAI helpers for the Netlify functions: structured-output calls and
// a per-IP daily rate limit (so nobody can spend the key by spamming requests).
export const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const EFFORT = process.env.OPENAI_REASONING_EFFORT ?? "minimal";

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const hasKey = () => !!process.env.OPENAI_API_KEY;

function outputText(response: any): string {
  if (typeof response?.output_text === "string") return response.output_text;
  for (const item of response?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
      if (part?.type === "refusal") throw new Error("refused");
    }
  }
  throw new Error("empty");
}

/** Call the Responses API with a strict JSON schema; returns the parsed object. */
export async function structured<T>({ instructions, input, name, schema, maxTokens = 1200, timeoutMs = 20000 }: { instructions: string; input: string; name: string; schema: object; maxTokens?: number; timeoutMs?: number }): Promise<T> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: MODEL,
      instructions,
      input,
      ...(EFFORT ? { reasoning: { effort: EFFORT } } : {}),
      text: { format: { type: "json_schema", name, strict: true, schema } },
      max_output_tokens: maxTokens,
      store: false,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(`OpenAI ${response.status}: ${data?.error?.message || "error"}`), { upstream: response.status, upstreamCode: String(data?.error?.code || data?.error?.type || "") });
  return JSON.parse(outputText(data)) as T;
}

/** True when this caller is still under `perDay` requests for `bucket` today. Counts the request. */
export async function underDailyLimit(request: Request, bucket: string, perDay: number): Promise<boolean> {
  const ip = request.headers.get("x-nf-client-connection-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const day = new Date().toISOString().slice(0, 10);
  const store = getStore({ name: "starwake-limits", consistency: "strong" });
  const key = `${bucket}/${day}/${ip}`;
  const count = Number((await store.get(key, { type: "json" }).catch(() => 0)) || 0);
  if (count >= perDay) return false;
  // Site-wide ceiling across every IP, so the daily spend has a hard top (AI_DAILY_CAP, default 800 calls).
  // Past it, the game quietly uses its canned lines and template recaps until tomorrow (UTC).
  const siteKey = `site/${day}`;
  const site = Number((await store.get(siteKey, { type: "json" }).catch(() => 0)) || 0);
  if (site >= Number(process.env.AI_DAILY_CAP || 800)) return false;
  await Promise.all([store.setJSON(key, count + 1), store.setJSON(siteKey, site + 1)]).catch(() => {});
  return true;
}
