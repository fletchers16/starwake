/**
 * Authored, engine-agnostic Starwake course data.
 *
 * Geometry, hazards, and forces use lap-relative coordinates so the renderer
 * can repeat a course without a hard stop at the finish beacon. `progress`
 * values are normalized to [0, 1] over one lap.
 */
export const COURSE_CATALOG = [
  {
    id: 'neon-rift',
    name: 'NEON RIFT',
    world: 'ABANDONED ORBITAL RELAY',
    planet: 'KEPLER-62F',
    summary: 'A broken transit spine curves through a blue debris field.',
    accent: '#71f5dc', secondary: '#627dff', hazard: '#f26689',
    sky: '#07101d', fog: '#07101d', surface: '#123345', kind: 'relay',
    tags: ['station', 'neon', 'debris', 'rings'],
    track: { lapLength: 920, lateralAmplitude: 9.8, verticalAmplitude: 5.8, bank: 0.62, path: [[0,0,0],[.1,.18,.15],[.22,1,.65],[.34,.74,-.5],[.47,-.5,-.92],[.6,-1,.18],[.73,-.25,.95],[.85,.74,.56],[.95,.4,-.28],[1,0,0]] },
    forces: { gravity: 0, lateralDrift: 0, description: 'Low-drift baseline for learning the line.' },
    hazards: [
      { id: 'relay-rocks-a', type: 'asteroid-field', at: 0.19, lane: -1, elevation: 0.8, spread: 2.8, density: 8 },
      { id: 'relay-pylon', type: 'blocker-gate', at: 0.53, lane: 1.3, elevation: -0.6, opening: 2.5 },
      { id: 'relay-rocks-b', type: 'asteroid-field', at: 0.79, lane: 0.3, elevation: 1.1, spread: 3.2, density: 10 },
    ],
  },
  {
    id: 'io-storm',
    name: 'IO STORM',
    world: 'VOLCANIC CLOUD SEA',
    planet: 'IO',
    summary: 'Thread a rising switchback between lava vents and charged storm cells.',
    accent: '#ffb15f', secondary: '#f45b80', hazard: '#ff5e43',
    sky: '#170b19', fog: '#25101d', surface: '#40212b', kind: 'volcanic',
    tags: ['volcanic', 'lava', 'lightning', 'ash'],
    track: { lapLength: 940, lateralAmplitude: 9.2, verticalAmplitude: 7.2, bank: 0.76, path: [[0,0,0],[.08,.35,-.22],[.2,1,.35],[.31,.1,1],[.42,-1,.52],[.54,-.66,-.92],[.67,.86,-.72],[.79,1,.48],[.9,-.46,.94],[1,0,0]] },
    forces: { gravity: -0.12, lateralDrift: 0, description: 'Light downward pull through the dense lower cloud deck.' },
    hazards: [
      { id: 'io-vent-a', type: 'plasma-vent', at: 0.22, lane: 1.5, elevation: -1.1, opening: 2.2 },
      { id: 'io-ash-rocks', type: 'asteroid-field', at: 0.49, lane: -0.6, elevation: 1.2, spread: 2.7, density: 9 },
      { id: 'io-vent-b', type: 'plasma-vent', at: 0.75, lane: -1.7, elevation: 0.5, opening: 2.4 },
    ],
  },
  {
    id: 'titan-veil',
    name: 'TITAN VEIL',
    world: 'METHANE ICE CANALS',
    planet: 'TITAN',
    summary: 'Amber haze and ice spires frame a long, flowing canal run.',
    accent: '#ffc978', secondary: '#8ad8ff', hazard: '#cf9b72',
    sky: '#17121c', fog: '#352522', surface: '#40323a', kind: 'ice',
    tags: ['ice', 'haze', 'crystal', 'rocks'],
    track: { lapLength: 940, lateralAmplitude: 10.5, verticalAmplitude: 4.8, bank: 0.48, path: [[0,0,0],[.1,-.4,0],[.27,-1,.48],[.41,.18,.7],[.55,1,.12],[.72,.8,-.7],[.87,-.46,-.64],[.95,-.16,.2],[1,0,0]] },
    forces: { gravity: -0.04, lateralDrift: 0.08, description: 'Gentle crosswind over the ice channels.' },
    hazards: [
      { id: 'titan-spires-a', type: 'ice-blockers', at: 0.17, lane: -1.4, elevation: 0.2, opening: 2.1 },
      { id: 'titan-shards', type: 'asteroid-field', at: 0.46, lane: 1, elevation: -0.9, spread: 2.5, density: 8 },
      { id: 'titan-spires-b', type: 'ice-blockers', at: 0.72, lane: 1.7, elevation: 1, opening: 2.4 },
    ],
  },
  {
    id: 'helix-deep',
    name: 'HELIX DEEP',
    world: 'NEBULA GRAVITY WELL',
    planet: 'HELIX-9',
    summary: 'A violet dust cloud folds around an orbital route through drifting stone.',
    accent: '#d49bff', secondary: '#68d4ff', hazard: '#fb779a',
    sky: '#110b22', fog: '#211334', surface: '#261c43', kind: 'nebula',
    tags: ['nebula', 'asteroid', 'gravity', 'stars'],
    track: { lapLength: 960, lateralAmplitude: 8.8, verticalAmplitude: 7.6, bank: 0.9, path: [[0,0,0],[.1,.35,.8],[.2,.95,1],[.3,.56,.12],[.42,-.35,-.84],[.53,-1,-.55],[.66,-.5,.62],[.78,.18,.98],[.9,.9,.3],[1,0,0]] },
    forces: { gravity: -0.08, lateralDrift: 0.1, description: 'A slow inward shear around the route.' },
    hazards: [
      { id: 'helix-rocks-a', type: 'asteroid-field', at: 0.2, lane: -1.4, elevation: 1.1, spread: 3.3, density: 10 },
      { id: 'helix-anchor', type: 'gravity-anchor', at: 0.51, lane: 0.2, elevation: 0, radius: 2.8 },
      { id: 'helix-rocks-b', type: 'asteroid-field', at: 0.81, lane: 1.4, elevation: -0.8, spread: 3.5, density: 11 },
    ],
  },
  {
    id: 'earthfall-circuit',
    name: 'EARTHFALL CIRCUIT',
    world: 'LOW ORBIT · BLUE DESCENT',
    planet: 'EARTH',
    summary: 'Ride a long orbital ribbon with a steady pull toward the blue horizon.',
    accent: '#63d7ff', secondary: '#77a6ff', hazard: '#ffd36d',
    sky: '#061525', fog: '#102943', surface: '#123d59', kind: 'earth',
    tags: ['earth', 'gravity', 'orbital', 'clouds', 'debris'],
    track: { lapLength: 980, lateralAmplitude: 9.7, verticalAmplitude: 7.4, bank: 0.7, path: [[0,0,0],[.13,.8,-.72],[.27,1,.76],[.41,.08,1],[.55,-.92,.48],[.69,-.72,-.82],[.83,.43,-1],[.95,.72,.48],[1,0,0]] },
    forces: { gravity: -0.34, lateralDrift: 0, description: 'Continuous downward pull; counter-steer with lift to hold altitude.' },
    landmarks: [{ id: 'blue-horizon', type: 'planet-horizon', at: 0.12, scale: 1.2 }],
    hazards: [
      { id: 'earth-debris-a', type: 'asteroid-field', at: 0.18, lane: -1.5, elevation: 1.2, spread: 3.1, density: 9 },
      { id: 'earth-cloud-wall', type: 'cloud-blocker', at: 0.43, lane: 1.4, elevation: -0.4, opening: 2.7 },
      { id: 'earth-satellites', type: 'orbital-blockers', at: 0.69, lane: -0.5, elevation: 0.9, opening: 2.4 },
      { id: 'earth-rocks-b', type: 'asteroid-field', at: 0.87, lane: 1.3, elevation: -1, spread: 2.8, density: 8 },
    ],
  },
  {
    id: 'jovian-shear',
    name: 'JOVIAN SHEAR',
    world: 'RING PLANE · MAGNETIC FRONTIER',
    planet: 'JUPITER',
    summary: 'Sweep above and below a broad ring plane, then dive between its broken arcs.',
    accent: '#ffc184', secondary: '#ef8e70', hazard: '#e7e0bb',
    sky: '#1a1110', fog: '#30201a', surface: '#413024', kind: 'jupiter',
    tags: ['jupiter', 'rings', 'magnetic', 'asteroids', 'shear'],
    track: { lapLength: 1000, lateralAmplitude: 10.2, verticalAmplitude: 7, bank: 1.02, path: [[0,0,0],[.11,-.72,.32],[.25,-.92,1],[.39,.26,1],[.52,1,.42],[.65,.4,-.72],[.78,-.82,-1],[.91,-.36,.35],[1,0,0]] },
    forces: { gravity: -0.18, lateralDrift: 0.16, description: 'Moderate gravity with alternating sideways magnetic shear.' },
    landmarks: [{ id: 'jovian-bands', type: 'gas-giant', at: 0.1, scale: 1.5 }, { id: 'jovian-rings', type: 'broken-ring-plane', at: 0.56, scale: 1.35 }],
    hazards: [
      { id: 'jovian-rocks-a', type: 'asteroid-field', at: 0.21, lane: 1.4, elevation: -1, spread: 3, density: 9 },
      { id: 'jovian-ring-cut', type: 'ring-plane', at: 0.48, lane: 0, elevation: 0, opening: 2.6, width: 6.5, rewardLine: 0.35 },
      { id: 'jovian-ring-cut-b', type: 'ring-plane', at: 0.7, lane: -1.2, elevation: 0.8, opening: 2.8, width: 5.8, rewardLine: 0.35 },
      { id: 'jovian-rocks-b', type: 'asteroid-field', at: 0.88, lane: -1.5, elevation: -0.7, spread: 3.2, density: 10 },
    ],
  },
];

