import { getStore } from "@netlify/blobs";
import { normalizeCourseDefinition } from "../../course-forge.js";

type Pilot = {
  id: string;
  name: string;
  ship: string;
  kind: "human";
  progress: number;
  score: number;
  finished: boolean;
  lastSeen?: number;
  // Private session secret: only this pilot's device knows it. The public `id` is shown to everyone.
  token?: string;
  // Set by a soft leave (reload / closed tab); the seat is released if not resumed in time.
  leftAt?: number;
};

type Room = {
  code: string;
  hostId: string;
  phase: "lobby" | "race" | "results" | "complete";
  heat: number;
  courseId?: string;
  coursePrompt?: string;
  courseSeed?: number;
  course?: Record<string, unknown> | null;
  startsAt?: number;
  endsAt?: number;
  players: Pilot[];
  bots: number;
  botSkill?: number;
  // Zap swings on sim pilots, summed over every human's report: heat -> per-bot points.
  botAdjust?: Record<number, number[]>;
  extendedMs?: number;
  // Bumped by each rematch so zap/steal records from an earlier season never leak into the next.
  round?: number;
  // Set when the room was opened to race a challenge link; its pilots' scores may join that ladder.
  challengeId?: string;
  ladderPosted?: string[];
  scores: Array<{ playerId: string; score: number; heat: number; name?: string; kind?: "human" | "bot"; flightTime?: number; dnf?: boolean }>;
  updatedAt: number;
};

type Live = { id: string; name: string; ship: string; d: number; x: number; y: number; score: number; at: number };

const COURSES = ["neon-rift", "io-storm", "titan-veil", "helix-deep", "earthfall-circuit", "jovian-shear"];
const SHIPS = ["kite", "bastion", "needle", "manta"];
// Sim pilots are the cartoon alien cast (same order as the client).
const BOT_NAMES = ["ZORP", "BLIX", "MUNGO", "QUEEP", "GLORB"];
const HEAT_MS = 60000;
const COUNTDOWN_MS = 4000;
// After the heat clock ends, pilots who never report are scored as DNF.
const FINISH_GRACE_MS = 12000;
// A host silent this long hands the room to the most recently active pilot.
const HOST_TIMEOUT_MS = 25000;
// How long a reloading pilot's seat is held after a soft leave.
const REJOIN_GRACE_MS = 30000;
// A pilot silent this long on both room polls and race telemetry is treated as gone.
const SILENT_DROP_MS = 45000;
const SEEN_WRITE_MS = 8000;
const MAX_HEAT_SCORE = 60000;

const store = () => getStore({ name: "starwake-rooms", consistency: "strong" });
const liveKey = (code: string, id: string) => `live/${code}/${id}`;
const json = (data: unknown, status = 200) =>
  Response.json({ ...(data && typeof data === "object" ? data : {}), serverNow: Date.now() }, { status, headers: { "Cache-Control": "no-store" } });
const validCode = (code: unknown): code is string =>
  typeof code === "string" && /^[A-Z0-9]{5}$/.test(code);
const cleanName = (name: unknown) =>
  typeof name === "string" ? name.trim().replace(/[<>]/g, "").slice(0, 18) || "Guest Pilot" : "Guest Pilot";
const cleanShip = (ship: unknown) => (typeof ship === "string" && SHIPS.includes(ship) ? ship : "kite");
const finite = (value: unknown, min: number, max: number) => Math.max(min, Math.min(max, Number(value) || 0));
const totalOccupancy = (room: Room) => room.players.length + room.bots;
// Rooms go out without pilot tokens; a request acts for a pilot only with that pilot's token.
const publicRoom = (room: Room): Room => ({ ...room, players: room.players.map(({ token, ...p }) => p) });
const authorised = (pilot: Pilot | undefined, body: { token?: unknown }) => !!pilot && (!pilot.token || pilot.token === body.token);

async function readRoom(code: string) {
  const entry = await store().getWithMetadata(code, { consistency: "strong", type: "json" });
  return entry?.data ? { room: entry.data as Room, etag: entry.etag } : null;
}

async function mutateRoom<T>(code: string, mutate: (room: Room) => T): Promise<{ room: Room; value: T }> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const existing = await readRoom(code);
    if (!existing) throw new Error("That room code was not found.");
    const room: Room = structuredClone(existing.room);
    const value = mutate(room);
    room.updatedAt = Date.now();
    const result = await store().setJSON(code, room, { onlyIfMatch: existing.etag });
    if (result.modified) return { room, value };
  }
  throw new Error("The lobby is busy. Try that action again.");
}

