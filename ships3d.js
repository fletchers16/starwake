import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon } from './aliens.js';

/**
 * Cartoon ship models: four chunky, toy-like silhouettes (a pocket rocket, a tugboat, a candy-striped
 * dart and a puffy manta) built from rounded parts with bold ink outlines and cel shading.
 *
 * Every part is merged by material, so a ship costs one draw call per colour plus one for all the ink;
 * engine flames stay separate so the race loop can stretch them on boost.
 * Model space: forward is -z, up is +y, about 3.5 units nose to tail (the race scales it by ~0.58).
 *
 * buildCartoonShip(THREE, def) → Group with userData { cartoon, seat, flames, mats }.
 */

export const INK = '#140f24';

function plain(THREE, g) {
  const out = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(out.attributes)) if (k !== 'position' && k !== 'normal') out.deleteAttribute(k);
  if (!out.attributes.normal) out.computeVertexNormals();
  return out;
}

/** A copy of a placed part pushed out along smooth normals: the back-face shell becomes its ink line. */
function inflate(THREE, g, t) {
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', g.getAttribute('position').clone());
  const m = mergeVertices(base, 1e-3);
  m.computeVertexNormals();
  const p = m.attributes.position, n = m.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * t, p.getY(i) + n.getY(i) * t, p.getZ(i) + n.getZ(i) * t);
  return m.toNonIndexed();
}

/** Collects placed parts per material, then merges them (plus one ink shell) into a group. */
export function partKit(THREE, inkWidth = 0.06) {
  const lists = new Map(), ink = [];
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
  function add(geo, mat, { p = [0, 0, 0], r = [0, 0, 0], s: sc = 1 } = {}, line = inkWidth) {
    const m = new THREE.Matrix4().compose(v.set(...p), q.setFromEuler(e.set(...r)), typeof sc === 'number' ? s.set(sc, sc, sc) : s.set(...sc));
    const g = plain(THREE, geo).applyMatrix4(m);
    if (!lists.has(mat)) lists.set(mat, []);
    lists.get(mat).push(g);
    if (line) ink.push(inflate(THREE, g, line));
    geo.dispose();
  }
  function build(group, inkColor = INK) {
    for (const [mat, geos] of lists) group.add(new THREE.Mesh(mergeGeometries(geos), mat));
    if (ink.length) {
      const line = new THREE.Mesh(mergeGeometries(ink), new THREE.MeshBasicMaterial({ color: inkColor, side: THREE.BackSide }));
      line.userData.ink = true;
      group.add(line);
    }
    return group;
  }
  return { add, build };
}

/** Lathe around the ship's long axis. `profile` is [radius, forward] pairs from tail to nose. */
export function lathe(THREE, profile, segments = 22) {
  const g = new THREE.LatheGeometry(profile.map(([r, f]) => new THREE.Vector2(Math.max(0, r), f)), segments);
  g.rotateX(-Math.PI / 2); // lathe +y (forward) → -z
  return g;
}

/** Body radius at a forward position (linear between profile points), for painting bands on it. */
const radiusAt = (profile, f) => {
  for (let i = 1; i < profile.length; i++) {
    const [r0, f0] = profile[i - 1], [r1, f1] = profile[i];
    if (f >= f0 && f <= f1) return r0 + (r1 - r0) * ((f - f0) / Math.max(1e-6, f1 - f0));
  }
  return 0;
};
const band = (THREE, profile, f, width = 0.12, lift = 0.018) => lathe(THREE, [-1, -0.5, 0, 0.5, 1].map((k) => [radiusAt(profile, f + k * width) + lift * (1 - Math.abs(k) * 0.4), f + k * width]), 22);

/** A smooth, mirrored outline (x = span, y = forward) from the right half, front centre → tip → back centre. */
function mirroredShape(THREE, half) {
  const right = half.map(([x, y]) => new THREE.Vector2(x, y));
  const left = half.slice(1, -1).reverse().map(([x, y]) => new THREE.Vector2(-x, y));
  const shape = new THREE.Shape();
  shape.moveTo(right[0].x, right[0].y);
  shape.splineThru([...right.slice(1), ...left, right[0].clone()]);
  return shape;
}

