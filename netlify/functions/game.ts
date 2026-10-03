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
  scores: Array<{ playerId: string; score: number; heat: number; name?: string; kind?: "human" | "bot"; flightTime?: number }>;
  updatedAt: number;
};

const store = () => getStore({ name: "starwake-rooms", consistency: "strong" });
const json = (data: unknown, status = 200) =>
  Response.json({ ...(data && typeof data === "object" ? data : {}), serverNow: Date.now() }, { status, headers: { "Cache-Control": "no-store" } });
const validCode = (code: unknown): code is string =>
  typeof code === "string" && /^[A-Z0-9]{5}$/.test(code);
const cleanName = (name: unknown) =>
  typeof name === "string" ? name.trim().replace(/[<>]/g, "").slice(0, 18) || "Guest Pilot" : "Guest Pilot";
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

export default async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" } });
  try {
    if (request.method === "GET") {
      const code = new URL(request.url).searchParams.get("code")?.toUpperCase();
      if (!validCode(code)) return json({ error: "Enter a valid five-character room code." }, 400);
      const found = await readRoom(code);
      return found ? json({ room: found.room }) : json({ error: "That room code was not found." }, 404);
    }
    if (request.method !== "POST") return json({ error: "Use GET or POST for game actions." }, 405);

    const body = await request.json();
    const action = body.action;

    if (action === "create") {
      const forged = normalizeCourseDefinition(body.course);
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = Math.random().toString(36).slice(2, 7).toUpperCase();
        const hostId = crypto.randomUUID();
        const room: Room = {
          code,
          hostId,
          phase: "lobby",
          heat: 1,
          courseId: forged && body.courseId === forged.id ? forged.id : ["neon-rift", "io-storm", "titan-veil", "helix-deep", "earthfall-circuit", "jovian-shear"].includes(body.courseId) ? body.courseId : "neon-rift",
          course: forged && body.courseId === forged.id ? forged : null,
          coursePrompt: typeof body.coursePrompt === "string" ? body.coursePrompt.slice(0, 120) : "",
          courseSeed: Number.isFinite(Number(body.courseSeed)) ? Number(body.courseSeed) >>> 0 : 0,
          players: [{ id: hostId, name: cleanName(body.name), ship: ["kite", "bastion", "needle", "manta"].includes(body.ship) ? body.ship : "kite", kind: "human", progress: 0, score: 0, finished: false }],
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
        if (draft.phase !== "lobby") throw new Error("This race has already started.");
        if (totalOccupancy(draft) >= 8) throw new Error("This lobby is full.");
        draft.players.push({ id, name: cleanName(body.name), ship: ["kite", "bastion", "needle", "manta"].includes(body.ship) ? body.ship : "kite", kind: "human", progress: 0, score: 0, finished: false });
      });
      return json({ room, playerId: id, host: room.hostId === id });
    }

    if (action === "get") {
      const found = await readRoom(code);
      return found ? json({ room: found.room }) : json({ error: "That room code was not found." }, 404);
    }

    const playerId = String(body.playerId || "");
    const { room } = await mutateRoom(code, (draft) => {
      const pilot = draft.players.find((candidate) => candidate.id === playerId);
      if (!pilot) throw new Error("Your pilot is no longer in this lobby.");
      if (action === "bots") {
        if (draft.hostId !== playerId || draft.phase !== "lobby") throw new Error("Only the lobby host can change sim pilots.");
        draft.bots = Math.max(0, Math.min(8 - draft.players.length, Number(body.count) || 0));
      } else if (action === "start") {
        if (draft.hostId !== playerId || draft.phase !== "lobby") throw new Error("Only the lobby host can start this race.");
        draft.phase = "race";
        draft.startsAt = Date.now() + 7000;
        draft.endsAt = draft.startsAt + 60000;
        draft.players.forEach((p) => { p.progress = 0; p.score = 0; p.finished = false; });
      } else if (action === "patch") {
        if (draft.phase !== "race") throw new Error("This heat is not running.");
        if (body.patch && Number.isFinite(Number(body.patch.progress))) pilot.progress = Math.max(0, Math.min(1, Number(body.patch.progress)));
        if (body.patch && Number.isFinite(Number(body.patch.score))) pilot.score = Math.max(0, Math.min(100000, Math.floor(Number(body.patch.score))));
        if (body.patch?.finished === true) pilot.finished = true;
        if (body.patch?.ship && typeof body.patch.ship === "string") pilot.ship = body.patch.ship.slice(0, 24);
      } else if (action === "complete") {
        if (draft.phase !== "race") throw new Error("This heat is not running.");
        const result = body.result || {};
        const score = Math.max(0, Math.min(100000, Math.floor(Number(result.score) || 0)));
        pilot.progress = 1;
        pilot.score = score;
        pilot.finished = true;
        if (!draft.scores.some((entry) => entry.playerId === playerId && entry.heat === draft.heat)) {
          draft.scores.push({ playerId, score, heat: draft.heat, name: pilot.name, kind: "human", flightTime: Math.max(0, Number(result.flightTime) || 0) });
        }
        const botNames = ["VANTA-7", "ECHO/3", "MICA", "RUNE-8", "SOL"];
        for (let i = 0; i < draft.bots; i++) {
          const botId = `bot-${i}`;
          if (draft.scores.some((entry) => entry.playerId === botId && entry.heat === draft.heat)) continue;
          const seed = [...`${draft.code}:${draft.heat}:${i}`].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
          draft.scores.push({ playerId: botId, name: botNames[i % botNames.length], kind: "bot", score: 650 + seed % 650, heat: draft.heat, flightTime: 32 + (seed % 13000) / 1000 });
        }
        if (draft.players.every((p) => p.finished)) draft.phase = draft.heat >= 3 ? "complete" : "results";
      } else if (action === "next") {
        if (draft.hostId !== playerId || draft.phase !== "results") throw new Error("The host can continue after every pilot finishes the heat.");
        draft.heat += 1;
        draft.phase = "race";
        draft.startsAt = Date.now() + 7000;
        draft.endsAt = draft.startsAt + 60000;
        draft.players.forEach((p) => { p.progress = 0; p.score = 0; p.finished = false; });
      } else {
        throw new Error("Unknown game action.");
      }
    });
    return json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong in the flight deck.";
    const status = /not found/i.test(message) ? 404 : /full|started|host|running|finished|no longer|valid/i.test(message) ? 409 : 400;
    return json({ error: message }, status);
  }
};