async function readLive(code: string): Promise<Live[]> {
  const s = store();
  const { blobs } = await s.list({ prefix: `live/${code}/` });
  const entries = await Promise.all(blobs.map((blob) => s.get(blob.key, { type: "json" }) as Promise<Live | null>));
  return entries.filter((entry): entry is Live => !!entry);
}

// Laser zaps between humans: each shooter keeps a cumulative hit count per target
// under its own key (zap/CODE/HEAT/TARGET/SHOOTER), so simultaneous hits never overwrite
// each other. The target reads its inbox with each telemetry update.
type Zap = { from: string; name: string; count: number; at: number };
// `heat` here is a round-qualified heat key (see heatKey), so a rematch starts with clean records.
const heatKey = (room: Room) => `${room.round || 0}.${room.heat}`;
const zapKey = (code: string, heat: string, target: string, from: string) => `zap/${code}/${heat}/${target}/${from}`;
async function readZaps(code: string, heat: string, target: string): Promise<Zap[]> {
  const s = store();
  const { blobs } = await s.list({ prefix: `zap/${code}/${heat}/${target}/` });
  const entries = await Promise.all(blobs.map((blob) => s.get(blob.key, { type: "json" }) as Promise<Zap | null>));
  return entries.filter((entry): entry is Zap => !!entry);
}

// Confirmed steals: the victim reports what each zap actually cost it (after shields,
// bounty and frenzy), so the shooter is credited exactly that: paid/CODE/HEAT/SHOOTER/VICTIM.
type Paid = { from: string; name: string; amount: number };
const paidKey = (code: string, heat: string, shooter: string, victim: string) => `paid/${code}/${heat}/${shooter}/${victim}`;
// Every confirmed steal this heat, as { shooter, from, name, amount } (shooter comes from the key).
async function readAllPaid(code: string, heat: string): Promise<(Paid & { shooter: string })[]> {
  const s = store();
  const prefix = `paid/${code}/${heat}/`;
  const { blobs } = await s.list({ prefix });
  const entries = await Promise.all(blobs.map(async (blob) => {
    const entry = (await s.get(blob.key, { type: "json" })) as Paid | null;
    return entry ? { ...entry, shooter: blob.key.slice(prefix.length).split("/")[0] } : null;
  }));
  return entries.filter((entry): entry is Paid & { shooter: string } => !!entry);
}

// Quick-chat emotes between humans: one current emote per pilot, shown to everyone else for a few seconds.
const EMOTES = ["GG!", "COMING FOR YOU", "NICE SHOT!", "OOPS", "CATCH ME!"];
const emoteKey = (code: string, pilot: string) => `emote/${code}/${pilot}`;
type Emote = { from: string; name: string; text: string; at: number };
async function recentEmotes(code: string, room: Room): Promise<Emote[]> {
  if (room.players.length < 2) return [];
  const all = await Promise.all(room.players.map((p) => store().get(emoteKey(code, p.id), { type: "json" }).catch(() => null) as Promise<Emote | null>));
  return all.filter((e): e is Emote => !!e && Date.now() - e.at < 6000);
}

// "Beat my run" challenges: a recorded run plus the exact course layout, shared by link.
const challengeKey = (id: string) => `challenge/${id}`;
// A ladder is the leaderboard for a chain of challenges (an original link and every "send it back"),
// keyed by the chain's root challenge: each pilot's best score on that track.
// `id` is that pilot's best run on this chain, saved as a reply challenge, so others can race it.
// `device` is a random per-device pilot id, so rungs follow the pilot rather than the callsign.
type Rung = { name: string; score: number; at: number; id?: string; device?: string };
const deviceHash = (d: string) => [...d].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(36);
// Ladders go out with a hash of each device id (enough to say "that's you"), never the id itself.
const publicLadder = (rungs: Rung[]) => rungs.map(({ device, ...r }) => ({ ...r, ...(device ? { dh: deviceHash(device) } : {}) }));
const cleanDevice = (d: unknown) => (typeof d === "string" && /^[a-z0-9]{12,32}$/.test(d) ? d : undefined);
const ladderKey = (root: string) => `ladder/${root}`;
async function addRung(root: string, name: string, score: number, id?: string, device?: string) {
  const s = store();
  const rungs = ((await s.get(ladderKey(root), { type: "json" })) as Rung[] | null) || [];
  const mine = rungs.find((r) => (device && r.device ? r.device === device : r.name === name));
  if (mine) { mine.name = name; if (score > mine.score) { mine.score = score; mine.at = Date.now(); if (id) mine.id = id; } }
  else rungs.push({ name, score, at: Date.now(), ...(id ? { id } : {}), ...(device ? { device } : {}) });
  rungs.sort((a, b) => b.score - a.score);
  await s.setJSON(ladderKey(root), rungs.slice(0, 50));
  return publicLadder(rungs.slice(0, 10));
}
const validChallengeId = (id: unknown): id is string => typeof id === "string" && /^[a-z0-9]{8}$/.test(id);
function cleanRun(run: unknown) {
  if (!Array.isArray(run)) return [];
  return run.slice(0, 1500).map((p) => (Array.isArray(p) ? [finite(p[0], 0, 600), finite(p[1], -50, 1e6), finite(p[2], -12, 12), finite(p[3], -12, 12)].map((v) => Math.round(v * 100) / 100) : null)).filter(Boolean);
}

