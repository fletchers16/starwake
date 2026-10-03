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
  scores: Array<{ playerId: string; score: number; heat: number; name?: string; kind?: "human" | "bot"; flightTime?: number; dnf?: boolean }>;
  updatedAt: number;
};

type Live = { id: string; name: string; ship: string; d: number; x: number; y: number; score: number; at: number };

const COURSES = ["neon-rift", "io-storm", "titan-veil", "helix-deep", "earthfall-circuit", "jovian-shear"];
const SHIPS = ["kite", "bastion", "needle", "manta"];
const BOT_NAMES = ["VANTA-7", "ECHO/3", "MICA", "RUNE-8", "SOL"];
const HEAT_MS = 60000;
const COUNTDOWN_MS = 7000;
// After the heat clock ends, pilots who never report are scored as DNF.
const FINISH_GRACE_MS = 12000;
// A host silent this long hands the room to the most recently active pilot.
const HOST_TIMEOUT_MS = 25000;
const SEEN_WRITE_MS = 8000;
const MAX_HEAT_SCORE = 25000;

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

function scoreBots(room: Room) {
  for (let i = 0; i < room.bots; i++) {
    const botId = `bot-${i}`;
    if (room.scores.some((entry) => entry.playerId === botId && entry.heat === room.heat)) continue;
    const seed = [...`${room.code}:${room.heat}:${i}`].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
    room.scores.push({ playerId: botId, name: BOT_NAMES[i % BOT_NAMES.length], kind: "bot", score: 4000 + (seed % 7000), heat: room.heat, flightTime: 52 + (seed % 16000) / 1000 });
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
  const host = room.players.find((p) => p.id === room.hostId);
  const active = room.players.filter((p) => now - (p.lastSeen || 0) < HOST_TIMEOUT_MS);
  if (host && now - (host.lastSeen || now) > HOST_TIMEOUT_MS && active.length) {
    room.hostId = active.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))[0].id;
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
  const live = found.room.phase === "race" ? await readLive(code) : [];
  const draft = structuredClone(found.room);
  const stale = pilot && now - (pilot.lastSeen || 0) > SEEN_WRITE_MS;
  if (stale) draft.players.find((p) => p.id === playerId)!.lastSeen = now;
  if (maintain(draft, live, now) || stale) {
    const { room } = await mutateRoom(code, (r) => {
      const me = playerId ? r.players.find((p) => p.id === playerId) : undefined;
      if (me) me.lastSeen = now;
      maintain(r, live, now);
    });
    return { room, live };
  }
  return { room: found.room, live };
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" } });
  try {
    if (request.method === "GET") {
      const params = new URL(request.url).searchParams;
      const code = params.get("code")?.toUpperCase();
      if (!validCode(code)) return json({ error: "Enter a valid five-character room code." }, 400);
      const observed = await observeRoom(code, params.get("player") || undefined);
      return observed ? json(observed) : json({ error: "That room code was not found." }, 404);
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
        const room: Room = {
          code,
          hostId,
          phase: "lobby",
          heat: 1,
          courseId: forged && body.courseId === forged.id ? forged.id : COURSES.includes(body.courseId) ? body.courseId : "neon-rift",
          course: forged && body.courseId === forged.id ? forged : null,
          coursePrompt: typeof body.coursePrompt === "string" ? body.coursePrompt.slice(0, 120) : "",
          courseSeed: Number.isFinite(Number(body.courseSeed)) ? Number(body.courseSeed) >>> 0 : 0,
          players: [{ id: hostId, name: cleanName(body.name), ship: cleanShip(body.ship), kind: "human", progress: 0, score: 0, finished: false, lastSeen: Date.now() }],
          bots: Math.max(0, Math.min(7, Number(body.bots) || 0)),
          scores: [],
          updatedAt: Date.now(),
        };
        const result = await store().setJSON(code, room, { onlyIfNew: true });
        if (result.modified) return json({ room, playerId: hostId, host: true });
      }
      return json({ error: "Could not reserve a lobby code. Try again." }, 503);
    }

    const code = String(body.code || "").toUpperCase();
    if (!validCode(code)) return json({ error: "Enter a valid five-character room code." }, 400);

    if (action === "join") {
      const id = crypto.randomUUID();
      const { room } = await mutateRoom(code, (draft) => {
        if (draft.phase !== "lobby") throw new Error("This race has already started. Ask the host to open a new room.");
        if (draft.players.length >= 8) throw new Error("This lobby is full.");
        // Humans take priority over sim pilots: drop a bot to make room.
        if (totalOccupancy(draft) >= 8) draft.bots = Math.max(0, draft.bots - 1);
        draft.players.push({ id, name: cleanName(body.name), ship: cleanShip(body.ship), kind: "human", progress: 0, score: 0, finished: false, lastSeen: Date.now() });
      });
      return json({ room, playerId: id, host: room.hostId === id });
    }

    if (action === "get") {
      const observed = await observeRoom(code, body.playerId);
      return observed ? json(observed) : json({ error: "That room code was not found." }, 404);
    }

    const playerId = String(body.playerId || "");

    if (action === "live") {
      // In-race telemetry: each pilot writes only their own key (no contention)
      // and reads everyone else's in the same round trip.
      const found = await readRoom(code);
      if (!found) return json({ error: "That room code was not found." }, 404);
      const pilot = found.room.players.find((p) => p.id === playerId);
      if (!pilot) return json({ error: "Your pilot is no longer in this lobby." }, 409);
      const t = body.telemetry || {};
      const entry: Live = { id: pilot.id, name: pilot.name, ship: pilot.ship, d: finite(t.d, 0, 1e6), x: finite(t.x, -12, 12), y: finite(t.y, -12, 12), score: Math.floor(finite(t.score, 0, MAX_HEAT_SCORE)), at: Date.now() };
      await store().setJSON(liveKey(code, pilot.id), entry);
      const live = (await readLive(code)).filter((other) => other.id !== pilot.id && found.room.players.some((p) => p.id === other.id));
      return json({ live, phase: found.room.phase, heat: found.room.heat });
    }

    if (action === "leave") {
      const { room } = await mutateRoom(code, (draft) => removePilot(draft, playerId));
      await store().delete(liveKey(code, playerId)).catch(() => {});
      if (!room.players.length) await store().delete(code).catch(() => {});
      return json({ ok: true });
    }

    const { room } = await mutateRoom(code, (draft) => {
      const pilot = draft.players.find((candidate) => candidate.id === playerId);
      if (!pilot) throw new Error("Your pilot is no longer in this lobby.");
      pilot.lastSeen = Date.now();
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
        const score = Math.floor(finite(result.score, 0, MAX_HEAT_SCORE));
        pilot.progress = 1;
        pilot.score = score;
        pilot.finished = true;
        if (!draft.scores.some((entry) => entry.playerId === playerId && entry.heat === draft.heat)) {
          draft.scores.push({ playerId, score, heat: draft.heat, name: pilot.name, kind: "human", flightTime: finite(result.flightTime, 0, 600) });
        }
        scoreBots(draft);
        settleHeat(draft);
      } else if (action === "next") {
        if (draft.hostId !== playerId || draft.phase !== "results") throw new Error("The host can continue after every pilot finishes the heat.");
        draft.heat += 1;
        startHeat(draft);
      } else {
        throw new Error("Unknown game action.");
      }
    });
    if (action === "start" || action === "next") {
      // Clear last heat's telemetry so ghosts restart at the line.
      const { blobs } = await store().list({ prefix: `live/${code}/` });
      await Promise.all(blobs.map((blob) => store().delete(blob.key).catch(() => {})));
    }
    return json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong in the flight deck.";
    const status = /not found/i.test(message) ? 404 : /full|started|host|running|finished|no longer|valid|just started/i.test(message) ? 409 : 400;
    return json({ error: message }, status);
  }
};