const COURSE_BY_ID = new Map(COURSE_CATALOG.map((course) => [course.id, course]));

export function getCourseDefinition(id) {
  return COURSE_BY_ID.get(id) || COURSE_CATALOG[0];
}

/** Sample gentle course forces; output is acceleration per second squared. */
export function sampleCourseForces(courseOrId, progress, timeSeconds = 0) {
  const course = typeof courseOrId === 'string' ? getCourseDefinition(courseOrId) : courseOrId;
  const base = course?.forces || {};
  const p = ((Number(progress) || 0) % 1 + 1) % 1;
  const wave = Math.sin(p * Math.PI * 4 + (Number(timeSeconds) || 0) * 0.55);
  return {
    vertical: Number(base.gravity) || 0,
    lateral: (Number(base.lateralDrift) || 0) * wave,
  };
}

/** Return course hazards in lap-distance units for deterministic route builders. */
export function hazardsForLap(courseOrId, lapLength) {
  const course = typeof courseOrId === 'string' ? getCourseDefinition(courseOrId) : courseOrId;
  const length = Math.max(1, Number(lapLength) || course?.track?.lapLength || 1);
  return (course?.hazards || []).map((hazard) => ({
    ...hazard,
    distance: Math.round(Math.max(0, Math.min(1, hazard.at)) * length),
  }));
}

/**
 * Add or replace a runtime course (e.g. from World Forge). The catalog array
 * is shared by reference with the game, so registered courses race like
 * authored ones.
 */
export function registerCourse(course) {
  if (!course?.id) return null;
  const index = COURSE_CATALOG.findIndex((item) => item.id === course.id);
  if (index >= 0) COURSE_CATALOG[index] = course;
  else COURSE_CATALOG.push(course);
  COURSE_BY_ID.set(course.id, course);
  return course;
}
