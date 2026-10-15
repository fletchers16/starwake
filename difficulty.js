/**
 * Alien difficulty, shared by the client (combat.js, game.js) and the server (netlify/functions/game.ts) so every
 * screen and the referee agree on sim-pilot scores.
 *
 * Each alien flies its own level: a fraction of what a strong, clean run scores on that world (measured with a
 * steering autopilot, zap swings excluded). The lead alien sets the bar; the others step down. Catch-up is only ±6%,
 * so the result comes from how you fly:
 *   EASY    win by actually playing (steer for rings and gates)
 *   MEDIUM  you need to fly fairly well
 *   EXPERT  few mistakes
 *   PRO     near-perfect
 */
// hit: chance an alien lines up on each ring trail (then threads it at 93%; a fumbled trail still catches 32%) and hits each gate; stealCap: the most you can steal from one alien in a
// heat (share of its score), so zaps can't replace flying on the hard tiers. share: legacy fallback for the server.
export const DIFFICULTIES = {
  easy: { label: 'EASY', hit: 0.17, stealCap: 0.3, share: 0.32, skill: 0.6, blurb: 'Win by flying for rings and gates' },
  medium: { label: 'MEDIUM', hit: 0.37, stealCap: 0.22, share: 0.6, skill: 0.9, blurb: 'Fly fairly well to win' },
  expert: { label: 'EXPERT', hit: 0.57, stealCap: 0.14, share: 0.95, skill: 1.25, blurb: 'Few mistakes allowed' },
  pro: { label: 'PRO', hit: 0.77, stealCap: 0.08, share: 1.2, skill: 1.5, blurb: 'Near-perfect runs only' },
};
export const DIFFICULTY_ORDER = ['easy', 'medium', 'expert', 'pro'];
export const normalDifficulty = (d) => (DIFFICULTIES[d] ? d : 'easy');

// A strong clean heat on each built-in world (rings dominate, so worlds differ a lot). Forged worlds use a middle value.
export const COURSE_REF = { 'neon-rift': 11200, 'io-storm': 9700, 'titan-veil': 17700, 'helix-deep': 7500, 'jovian-shear': 14500, 'earthfall-circuit': 17300 };
export const courseRef = (courseId) => COURSE_REF[courseId] || 12000;

// Lead alien first, then the pack. The lead role rotates each heat.
const LADDER = [1.0, 0.86, 0.74, 0.66, 0.6, 0.56, 0.52];
export const botRung = (heat, i, n) => LADDER[((i + heat) % Math.max(1, n)) % LADDER.length];

/** A sim pilot's full-heat score before zaps and catch-up. */
export const botNatural = (courseId, difficulty, rung) => courseRef(courseId) * DIFFICULTIES[normalDifficulty(difficulty)].share * rung;

/** Score at progress k (0..1): its own level, nudged at most 6% toward the best human. */
export const botScoreAt = (natural, best, k = 1) => {
  const base = natural * k;
  return base + Math.max(-0.06 * base, Math.min(0.06 * base, 0.1 * (best - base)));
};

/** The most a pilot can steal from one alien in a heat, so zap spam can't buy a win. */
export const stealCapFor = (difficulty) => DIFFICULTIES[normalDifficulty(difficulty)].stealCap;

/* ---------- Aliens fly the course ----------
   Each alien passes the same rings, gates and stars as you and hits or misses each one (seeded per room, heat and
   alien, so every screen computes the same run). Ring combos, PERFECT LINE, PERFECT LAP and lap points score exactly
   like yours, so a world with more rings is worth more to everyone and no two heats total the same. */
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// Personality: the lead alien flies cleanest, the pack a little looser.
const FORM = [1.0, 0.94, 0.89, 0.85, 0.82, 0.8, 0.78];
export const BOT_SPEED = 29; // m/s, about a boosting human's 60-second distance
/**
 * @param template obstacles of one lap at race start: {type:'ring'|'gate'|'star', distance, trail, trailIndex}
 * @returns {events:[{d, pts}], speed} events sorted by route distance, for scoreAtDistance()
 */
export function flyCourse(template, lapDistance, seed, difficulty, heat, i, n, laps = 3, courseId = '') {
  const ease = WORLD_EASE[courseId] ?? 1;
  const rand = mulberry(seed >>> 0), form = FORM[((i + heat) % Math.max(1, n)) % FORM.length];
  const p = Math.min(0.985, DIFFICULTIES[normalDifficulty(difficulty)].hit * form * (0.97 + rand() * 0.06));
  const g = 0.4 + 0.55 * p; // gates and star cores are easier to line up than a whole ring trail
  const lap = template.filter((o) => ['ring', 'gate', 'star'].includes(o.type)).map((o) => ({ ...o, d: ((o.distance % lapDistance) + lapDistance) % lapDistance })).sort((a, b) => a.d - b.d);
  const events = []; let combo = 0;
  for (let L = 0; L < laps; L++) {
    const trail = {}, commit = {}; let gatesHit = 0;
    for (const o of lap) {
      const d = o.d + L * lapDistance;
      if (o.type === 'ring') {
        // Like a human, an alien either lines up on a whole trail (and threads it, chaining combos) or fumbles it.
        if (!(o.trail in commit)) commit[o.trail] = rand() < p * ease;
        if (rand() < (commit[o.trail] ? 0.93 : 0.32)) { combo = Math.min(5, combo + 1); let pts = 100 * combo; trail[o.trail] = (trail[o.trail] || 0) + 1; if (o.trailIndex === 4 && trail[o.trail] === 5) pts += 300; events.push({ d, pts }); }
        else combo = 0;
      } else if (o.type === 'gate') {
        if (rand() < g) { gatesHit++; events.push({ d, pts: 100 + (gatesHit === 5 ? 500 : 0) }); } else events.push({ d, pts: -25 });
      } else if (rand() < g * 0.8) events.push({ d, pts: 250 }); // star core
    }
    events.push({ d: (L + 1) * lapDistance, pts: 300 }); // lap
  }
  return { events, speed: BOT_SPEED * (0.985 + form * 0.03) };
}
// How hard each world's ring lines are for a human (measured), so aliens find the same worlds hard.
const WORLD_EASE = { 'neon-rift': 1, 'io-storm': 0.92, 'titan-veil': 1.05, 'helix-deep': 0.86, 'jovian-shear': 0.88, 'earthfall-circuit': 1.05 };
/** An alien's points after flying `dist` metres (plus 1 point a second, like yours). */
export const scoreAtDistance = (run, dist, seconds = 0) => run.events.reduce((a, e) => (e.d <= dist ? a + e.pts : a), 0) + Math.floor(seconds);
