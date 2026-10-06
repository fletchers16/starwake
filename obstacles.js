import { addRim } from './rim.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roughen, gradient } from './shapes.js';
import { toon } from './aliens.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
/**
 * Hazard meshes with one consistent visual language: anything that hurts is
 * drawn in the course's hazard colour with a glowing core, and nothing is
 * randomly warped. Each mesh may expose `userData.animate(now)`; meshes
 * without it are spun by the race loop.
 *
 * Visual sizes match the colliders in game.js:
 *   mine / rock: radius (item.radius) · fence: ~1.3 circle · ring-plane: width × 0.72 band
 */

// One danger colour on every world, so "red hurts" is always true and hazards never blend with scenery...
export const DANGER = '#ff4d5e';
// ...except where the world itself is red: on Io's lava, red hazards vanish, so they turn hot magenta.
const HAZARD_BY_KIND = { volcanic: '#ff3fd2' };
export const hazardColor = (course) => HAZARD_BY_KIND[course?.kind] || DANGER;
let HZ = DANGER;

const glowMat = (THREE, color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

/** Mine: a cartoon sea-mine. Inked black ball, stubby spikes with glowing tips, a blinking bulb and a danger halo. */
let mineParts = null;
function minePieces(THREE) {
  if (mineParts) return mineParts;
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[.7,.7,0],[-.7,.7,0],[.7,-.7,0],[-.7,-.7,0],[0,.7,.7],[0,-.7,-.7]];
  const place = (g, dir, dist) => g.applyMatrix4(new THREE.Matrix4().compose(dir.clone().multiplyScalar(dist), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), new THREE.Vector3(1, 1, 1)));
  const spikes = [], tips = [];
  for (const d of dirs) {
    const dir = new THREE.Vector3(...d).normalize();
    spikes.push(place(new THREE.CylinderGeometry(0.07, 0.13, 0.32, 8).toNonIndexed(), dir, 0.55));
    tips.push(place(new THREE.SphereGeometry(0.1, 8, 6).toNonIndexed(), dir, 0.74));
  }
  const ball = new THREE.SphereGeometry(0.5, 20, 14).toNonIndexed();
  const strip = (g) => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };
  const body = mergeGeometries([ball, ...spikes].map(strip));
  const ink = mergeGeometries([new THREE.SphereGeometry(0.56, 16, 12).toNonIndexed(), ...dirs.map((d) => place(new THREE.CylinderGeometry(0.11, 0.17, 0.36, 8).toNonIndexed(), new THREE.Vector3(...d).normalize(), 0.55))].map(strip));
  mineParts = { body, ink, tips: mergeGeometries(tips.map(strip)) };
  return mineParts;
}
export function makeMine(THREE, item, course) {
  const group = new THREE.Group();
  const r = Math.max(0.6, Number(item.radius) || 0.72), parts = minePieces(THREE);
  const cage = new THREE.Group();
  cage.add(new THREE.Mesh(parts.body, toon(THREE, '#3a2c44')));
  cage.add(new THREE.Mesh(parts.ink, new THREE.MeshBasicMaterial({ color: '#140f24', side: THREE.BackSide })));
  const tips = new THREE.Mesh(parts.tips, glowMat(THREE, HZ));
  cage.add(tips);
  cage.scale.setScalar(r * 1.05);
  group.add(cage);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(r * 0.95, 16, 12), new THREE.MeshBasicMaterial({ color: HZ, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(halo);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.15, 0.05, 6, 48), glowMat(THREE, HZ, 0.75));
  group.add(ring);
  const seed = (item.distance || 0) * 0.37;
  group.userData.animate = (now) => {
    cage.rotation.set(now * 0.0006 + seed, now * 0.0009 + seed, 0);
    ring.rotation.z = -now * 0.0012 + seed;
    const blink = Math.sin(now * 0.012 + seed) > 0.2;
    tips.material.color.set(blink ? HZ : '#5a1020');
    halo.scale.setScalar(blink ? 1.08 : 0.94);
  };
  return group;
}

