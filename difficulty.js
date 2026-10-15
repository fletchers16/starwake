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
export const DIFFICULTIES = {
  easy: { label: 'EASY', share: 0.32, skill: 0.6, blurb: 'Win by flying for rings and gates' },
  medium: { label: 'MEDIUM', share: 0.6, skill: 0.9, blurb: 'Fly fairly well to win' },
  expert: { label: 'EXPERT', share: 0.95, skill: 1.25, blurb: 'Few mistakes allowed' },
  pro: { label: 'PRO', share: 1.2, skill: 1.5, blurb: 'Near-perfect runs only' },
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
export const BOT_STEAL_CAP = 0.25;