/** A flat wing slab: the mirrored outline, extruded and laid flat with chunky rounded edges. */
function wing(THREE, half, depth = 0.14, bevel = 0.08) {
  const g = new THREE.ExtrudeGeometry(mirroredShape(THREE, half), { depth, bevelEnabled: true, bevelThickness: bevel * 0.8, bevelSize: bevel, bevelSegments: 3, steps: 1, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  g.rotateX(-Math.PI / 2); // shape y (forward) → -z, extrusion → +y
  return g;
}

/** A vertical fin from an outline of [back-to-front, up] points (x = forward). */
function fin(THREE, pts, depth = 0.1) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  shape.splineThru([...pts.slice(1).map(([x, y]) => new THREE.Vector2(x, y)), new THREE.Vector2(pts[0][0], pts[0][1])]);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  g.rotateY(Math.PI / 2); // shape x (forward) → -z
  return g;
}

function palette(THREE, def, scheme) {
  const main = new THREE.Color(def.color || '#71f5dc');
  main.offsetHSL(0, 0.12, -0.04);
  return {
    main: toon(THREE, main),
    accent: toon(THREE, scheme.accent),
    light: toon(THREE, scheme.light),
    dark: toon(THREE, scheme.dark),
    glow: new THREE.MeshBasicMaterial({ color: scheme.glow }),
    flame: new THREE.MeshBasicMaterial({ color: scheme.flame || def.color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }),
    core: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
  };
}

const SCHEMES = {
  kite: { accent: '#ff8a3d', light: '#fff4dc', dark: '#2a2244', glow: '#fff3a8', flame: '#5cf2ff' },
  bastion: { accent: '#ffd84d', light: '#fff1d6', dark: '#3b2a3a', glow: '#fff6b0', flame: '#ffb347' },
  needle: { accent: '#ff4f6d', light: '#ffffff', dark: '#241d3d', glow: '#ffe1ea', flame: '#8fb0ff' },
  manta: { accent: '#ff7bd5', light: '#ffe3fa', dark: '#2c1d40', glow: '#ffe14d', flame: '#e59bff' },
};

/**
 * Engine: a chunky nozzle with a coloured lip and a glowing mouth, plus a flame whose base sits on
 * the nozzle so stretching it on boost only pushes it backwards.
 */
function engine(THREE, K, P, group, flames, [x, y, z], r) {
  K.add(new THREE.CylinderGeometry(r * 0.82, r, r * 1.2, 18), P.dark, { p: [x, y, z], r: [Math.PI / 2, 0, 0] });
  K.add(new THREE.TorusGeometry(r * 0.98, r * 0.2, 10, 22), P.accent, { p: [x, y, z + r * 0.6] }, 0.03);
  K.add(new THREE.CircleGeometry(r * 0.8, 18), P.glow, { p: [x, y, z + r * 0.62] }, 0);
  const h = r * 3.4, flame = new THREE.Mesh(new THREE.ConeGeometry(r * 0.72, h, 14).translate(0, h / 2, 0), P.flame);
  flame.rotation.x = Math.PI / 2; // tip points backwards (+z)
  flame.position.set(x, y, z + r * 0.62);
  const core = new THREE.Mesh(new THREE.ConeGeometry(r * 0.38, h * 0.6, 10).translate(0, h * 0.3, 0), P.core);
  flame.add(core);
  flame.userData.flame = true;
  group.add(flame);
  flames.push(flame);
}

/** A collar under the fishbowl canopy so the pilot sits in the ship rather than on it. */
const collar = (THREE, K, P, [x, y, z]) => K.add(new THREE.TorusGeometry(0.44, 0.09, 10, 26), P.dark, { p: [x, y - 0.3, z], r: [Math.PI / 2, 0, 0] }, 0.03);

const DESIGNS = {
  // KITE: a pocket rocket. Teardrop body, orange nose and wingtip pods, one fat engine, shark fin.
  kite(THREE, K, P, group, flames) {
    const body = [[0, -1.5], [0.4, -1.46], [0.62, -1.15], [0.74, -0.55], [0.75, 0.05], [0.66, 0.65], [0.5, 1.12], [0.3, 1.5], [0.12, 1.75], [0, 1.82]];
    K.add(lathe(THREE, body), P.main);
    K.add(lathe(THREE, [[0.36, 1.36], [0.27, 1.56], [0.13, 1.76], [0, 1.85]]), P.accent, {}, 0);
    K.add(band(THREE, body, -0.05, 0.14), P.light, {}, 0);
    K.add(wing(THREE, [[0, 0.35], [1.1, 0.05], [1.95, -0.3], [2.2, -0.6], [2.0, -0.88], [1.0, -0.8], [0, -0.75]]), P.main, { p: [0, -0.2, 0.35] });
    K.add(wing(THREE, [[0, 0.1], [1.0, -0.12], [1.7, -0.42], [1.65, -0.6], [0.9, -0.6], [0, -0.55]], 0.05, 0.04), P.light, { p: [0, -0.07, 0.42] }, 0);
    for (const side of [-1, 1]) {
      K.add(new THREE.SphereGeometry(0.24, 16, 12), P.accent, { p: [side * 2.08, -0.18, 0.75], s: [0.9, 0.9, 1.5] });
      K.add(new THREE.SphereGeometry(0.08, 8, 6), P.glow, { p: [side * 2.1, -0.18, 0.36] }, 0);
    }
    K.add(fin(THREE, [[-0.95, 0], [-0.25, 0.05], [-0.62, 0.62], [-0.98, 0.95], [-1.18, 0.9], [-1.25, 0.1]]), P.accent, { p: [0, 0.48, 0] });
    K.add(new THREE.SphereGeometry(0.1, 10, 8), P.glow, { p: [0, 1.44, 1.13] }, 0.025);
    engine(THREE, K, P, group, flames, [0, 0, 1.5], 0.44);
    const seat = [0, 0.82, -0.35];
    collar(THREE, K, P, seat);
    return seat;
  },
  // BASTION: a flying tugboat. Fat barrel hull with bolted bands, cream pontoon engines, a bumper with
  // headlights and a little smokestack.
  bastion(THREE, K, P, group, flames) {
    const body = [[0, -1.45], [0.6, -1.42], [0.88, -1.12], [0.99, -0.5], [1.0, 0.2], [0.95, 0.8], [0.8, 1.22], [0.56, 1.46], [0, 1.52]];
    K.add(lathe(THREE, body), P.main);
    for (const f of [-0.62, 0.45]) K.add(new THREE.TorusGeometry(radiusAt(body, f) + 0.02, 0.09, 10, 28), P.dark, { p: [0, 0, -f] }, 0.03);
    K.add(new THREE.TorusGeometry(0.62, 0.13, 10, 26), P.accent, { p: [0, 0, -1.34] }, 0.035);
    for (const side of [-1, 1]) {
      K.add(new THREE.SphereGeometry(0.13, 12, 8), P.glow, { p: [side * 0.33, 0.12, -1.45] }, 0.03);
      const pod = [[0, -1.0], [0.3, -0.96], [0.43, -0.65], [0.45, 0], [0.41, 0.6], [0.26, 0.92], [0, 1.0]];
      K.add(lathe(THREE, pod, 18), P.light, { p: [side * 1.5, -0.2, 0.15] });
      K.add(lathe(THREE, [[0.32, 0.55], [0.22, 0.82], [0.1, 0.96], [0, 1.01]], 18), P.accent, { p: [side * 1.5, -0.2, 0.15] }, 0);
      K.add(new THREE.BoxGeometry(0.75, 0.2, 0.75), P.dark, { p: [side * 1.02, -0.18, 0.15] });
      engine(THREE, K, P, group, flames, [side * 1.5, -0.2, 1.1], 0.3);
    }
    K.add(new THREE.CylinderGeometry(0.15, 0.18, 0.55, 14), P.dark, { p: [0.0, 1.05, 0.85] });
    K.add(new THREE.TorusGeometry(0.16, 0.06, 8, 16), P.accent, { p: [0.0, 1.33, 0.85], r: [Math.PI / 2, 0, 0] }, 0.025);
    engine(THREE, K, P, group, flames, [0, 0, 1.45], 0.4);
    const seat = [0, 1.06, -0.3];
    collar(THREE, K, P, seat);
    return seat;
  },
  // NEEDLE: a candy-striped dart. Long pencil body, red nose cone, swept wings, red V-tail, twin engines.
  needle(THREE, K, P, group, flames) {
    const body = [[0, -1.6], [0.32, -1.55], [0.46, -1.2], [0.5, -0.5], [0.46, 0.3], [0.37, 1.0], [0.23, 1.7], [0.1, 2.2], [0, 2.42]];
    K.add(lathe(THREE, body), P.main);
    K.add(lathe(THREE, [[0.21, 1.72], [0.13, 2.05], [0.06, 2.32], [0, 2.46]]), P.accent, {}, 0);
    for (const f of [0.45, 0.85, 1.25]) K.add(band(THREE, body, f, 0.09, 0.016), P.light, {}, 0);
    K.add(wing(THREE, [[0, 0.3], [0.8, -0.1], [1.75, -0.85], [2.1, -1.28], [1.75, -1.3], [0.9, -1.1], [0, -1.0]], 0.09, 0.05), P.main, { p: [0, -0.12, 0.2] });
    K.add(wing(THREE, [[0, -0.55], [1.1, -0.82], [1.85, -1.22], [1.5, -1.22], [0, -1.0]], 0.03, 0.03), P.accent, { p: [0, -0.04, 0.2] }, 0);
    for (const side of [-1, 1]) K.add(fin(THREE, [[-0.85, 0], [-0.2, 0.05], [-0.62, 0.62], [-0.86, 0.82], [-1.02, 0.78], [-1.05, 0.1]], 0.08), P.accent, { p: [side * 0.2, 0.3, 0], r: [0, 0, -side * 0.6] });
    for (const side of [-1, 1]) engine(THREE, K, P, group, flames, [side * 0.27, -0.02, 1.58], 0.26);
    const seat = [0, 0.66, -0.15];
    collar(THREE, K, P, seat);
    return seat;
  },
  // MANTA: a puffy flying ray. One soft wing-body with curled pink tips, a hump for the cockpit,
  // a long whip tail with a glowing tip, three small engines.
  manta(THREE, K, P, group, flames) {
    K.add(wing(THREE, [[0, 1.35], [0.85, 1.05], [1.8, 0.25], [2.6, -0.32], [2.55, -0.72], [1.65, -0.6], [0.75, -0.98], [0, -1.08]], 0.2, 0.16), P.main, { p: [0, 0, 0] });
    K.add(wing(THREE, [[0, 1.1], [0.8, 0.85], [1.6, 0.15], [2.25, -0.32], [1.5, -0.42], [0.7, -0.72], [0, -0.8]], 0.04, 0.04), P.light, { p: [0, -0.2, 0.02] }, 0);
    K.add(new THREE.SphereGeometry(0.78, 22, 14), P.main, { p: [0, 0.12, -0.1], s: [1, 0.55, 1.45] });
    for (const side of [-1, 1]) {
      K.add(new THREE.TorusGeometry(0.26, 0.08, 8, 14, Math.PI * 1.2), P.accent, { p: [side * 2.58, 0.24, 0.55], r: [0, Math.PI / 2, side > 0 ? -0.4 : Math.PI + 0.4] }, 0.03);
      K.add(new THREE.SphereGeometry(0.09, 8, 6), P.glow, { p: [side * 1.65, 0.12, -0.35] }, 0);
    }
    K.add(lathe(THREE, [[0, -2.9], [0.05, -2.8], [0.08, -2.1], [0.13, -1.3], [0.18, -0.9], [0, -0.7]], 12), P.dark, { r: [0.07, 0, 0] });
    K.add(new THREE.SphereGeometry(0.13, 12, 8), P.glow, { p: [0, -0.2, 2.9] }, 0.025);
    engine(THREE, K, P, group, flames, [-0.62, 0.02, 1.0], 0.22);
    engine(THREE, K, P, group, flames, [0.62, 0.02, 1.0], 0.22);
    engine(THREE, K, P, group, flames, [0, 0.12, 1.12], 0.28);
    const seat = [0, 0.74, -0.25];
    collar(THREE, K, P, seat);
    return seat;
  },
};

export function buildCartoonShip(THREE, def = {}) {
  const id = DESIGNS[def.id] ? def.id : 'kite';
  const group = new THREE.Group(), flames = [];
  const P = palette(THREE, def, SCHEMES[id]);
  const K = partKit(THREE, 0.06);
  const seat = DESIGNS[id](THREE, K, P, group, flames);
  K.build(group);
  group.userData.cartoon = true;
  group.userData.seat = seat;
  group.userData.flames = flames;
  group.userData.mats = P;
  return group;
}