/** Laser fence: two emitter posts with glowing beams between them. Replaces box-and-cone blockers. */
export function makeFence(THREE, item, course) {
  const group = new THREE.Group();
  const width = 3.1, height = 1.5;
  const postMat = new THREE.MeshStandardMaterial({ color: '#141c28', emissive: HZ, emissiveIntensity: 0.25, metalness: 0.85, roughness: 0.28 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, height + 0.5, 0.26), postMat);
    post.position.x = side * width / 2;
    group.add(post);
    for (const y of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), glowMat(THREE, HZ));
      cap.position.set(side * width / 2, y * (height / 2 + 0.25), 0);
      group.add(cap);
    }
  }
  const beams = [];
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, 0.05), glowMat(THREE, HZ));
    beam.position.y = -height / 2 + (i / 3) * height;
    group.add(beam);
    beams.push(beam);
  }
  const field = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: HZ, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  group.add(field);
  const seed = (item.distance || 0) * 0.21;
  group.userData.animate = (now) => {
    beams.forEach((beam, i) => { beam.scale.y = beam.scale.z = 0.8 + 0.5 * Math.max(0, Math.sin(now * 0.012 + i * 1.3 + seed)); });
    field.material.opacity = 0.08 + 0.06 * Math.sin(now * 0.006 + seed);
  };
  return group;
}

/** Soft radial glow, shared by every hazard's danger halo. */
let haloTexture = null;
function halo(THREE) {
  if (haloTexture) return haloTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  haloTexture = new THREE.CanvasTexture(c);
  return haloTexture;
}

// A small pool of roughened rock shapes per family, so every rock looks different without building a new geometry per rock.
const rockPool = new Map();

function rockShape(THREE, family, seed, look) {
  const key = `${family}:${seed % 5}`;
  if (!rockPool.has(key)) {
    const base = family === 'box' ? new THREE.BoxGeometry(1.3, 1.3, 1.3, 2, 2, 2) : family === 'octa' ? new THREE.OctahedronGeometry(1, 1) : family === 'icosa' ? new THREE.IcosahedronGeometry(1, 1) : new THREE.DodecahedronGeometry(1, 1);
    const shade = new THREE.Color(look?.color || '#5a5060');
    rockPool.set(key, gradient(roughen(base, 0.32, 101 + (seed % 5) * 7), shade.clone().multiplyScalar(0.45), shade.clone().lerp(new THREE.Color('#ffffff'), 0.25), 1));
  }
  return rockPool.get(key);
}

/** Grumpy face for a rock: eye whites, plus pupils and angry brows merged (2 draw calls, shared). */
let faceParts = null;
function face(THREE) {
  if (!faceParts) {
    const strip = (g) => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };
    const whites = [], dark = [];
    for (const side of [-1, 1]) {
      whites.push(new THREE.SphereGeometry(0.2, 14, 10).scale(1, 1.15, 0.6).translate(side * 0.24, 0, 0));
      dark.push(new THREE.SphereGeometry(0.24, 14, 10).scale(1, 1.15, 0.55).translate(side * 0.24, 0, -0.03)); // eye rim (drawn behind)
      dark.push(new THREE.SphereGeometry(0.085, 10, 8).translate(side * 0.21, -0.03, 0.11));
      dark.push(new THREE.BoxGeometry(0.34, 0.09, 0.08).rotateZ(side * -0.45).translate(side * 0.25, 0.27, 0.06));
    }
    faceParts = { whites: mergeGeometries(whites.map(strip)), dark: mergeGeometries(dark.map(strip)), whiteMat: new THREE.MeshBasicMaterial({ color: '#ffffff' }), darkMat: new THREE.MeshBasicMaterial({ color: '#140f24' }) };
  }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(faceParts.whites, faceParts.whiteMat), new THREE.Mesh(faceParts.dark, faceParts.darkMat));
  return g;
}

/** Smooth-normal copy of a rock shape, so cel shading falls in clean bands instead of facets. */
const smoothPool = new Map();
function smooth(THREE, g) {
  if (smoothPool.has(g)) return smoothPool.get(g);
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', g.getAttribute('position').clone());
  if (g.getAttribute('color')) base.setAttribute('color', g.getAttribute('color').clone());
  const m = mergeVertices(base, 0.02);
  m.computeVertexNormals();
  smoothPool.set(g, m);
  return m;
}