// Same mixing hash as the client's botSeed, so live standings match final results.
function botSeed(code: string, heat: number, i: number) {
  let h = 2166136261;
  for (const c of `${code}:${heat}:${i}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return h >>> 0;
}

function botLapTime(pace: number, skill: number, seed: number) {
  // Laps come from the pilot's pace and the league's skill (scores at rookie level all hit the cap before).
  return Math.round(Math.max(38, Math.min(59.5, 57 - (pace - 0.8) * 20 - Math.min(2, skill) * 2 + (seed % 300) / 100)) * 10) / 10;
}

/**
 * Sim-pilot heat score (same formula as the client's botLiveScore): rubber-banded to
 * the human field, so races stay close and zaps swing the standings, plus a
 * rank-scaled base so stronger leagues field stronger pilots.
 *   score = 0.55 * pace * fieldAverage + 0.45 * base + zap swings
 */
function botProfile(code: string, heat: number, i: number, skill = 1) {
  const seed = botSeed(code, heat, i);
  return { seed, base: (1500 + (seed % 2500)) * skill, pace: 0.8 + (seed % 46) / 100 };
}

// Upserts this heat's sim-pilot scores from the humans reported so far (re-run on every report).
function scoreBots(room: Room) {
  const humans = room.scores.filter((e) => e.kind === "human" && e.heat === room.heat && !e.dnf);
  const field = humans.length ? humans.reduce((sum, e) => sum + e.score, 0) / humans.length : 0;
  const adjust = room.botAdjust?.[room.heat] || [];
  for (let i = 0; i < room.bots; i++) {
    const botId = `bot-${i}`;
    const { seed, base, pace } = botProfile(room.code, room.heat, i, room.botSkill ?? 1);
    // The rank-scaled floor never towers over the field, so a first-timer still has a race.
    const score = Math.floor(finite(Math.round(0.55 * pace * field + 0.45 * Math.min(base, field * 1.4 + 300)) + (adjust[i] || 0), 0, MAX_HEAT_SCORE));
    const entry = room.scores.find((e) => e.playerId === botId && e.heat === room.heat);
    if (entry) entry.score = score;
    else room.scores.push({ playerId: botId, name: BOT_NAMES[i % BOT_NAMES.length], kind: "bot", score, heat: room.heat, flightTime: botLapTime(pace, room.botSkill ?? 1, seed) });
  }
}

function settleHeat(room: Room) {
  if (room.players.every((p) => p.finished)) room.phase = room.heat >= 3 ? "complete" : "results";
}

function startHeat(room: Room) {
  room.phase = "race";
  room.startsAt = Date.now() + COUNTDOWN_MS;
  room.endsAt = room.startsAt + HEAT_MS;
  room.players.forEach((p) => { p.progress = 0; p.score = 0; p.finished = false; });
  room.extendedMs = 0;
}

function removePilot(room: Room, playerId: string) {
  room.players = room.players.filter((p) => p.id !== playerId);
  if (room.hostId === playerId && room.players.length) {
    room.hostId = [...room.players].sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))[0].id;
  }
  if (room.phase === "race") settleHeat(room);
}

/**
 * Housekeeping that would otherwise need a scheduler: resolve heats stuck on
 * disconnected pilots and hand off a silent host. Returns true if it changed
 * the room, so the caller can persist it.
 */
function maintain(room: Room, live: Live[], now: number) {
  let changed = false;
  // A racing pilot doesn't poll the room, but streams telemetry: either counts as being here.
  const seenAt = (p: Pilot) => Math.max(p.lastSeen || 0, live.find((entry) => entry.id === p.id)?.at || 0);
  // Released: soft-left pilots who didn't resume, and pilots silent on every channel (a killed app,
  // a locked phone) who would otherwise DNF every heat and hold each heat open for the grace period.
  // Multiplayer only: a solo racer streams no telemetry, so silence there is normal.
  for (const pilot of room.players.filter((p) => (p.leftAt && now - p.leftAt > REJOIN_GRACE_MS) || (room.players.length > 1 && room.phase !== "lobby" && seenAt(p) && now - seenAt(p) > SILENT_DROP_MS))) {
    removePilot(room, pilot.id);
    changed = true;
  }
  if (room.phase === "race" && room.endsAt && now > room.endsAt + FINISH_GRACE_MS) {
    for (const pilot of room.players.filter((p) => !p.finished)) {
      const last = live.find((entry) => entry.id === pilot.id);
      const score = Math.floor(finite(last?.score, 0, MAX_HEAT_SCORE));
      pilot.finished = true;
      pilot.score = score;
      if (!room.scores.some((entry) => entry.playerId === pilot.id && entry.heat === room.heat)) {
        room.scores.push({ playerId: pilot.id, name: pilot.name, kind: "human", score, heat: room.heat, flightTime: HEAT_MS / 1000, dnf: true });
      }
    }
    scoreBots(room);
    settleHeat(room);
    changed = true;
  }
  // A racing pilot doesn't poll the room, but streams telemetry: either counts as being here.
  // (Missing this handed "host" away mid-heat and froze live seasons after heat 1.)
  const seen = (p: Pilot) => Math.max(p.lastSeen || 0, live.find((entry) => entry.id === p.id)?.at || 0);
  const host = room.players.find((p) => p.id === room.hostId);
  const active = room.players.filter((p) => now - seen(p) < HOST_TIMEOUT_MS);
  if (host && seen(host) && now - seen(host) > HOST_TIMEOUT_MS && active.length) {
    room.hostId = active.sort((a, b) => seen(b) - seen(a))[0].id;
    changed = true;
  }
  return changed;
}

/** Read a room, recording that `playerId` is still here and running housekeeping. */
async function observeRoom(code: string, playerId?: string) {
  const found = await readRoom(code);
  if (!found) return null;
  const now = Date.now();
  const pilot = playerId ? found.room.players.find((p) => p.id === playerId) : undefined;
  // Telemetry stays relevant through results: it's how a pilot who just raced counts as present.
  const live = found.room.phase !== "lobby" ? await readLive(code) : [];
  const draft = structuredClone(found.room);
  const stale = pilot && now - (pilot.lastSeen || 0) > SEEN_WRITE_MS;
  if (stale) draft.players.find((p) => p.id === playerId)!.lastSeen = now;
  if (maintain(draft, live, now) || stale) {
    const { room } = await mutateRoom(code, (r) => {
      const me = playerId ? r.players.find((p) => p.id === playerId) : undefined;
      if (me) me.lastSeen = now;
      maintain(r, live, now);
    });
    return { room, live, emotes: await recentEmotes(code, room) };
  }
  return { room: found.room, live, emotes: await recentEmotes(code, found.room) };
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" } });
  try {
    if (request.method === "GET") {
      const params = new URL(request.url).searchParams;
      const code = params.get("code")?.toUpperCase();
      if (!validCode(code)) return json({ error: "Enter a valid five-character room code." }, 400);
      const observed = await observeRoom(code, params.get("player") || undefined);
      return observed ? json({ ...observed, room: publicRoom(observed.room) }) : json({ error: "That room code was not found." }, 404);
    }
    if (request.method !== "POST") return json({ error: "Use GET or POST for game actions." }, 405);

    const body = await request.json();
    const action = body.action;

    if (action === "create") {
      const forged = normalizeCourseDefinition(body.course);
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = Math.random().toString(36).slice(2, 7).toUpperCase();
        if (!validCode(code)) continue;
        const hostId = crypto.randomUUID();
        const token = crypto.randomUUID();
        const room: Room = {
          code,
          hostId,
          phase: "lobby",
          heat: 1,
          courseId: forged && body.courseId === forged.id ? forged.id : COURSES.includes(body.courseId) ? body.courseId : "neon-rift",
          course: forged && body.courseId === forged.id ? forged : null,
          coursePrompt: typeof body.coursePrompt === "string" ? body.coursePrompt.slice(0, 120) : "",
          courseSeed: Number.isFinite(Number(body.courseSeed)) ? Number(body.courseSeed) >>> 0 : 0,
          players: [{ id: hostId, token, name: cleanName(body.name), ship: cleanShip(body.ship), kind: "human", progress: 0, score: 0, finished: false, lastSeen: Date.now() }],
          bots: Math.max(0, Math.min(7, Number(body.bots) || 0)),
          // Sim-pilot strength picked by the host's rank: 0.45 for rookies up to 2 (competitive with clean runs).
          botSkill: Math.max(0.45, Math.min(2, Number(body.botSkill) || 1)),
          challengeId: validChallengeId(body.challengeId) ? body.challengeId : undefined,
          scores: [],
          updatedAt: Date.now(),
        };
        const result = await store().setJSON(code, room, { onlyIfNew: true });
        if (result.modified) return json({ room: publicRoom(room), playerId: hostId, token, host: true });
      }
      return json({ error: "Could not reserve a lobby code. Try again." }, 503);
    }

    if (action === "challenge-save") {
      const c = body.challenge || {};
      const forged = normalizeCourseDefinition(c.course);
      const courseId = forged && c.courseId === forged.id ? forged.id : COURSES.includes(c.courseId) ? c.courseId : null;
      if (!courseId) return json({ error: "That course can't be shared." }, 400);
      if (!validCode(c.layoutCode)) return json({ error: "Missing course layout." }, 400);
      // The challenge's score (its target and ladder entry) is the one the server recorded for
      // this signed-in pilot, never a number the client sends.
      const roomCode = String(body.code || "").toUpperCase();
      if (!validCode(roomCode)) return json({ error: "Finish a heat first, then challenge a friend." }, 400);
      const source = await readRoom(roomCode);
      const sender = source?.room.players.find((p) => p.id === String(body.playerId || ""));
      if (!source || !authorised(sender, body)) return json({ error: "This device isn't signed in as that pilot." }, 403);
      const recorded = source.room.scores.find((e) => e.playerId === sender!.id && e.heat === Math.max(1, Math.min(3, Number(c.roomHeat) || 1)));
      if (!recorded) return json({ error: "Finish the heat first, then challenge a friend." }, 409);
      const id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
      const challenge = {
        id, courseId, course: forged && courseId === forged.id ? forged : null,
        coursePrompt: typeof c.coursePrompt === "string" ? c.coursePrompt.slice(0, 120) : "",
        courseSeed: Number(c.courseSeed) >>> 0, layoutCode: c.layoutCode, heat: Math.max(1, Math.min(3, Number(c.heat) || 1)),
        name: sender!.name, ship: cleanShip(c.ship), score: recorded.score,
        duration: finite(c.duration, 10, 600), run: cleanRun(c.run), parent: validChallengeId(c.parent) ? c.parent : null, createdAt: Date.now(),
        root: id,
      };
      // Rematch links join their parent's ladder.
      if (challenge.parent) {
        const parent = (await store().get(challengeKey(challenge.parent), { type: "json" })) as { id: string; root?: string } | null;
        if (parent) challenge.root = parent.root || parent.id;
      }
      await store().setJSON(challengeKey(id), challenge);
      // A new dare starts its ladder with the sender. A send-it-back reply is already on the
      // chain's ladder (posted from its challenge room), so it adds nothing here.
      if (!challenge.parent) await addRung(challenge.root, challenge.name, challenge.score, id, cleanDevice(body.device));
      return json({ id });
    }
    if (action === "challenge-get") {
      if (!validChallengeId(body.id)) return json({ error: "That challenge link is broken." }, 400);
      const challenge = (await store().get(challengeKey(body.id), { type: "json" })) as { root?: string; id: string } | null;
      if (!challenge) return json({ error: "That challenge has expired." }, 404);
      const ladder = publicLadder((((await store().get(ladderKey(challenge.root || challenge.id), { type: "json" })) as Rung[] | null) || []).slice(0, 10));
      return json({ challenge, ladder });
    }
    if (action === "challenge-result") {
      // A pilot finished a challenge heat. Only the score the server already recorded (and capped)
      // for that signed-in pilot, in a room opened for this challenge, goes on the ladder, once.
      if (!validChallengeId(body.id) || !validCode(String(body.code || "").toUpperCase())) return json({ error: "That challenge link is broken." }, 400);
      const challenge = (await store().get(challengeKey(body.id), { type: "json" })) as { root?: string; id: string } | null;
      if (!challenge) return json({ error: "That challenge has expired." }, 404);
      let entry: { name: string; score: number } | null = null;
      await mutateRoom(String(body.code).toUpperCase(), (draft) => {
        const pilot = draft.players.find((p) => p.id === String(body.playerId || ""));
        if (!authorised(pilot, body)) throw new Error("This device isn't signed in as that pilot.");
        if (draft.challengeId !== challenge.id) throw new Error("This room wasn't opened for that challenge.");
        const recorded = draft.scores.find((e) => e.playerId === pilot!.id && e.heat === 1);
        if (!recorded) throw new Error("Finish the heat first.");
        if ((draft.ladderPosted ||= []).includes(pilot!.id)) return;
        draft.ladderPosted.push(pilot!.id);
        entry = { name: pilot!.name, score: recorded.score };
      });
      // An optional reply run (saved by this pilot from this race) becomes their raceable rung.
      let replyId: string | undefined;
      if (validChallengeId(body.replyId)) {
        const reply = (await store().get(challengeKey(body.replyId), { type: "json" })) as { root?: string; name?: string } | null;
        if (reply && reply.root === (challenge.root || challenge.id) && reply.name === (entry as { name: string } | null)?.name) replyId = body.replyId;
      }
      const ladder = entry ? await addRung(challenge.root || challenge.id, (entry as { name: string }).name, (entry as { score: number }).score, replyId, cleanDevice(body.device)) : publicLadder((((await store().get(ladderKey(challenge.root || challenge.id), { type: "json" })) as Rung[] | null) || []).slice(0, 10));
      return json({ ladder });
    }

    const code = String(body.code || "").toUpperCase();
    if (!validCode(code)) return json({ error: "Enter a valid five-character room code." }, 400);

    if (action === "join") {
      const id = crypto.randomUUID();
      const token = crypto.randomUUID();
      const { room } = await mutateRoom(code, (draft) => {
        // New pilots can join in the lobby or between heats (they fly from the next heat).
        if (draft.phase === "race") throw new Error("A heat is in progress. Try again in a moment: the room accepts pilots between heats.");
        if (draft.phase === "complete") throw new Error("This season is over. Ask the host for a rematch or a new room.");
        if (draft.players.length >= 8) throw new Error("This lobby is full.");
        // Humans take priority over sim pilots: drop a bot to make room.
        if (totalOccupancy(draft) >= 8) draft.bots = Math.max(0, draft.bots - 1);
        // Two pilots can't share a name in one room: the newcomer gets a number.
        let name = cleanName(body.name);
        for (let n = 2; draft.players.some((p) => p.name === name); n++) name = `${cleanName(body.name).slice(0, 15)} ${n}`;
        draft.players.push({ id, token, name, ship: cleanShip(body.ship), kind: "human", progress: 0, score: 0, finished: false, lastSeen: Date.now() });
      });
      return json({ room: publicRoom(room), playerId: id, token, host: room.hostId === id });
    }

    if (action === "get") {
      const observed = await observeRoom(code, body.playerId);
      return observed ? json({ ...observed, room: publicRoom(observed.room) }) : json({ error: "That room code was not found." }, 404);
    }

    const playerId = String(body.playerId || "");

    if (action === "live") {
      // In-race telemetry: each pilot writes only their own key (no contention)
      // and reads everyone else's in the same round trip.
      const found = await readRoom(code);
      if (!found) return json({ error: "That room code was not found." }, 404);
      const pilot = found.room.players.find((p) => p.id === playerId);
      if (!pilot) return json({ error: "Your pilot is no longer in this lobby." }, 409);
      if (!authorised(pilot, body)) return json({ error: "This device isn't signed in as that pilot." }, 403);
      const t = body.telemetry || {};
      const entry: Live = { id: pilot.id, name: pilot.name, ship: pilot.ship, d: finite(t.d, 0, 1e6), x: finite(t.x, -12, 12), y: finite(t.y, -12, 12), score: Math.floor(finite(t.score, 0, MAX_HEAT_SCORE)), at: Date.now() };
      await store().setJSON(liveKey(code, pilot.id), entry);
      // Outgoing zaps: cumulative counts per human target in this room.
      const zaps = Array.isArray(body.zaps) ? body.zaps.slice(0, 8) : [];
      // At most 2 new zaps per target per update (a blaster fires 3 shots a few hundred ms apart).
      await Promise.all(zaps.filter((z: { target?: string }) => z && z.target !== pilot.id && found.room.players.some((p) => p.id === z.target)).map(async (z: { target: string; count: number }) => {
        const key = zapKey(code, heatKey(found.room), z.target, pilot.id);
        const prev = Number(((await store().get(key, { type: "json" })) as Zap | null)?.count || 0);
        const count = Math.min(Math.floor(finite(z.count, 0, 999)), prev + 2);
        if (count > prev) await store().setJSON(key, { from: pilot.id, name: pilot.name, count, at: Date.now() });
      }));
      const paid = Array.isArray(body.paid) ? body.paid.slice(0, 8) : [];
      // A payment is only valid against zaps that shooter actually landed on us, capped per zap.
      await Promise.all(paid.filter((p: { to?: string }) => p && p.to !== pilot.id && found.room.players.some((x) => x.id === p.to)).map(async (p: { to: string; amount: number }) => {
        const zaps = Number(((await store().get(zapKey(code, heatKey(found.room), pilot.id, p.to), { type: "json" })) as Zap | null)?.count || 0);
        if (!zaps) return;
        await store().setJSON(paidKey(code, heatKey(found.room), p.to, pilot.id), { from: pilot.id, name: pilot.name, amount: Math.floor(finite(p.amount, 0, zaps * 1500)) });
      }));
      if (Number.isInteger(body.emote) && EMOTES[body.emote]) await store().setJSON(emoteKey(code, pilot.id), { from: pilot.id, name: pilot.name, text: EMOTES[body.emote], at: Date.now() });
      const [live, zapped, allPaid, emotes] = await Promise.all([
        readLive(code), readZaps(code, heatKey(found.room), pilot.id), readAllPaid(code, heatKey(found.room)),
        Promise.all(found.room.players.filter((p) => p.id !== pilot.id).map((p) => store().get(emoteKey(code, p.id), { type: "json" }).catch(() => null))),
      ]);
      const names = new Map(found.room.players.map((p) => [p.id, p.name]));
      const credits = allPaid.filter((p) => p.shooter === pilot.id);
      // The room-wide steal feed: who stole how much from whom (cumulative per pair).
      const steals = allPaid.map((p) => ({ thief: names.get(p.shooter) || "RIVAL", thiefId: p.shooter, victim: p.name, victimId: p.from, amount: p.amount }));
      const recentEmotes = (emotes as ({ from: string; name: string; text: string; at: number } | null)[]).filter((e) => e && Date.now() - e.at < 6000);
      return json({ live: live.filter((other) => other.id !== pilot.id && found.room.players.some((p) => p.id === other.id)), zapped, credits, steals, emotes: recentEmotes, phase: found.room.phase, heat: found.room.heat });
    }

    if (action === "leave") {
      const { room } = await mutateRoom(code, (draft) => {
        const pilot = draft.players.find((p) => p.id === playerId);
        if (pilot && !authorised(pilot, body)) throw new Error("This device isn't signed in as that pilot.");
        // A page reload or closed tab sends a soft leave: the seat is held so the pilot can resume.
        if (body.soft && pilot) pilot.leftAt = Date.now();
        else removePilot(draft, playerId);
      });
      if (body.soft) return json({ ok: true });
      await store().delete(liveKey(code, playerId)).catch(() => {});
      if (!room.players.length) {
        await store().delete(code).catch(() => {});
        // Empty room: drop its telemetry, zap and steal records too.
        for (const prefix of [`live/${code}/`, `zap/${code}/`, `paid/${code}/`, `emote/${code}/`]) {
          const { blobs } = await store().list({ prefix }).catch(() => ({ blobs: [] as { key: string }[] }));
          await Promise.all(blobs.map((b) => store().delete(b.key).catch(() => {})));
        }
      }
      return json({ ok: true });
    }

    const { room } = await mutateRoom(code, (draft) => {
      const pilot = draft.players.find((candidate) => candidate.id === playerId);
      if (!pilot) throw new Error("Your pilot is no longer in this lobby.");
      if (!authorised(pilot, body)) throw new Error("This device isn't signed in as that pilot.");
      pilot.lastSeen = Date.now();
      delete pilot.leftAt; // any signed-in action means they're back
      if (action === "bots") {
        if (draft.hostId !== playerId || draft.phase !== "lobby") throw new Error("Only the lobby host can change sim pilots.");
        draft.bots = Math.max(0, Math.min(8 - draft.players.length, Number(body.count) || 0));
      } else if (action === "start") {
        if (draft.hostId !== playerId || draft.phase !== "lobby") throw new Error("Only the lobby host can start this race.");
        startHeat(draft);
      } else if (action === "complete") {
        if (draft.phase !== "race") throw new Error("This heat is not running.");
        if (Date.now() < (draft.startsAt || 0) + 5000) throw new Error("This heat has only just started.");
        const result = body.result || {};
        // A heat can't out-score the time actually flown: ~240 pts/s is a flawless run; allow headroom.
        const flown = Math.max(0, Math.min(HEAT_MS, Date.now() - (draft.startsAt || 0))) / 1000;
        const score = Math.floor(finite(result.score, 0, Math.min(MAX_HEAT_SCORE, 1500 + flown * 320)));
        pilot.progress = 1;
        pilot.score = score;
        pilot.finished = true;
        if (!draft.scores.some((entry) => entry.playerId === playerId && entry.heat === draft.heat)) {
          draft.scores.push({ playerId, score, heat: draft.heat, name: pilot.name, kind: "human", flightTime: finite(result.flightTime, 0, 600) });
          // Zap swings on sim pilots: counted once per pilot per heat (retries and repeats are ignored).
          const adjust = Array.isArray(result.botAdjust) ? result.botAdjust : [];
          const totals = (draft.botAdjust ||= {})[draft.heat] ||= [];
          for (let i = 0; i < draft.bots; i++) totals[i] = (totals[i] || 0) + Math.round(finite(adjust[i], -1500, 1500));
        }
        scoreBots(draft);
        settleHeat(draft);
      } else if (action === "extend") {
        // Solo pause: only a room with a single human may stretch its heat clock.
        if (draft.phase !== "race" || draft.players.length !== 1) throw new Error("Only solo heats can pause.");
        // At most two minutes of pausing per heat.
        const ms = Math.max(0, Math.min(120000 - (draft.extendedMs || 0), Number(body.ms) || 0));
        draft.extendedMs = (draft.extendedMs || 0) + ms;
        draft.startsAt = (draft.startsAt || 0) + ms;
        draft.endsAt = (draft.endsAt || 0) + ms;
      } else if (action === "emote") {
        // Quick chat outside races (lobby / results); written after the room update below.
        if (!Number.isInteger(body.emote) || !EMOTES[body.emote]) throw new Error("Unknown emote.");
      } else if (action === "resume") {
        // A reloaded tab reclaims its seat with its token.
        delete pilot.leftAt;
      } else if (action === "rematch") {
        // Same crew, fresh season: the host restarts heat 1 for everyone once a season is complete.
        if (draft.hostId !== playerId || draft.phase !== "complete") throw new Error("The host can call a rematch once the season is over.");
        draft.round = (draft.round || 0) + 1;
        draft.heat = 1;
        draft.scores = [];
        draft.botAdjust = {};
        startHeat(draft);
      } else if (action === "next") {
        if (draft.hostId !== playerId || draft.phase !== "results") throw new Error("The host can continue after every pilot finishes the heat.");
        draft.heat += 1;
        startHeat(draft);
      } else {
        throw new Error("Unknown game action.");
      }
    });
    if (action === "emote") {
      const pilot = room.players.find((p) => p.id === playerId)!;
      await store().setJSON(emoteKey(code, pilot.id), { from: pilot.id, name: pilot.name, text: EMOTES[body.emote], at: Date.now() });
    }
    if (action === "start" || action === "next" || action === "rematch") {
      // Clear last heat's telemetry so ghosts restart at the line (and a pilot who left can't be scored from it).
      const { blobs } = await store().list({ prefix: `live/${code}/` });
      await Promise.all(blobs.map((blob) => store().delete(blob.key).catch(() => {})));
    }
    return json({ room: publicRoom(room) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong in the flight deck.";
    const status = /signed in/i.test(message) ? 403 : /not found/i.test(message) ? 404 : /full|started|host|running|finished|no longer|valid|just started/i.test(message) ? 409 : 400;
    return json({ error: message }, status);
  }
};
