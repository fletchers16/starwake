import { addRim } from './rim.js';
/**
 * Hazard meshes with one consistent visual language: anything that hurts is
 * drawn in the course's hazard colour with a glowing core, and nothing is
 * randomly warped. Each mesh may expose `userData.animate(now)`; meshes
 * without it are spun by the race loop.
 *
 * Visual sizes match the colliders in game.js:
 *   mine / rock: radius (item.radius) · fence: ~1.3 circle · ring-plane: width × 0.72 band
 */

// One danger colour on every world, so "red hurts" is always true and hazards never blend with scenery.
export const DANGER = '#ff4d5e';

const glowMat = (THREE, color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

/** Mine: bright core inside an open wireframe cage and a turning warning ring. Used on the centre line. */
export function makeMine(THREE, item, course) {
  const group = new THREE.Group();
  const r = Math.max(0.6, Number(item.radius) || 0.72);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.42, 1), glowMat(THREE, DANGER));
  group.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 16, 12), new THREE.MeshBasicMaterial({ color: DANGER, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(halo);
  const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(r * 0.8, 0)), new THREE.LineBasicMaterial({ color: DANGER, transparent: true, opacity: 0.9 }));
  group.add(cage);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.08, 0.04, 6, 48), glowMat(THREE, DANGER, 0.7));
  group.add(ring);
  const seed = (item.distance || 0) * 0.37;
  group.userData.animate = (now) => {
    cage.rotation.set(now * 0.0007 + seed, now * 0.0011 + seed, 0);
    ring.rotation.z = -now * 0.0012 + seed;
    const pulse = 0.85 + 0.15 * Math.sin(now * 0.008 + seed);
    core.scale.setScalar(pulse);
    halo.scale.setScalar(1.6 - pulse * 0.5);
  };
  return group;
}

/** Laser fence: two emitter posts with glowing beams between them. Replaces box-and-cone blockers. */
export function makeFence(THREE, item, course) {
  const group = new THREE.Group();
  const width = 3.1, height = 1.5;
  const postMat = new THREE.MeshStandardMaterial({ color: '#141c28', emissive: DANGER, emissiveIntensity: 0.25, metalness: 0.85, roughness: 0.28 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, height + 0.5, 0.26), postMat);
    post.position.x = side * width / 2;
    group.add(post);
    for (const y of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), glowMat(THREE, DANGER));
      cap.position.set(side * width / 2, y * (height / 2 + 0.25), 0);
      group.add(cap);
    }
  }
  const beams = [];
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, 0.05), glowMat(THREE, DANGER));
    beam.position.y = -height / 2 + (i / 3) * height;
    group.add(beam);
    beams.push(beam);
  }
  const field = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: DANGER, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  group.add(field);
  const seed = (item.distance || 0) * 0.21;
  group.userData.animate = (now) => {
    beams.forEach((beam, i) => { beam.scale.y = beam.scale.z = 0.8 + 0.5 * Math.max(0, Math.sin(now * 0.012 + i * 1.3 + seed)); });
    field.material.opacity = 0.08 + 0.06 * Math.sin(now * 0.006 + seed);
  };
  return group;
}

/** Asteroid-field rock: chunky low-poly in the world's material, outlined in the hazard colour. */
export function makeRock(THREE, item, course, look) {
  const group = new THREE.Group();
  const r = Number(item.radius) || 0.85;
  const family = look?.geometry;
  const geometry = family === 'box' ? new THREE.BoxGeometry(1.3, 1.3, 1.3) : family === 'octa' ? new THREE.OctahedronGeometry(1, 0) : family === 'icosa' ? new THREE.IcosahedronGeometry(1, 0) : new THREE.DodecahedronGeometry(1, 0);
  const material = look
    ? new THREE.MeshStandardMaterial({ color: look.color, emissive: look.emissive, emissiveIntensity: look.emissiveIntensity * 0.7, metalness: look.metalness, roughness: look.roughness, transparent: !!look.opacity, opacity: look.opacity || 1, flatShading: true })
    : new THREE.MeshStandardMaterial({ color: '#3a3440', roughness: 0.8, flatShading: true });
  const body = new THREE.Mesh(geometry, addRim(material, { strength: 0.55 }));
  const stretch = look?.stretch || [1, 0.9, 1];
  body.scale.set(stretch[0] * r, stretch[1] * r, stretch[2] * r);
  group.add(body);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), new THREE.LineBasicMaterial({ color: DANGER, transparent: true, opacity: 0.75 }));
  edges.scale.copy(body.scale).multiplyScalar(1.015);
  group.add(edges);
  const seed = (item.distance || 0) * 0.13 + (item.x || 0);
  group.rotation.set(seed, seed * 1.7, 0);
  group.userData.animate = (now) => {
    group.rotation.y = seed * 1.7 + now * 0.0005;
    group.rotation.x = seed + now * 0.0003;
  };
  return group;
}

/** Broken ring plane: hazard-coloured arcs with clean gaps; fly through the middle. */
export function makeBrokenRing(THREE, item, course) {
  const group = new THREE.Group();
  const radius = Number(item.width) > 0 ? Math.max(4.1, Number(item.width) * 0.72) : 4.8;
  const metal = new THREE.MeshStandardMaterial({ color: '#1c1a22', emissive: DANGER, emissiveIntensity: 0.35, metalness: 0.8, roughness: 0.3 });
  for (let i = 0; i < 5; i++) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.42, 10, 32, (Math.PI * 2) / 5 - 0.32), metal);
    arc.rotation.z = (i / 5) * Math.PI * 2;
    group.add(arc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.5, 0.04, 6, 32, (Math.PI * 2) / 5 - 0.32), glowMat(THREE, DANGER));
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
  if (item.type === 'blocker') return makeFence(THREE, item, course);
  if (item.type === 'ring-plane') return makeBrokenRing(THREE, item, course);
  if (item.mine) return makeMine(THREE, item, course);
  return makeRock(THREE, item, course, look);
}