/** Asteroid-field rock: a cel-shaded lump with a black ink line, a pulsing danger rim, and (on many) a grumpy face. */
export function makeRock(THREE, item, course, look) {
  const group = new THREE.Group();
  const r = Number(item.radius) || 0.85;
  const seed = Math.abs(Math.floor((item.distance || 0) * 7.3 + (item.x || 0) * 31 + (item.y || 0) * 17));
  const geometry = smooth(THREE, rockShape(THREE, look?.geometry, seed, look));
  const base = new THREE.Color(look?.color || '#8a7a92').lerp(new THREE.Color('#ffe9d6'), 0.42);
  const material = toon(THREE, base, { vertexColors: true, transparent: !!look?.opacity, opacity: look?.opacity || 1 });
  const spinner = new THREE.Group();
  const body = new THREE.Mesh(geometry, material);
  const stretch = look?.stretch || [1, 0.9, 1];
  const jitter = 0.85 + ((seed % 100) / 100) * 0.35;
  body.scale.set(stretch[0] * r * jitter, stretch[1] * r * (0.9 + ((seed >> 3) % 20) / 100), stretch[2] * r * jitter);
  spinner.add(body);
  const ink = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#140f24', side: THREE.BackSide }));
  ink.scale.copy(body.scale).multiplyScalar(1.07);
  spinner.add(ink);
  // Danger rim just outside the ink, so "red hurts" still reads on every world.
  const outline = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: HZ, side: THREE.BackSide, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
  outline.scale.copy(body.scale).multiplyScalar(1.14);
  spinner.add(outline);
  group.add(spinner);
  // Two in three rocks glare at you as you fly in (the face stays upright; only the rock tumbles).
  let mug = null;
  if (seed % 3 !== 1) {
    mug = face(THREE);
    mug.position.set(0, r * 0.08, Math.min(body.scale.x, body.scale.z) * 0.9);
    mug.scale.setScalar(r * 1.05);
    group.add(mug);
  }
  const phase = (seed % 628) / 100, spin = 0.0003 + (seed % 7) * 0.0001;
  spinner.rotation.set(phase, phase * 1.7, 0);
  group.userData.animate = (now) => {
    // Faced rocks only wobble (so the face stays on its rock); the rest tumble.
    if (mug) { spinner.rotation.set(Math.sin(now * 0.0012 + phase) * 0.18, Math.sin(now * 0.0009 + phase) * 0.25, 0); mug.rotation.z = Math.sin(now * 0.0012 + phase) * 0.15; }
    else { spinner.rotation.y = phase * 1.7 + now * spin * 1.6; spinner.rotation.x = phase + now * spin; }
    outline.material.opacity = 0.55 + 0.4 * Math.max(0, Math.sin(now * 0.006 + phase));
  };
  return group;
}

/** Broken ring plane: hazard-coloured arcs with clean gaps; fly through the middle. */
export function makeBrokenRing(THREE, item, course) {
  const group = new THREE.Group();
  const radius = Number(item.width) > 0 ? Math.max(4.1, Number(item.width) * 0.72) : 4.8;
  const metal = new THREE.MeshStandardMaterial({ color: '#1c1a22', emissive: HZ, emissiveIntensity: 0.35, metalness: 0.8, roughness: 0.3 });
  for (let i = 0; i < 5; i++) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.42, 10, 32, (Math.PI * 2) / 5 - 0.32), metal);
    arc.rotation.z = (i / 5) * Math.PI * 2;
    group.add(arc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.5, 0.04, 6, 32, (Math.PI * 2) / 5 - 0.32), glowMat(THREE, HZ));
    rim.rotation.z = arc.rotation.z;
    group.add(rim);
  }
  const safe = new THREE.Mesh(new THREE.TorusGeometry(radius - 1.6, 0.03, 6, 72), glowMat(THREE, course.accent, 0.5));
  group.add(safe);
  group.userData.animate = (now) => { group.rotation.z = now * 0.00025 + (item.distance || 0); };
  return group;
}

/** Dispatch for every damaging obstacle type. */
export function makeHazardObstacle(THREE, item, course, look) {
  HZ = hazardColor(course);
  if (item.type === 'boost') return makeBoostGate(THREE, item, course);
  if (item.type === 'pillar') return makePillar(THREE, item, course);
  if (item.type === 'blocker') return makeFence(THREE, item, course);
  if (item.type === 'ring-plane') return makeBrokenRing(THREE, item, course);
  if (item.mine) return makeMine(THREE, item, course);
  return makeRock(THREE, item, course, look);
}

/** Boost gate: a chunky yellow hoop with scrolling chevrons. Fly through it for a burst of speed. */
let chevronTexture = null;
function chevrons(THREE) {
  if (chevronTexture) return chevronTexture;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#ffffff';
  for (const y of [40, 104]) { g.beginPath(); g.moveTo(10, y); g.lineTo(32, y - 24); g.lineTo(54, y); g.stroke(); }
  chevronTexture = new THREE.CanvasTexture(c);
  chevronTexture.wrapT = THREE.RepeatWrapping;
  chevronTexture.repeat.set(1, 1.5);
  chevronTexture.userData.shared = true;
  return chevronTexture;
}
export function makeBoostGate(THREE, item, course) {
  const group = new THREE.Group();
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.2, 12, 40), toon(THREE, '#ffd23f'));
  group.add(hoop);
  const ink = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.27, 10, 40), new THREE.MeshBasicMaterial({ color: '#140f24', side: THREE.BackSide }));
  group.add(ink);
  const studs = new THREE.Mesh(mergeGeometries(Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return new THREE.SphereGeometry(0.11, 8, 6).translate(Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0.18); })), new THREE.MeshBasicMaterial({ color: '#ff7a1a' }));
  group.add(studs);
  const map = chevrons(THREE).clone();
  map.needsUpdate = true;
  const arrows = new THREE.Mesh(new THREE.CircleGeometry(1.36, 32), new THREE.MeshBasicMaterial({ map, color: '#ffe14d', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  group.add(arrows);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshBasicMaterial({ color: '#ff9a1a', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  glow.position.z = -0.02;
  group.add(glow);
  group.userData.animate = (now) => {
    map.offset.y = -(now * 0.0025) % 1;
    hoop.scale.setScalar(1 + Math.sin(now * 0.01) * 0.03);
    studs.rotation.z = now * 0.002;
  };
  return group;
}

/** Fork divider pillar: a tall cel-shaded stone column with hazard bands. The first one carries the lane sign. */
let pillarGeometry = null, pillarBands = null;
function laneSign(THREE) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1430'; g.beginPath(); g.roundRect(4, 4, 504, 152, 28); g.fill();
  g.fillStyle = '#fff4dc'; g.beginPath(); g.roundRect(14, 14, 484, 132, 20); g.fill();
  g.font = '900 54px system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.fillStyle = '#ff7a1a'; g.fillText('◀ BOOST', 130, 82);
  g.fillStyle = '#1b1430'; g.fillRect(254, 30, 6, 100);
  g.fillStyle = '#6a3cff'; g.fillText('RINGS ▶', 384, 82);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function makePillar(THREE, item, course) {
  const group = new THREE.Group();
  if (!pillarGeometry) {
    const base = new THREE.BufferGeometry();
    base.setAttribute('position', roughen(new THREE.CylinderGeometry(1.05, 1.3, 9, 10, 8), 0.12, 7).getAttribute('position').clone());
    pillarGeometry = mergeVertices(base, 0.02);
    pillarGeometry.computeVertexNormals();
  }
  const look = new THREE.Color(course?.secondary || '#8a7a92').lerp(new THREE.Color('#d9c8b4'), 0.55);
  const body = new THREE.Mesh(pillarGeometry, toon(THREE, look));
  group.add(body);
  const ink = new THREE.Mesh(pillarGeometry, new THREE.MeshBasicMaterial({ color: '#140f24', side: THREE.BackSide }));
  ink.scale.set(1.09, 1.01, 1.09);
  group.add(ink);
  pillarBands ||= mergeGeometries([-2.6, 0, 2.6].map((y) => new THREE.CylinderGeometry(1.24, 1.24, 0.34, 14, 1, true).translate(0, y, 0)));
  const bands = new THREE.Mesh(pillarBands, glowMat(THREE, HZ, 0.9));
  bands.material.side = THREE.DoubleSide;
  group.add(bands);
  if (item.sign) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.38), new THREE.MeshBasicMaterial({ map: laneSign(THREE), transparent: true }));
    sign.position.set(0, 4.2, 1.4);
    group.add(sign);
  }
  group.userData.animate = () => {};
  return group;
}
