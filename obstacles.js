import { addRim } from './rim.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roughen, gradient } from './shapes.js';
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
  // Solid spikes (a sea-mine silhouette) instead of a wireframe cage.
  const cage = new THREE.Group();
  const spikeMat = addRim(new THREE.MeshStandardMaterial({ color: '#241a1e', emissive: DANGER, emissiveIntensity: 0.25, metalness: 0.8, roughness: 0.35, flatShading: true }), { strength: 0.9, color: DANGER });
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[0.7,0.7,0],[-0.7,-0.7,0]];
  const spikes = dirs.map(([x, y, z]) => {
    const dir = new THREE.Vector3(x, y, z).normalize();
    const m = new THREE.Matrix4().compose(dir.clone().multiplyScalar(r * 0.62), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), new THREE.Vector3(1, 1, 1));
    return new THREE.ConeGeometry(r * 0.12, r * 0.55, 5).toNonIndexed().applyMatrix4(m);
  });
  cage.add(new THREE.Mesh(mergeGeometries(spikes), spikeMat));
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

// A small pool of roughened rock shapes per family (plus the Kenney meteor once
// loaded), so every rock looks different without building a new geometry per rock.
const rockPool = new Map();
let meteorGeometry = null;
new GLTFLoader().loadAsync('/assets/kenney/models/meteor.glb').then((gltf) => {
  const parts = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const key of Object.keys(g.attributes)) if (key !== 'position' && key !== 'normal') g.deleteAttribute(key);
    parts.push(g.index ? g.toNonIndexed() : g);
  });
  if (!parts.length) return;
  const merged = mergeGeometries(parts);
  merged.computeBoundingSphere();
  const { center, radius } = merged.boundingSphere;
  merged.translate(-center.x, -center.y, -center.z).scale(1 / radius, 1 / radius, 1 / radius);
  meteorGeometry = merged;
}).catch(() => {});

function rockShape(THREE, family, seed, look) {
  const key = `${family}:${seed % 5}`;
  if (!rockPool.has(key)) {
    const base = family === 'box' ? new THREE.BoxGeometry(1.3, 1.3, 1.3, 2, 2, 2) : family === 'octa' ? new THREE.OctahedronGeometry(1, 1) : family === 'icosa' ? new THREE.IcosahedronGeometry(1, 1) : new THREE.DodecahedronGeometry(1, 1);
    const shade = new THREE.Color(look?.color || '#5a5060');
    rockPool.set(key, gradient(roughen(base, 0.32, 101 + (seed % 5) * 7), shade.clone().multiplyScalar(0.45), shade.clone().lerp(new THREE.Color('#ffffff'), 0.25), 1));
  }
  return rockPool.get(key);
}

/** Asteroid-field rock: crafted low-poly rock (or Kenney meteor) whose edges glow danger red, with a pulsing red core halo. */
export function makeRock(THREE, item, course, look) {
  const group = new THREE.Group();
  const r = Number(item.radius) || 0.85;
  const seed = Math.abs(Math.floor((item.distance || 0) * 7.3 + (item.x || 0) * 31 + (item.y || 0) * 17));
  const useMeteor = meteorGeometry && seed % 3 === 0 && look?.geometry !== 'octa';
  let geometry = useMeteor ? meteorGeometry : rockShape(THREE, look?.geometry, seed, look);
  const material = new THREE.MeshStandardMaterial({
    color: useMeteor ? (look?.color || '#5a5060') : '#ffffff', vertexColors: !useMeteor,
    emissive: look?.emissive || '#000000', emissiveIntensity: (look?.emissiveIntensity || 0) * 0.5,
    metalness: look?.metalness ?? 0.2, roughness: look?.roughness ?? 0.8, flatShading: true,
    transparent: !!look?.opacity, opacity: look?.opacity || 1,
  });
  addRim(material, { strength: 1.1, power: 2.0, color: DANGER });
  const body = new THREE.Mesh(geometry, material);
  const stretch = look?.stretch || [1, 0.9, 1];
  const jitter = 0.85 + ((seed % 100) / 100) * 0.35;
  body.scale.set(stretch[0] * r * jitter, stretch[1] * r * (0.9 + ((seed >> 3) % 20) / 100), stretch[2] * r * jitter);
  group.add(body);
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo(THREE), color: DANGER, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  glowSprite.scale.setScalar(r * 2.6);
  glowSprite.position.z = -r * 0.3;
  group.add(glowSprite);
  const phase = (seed % 628) / 100, spin = 0.0003 + (seed % 7) * 0.0001;
  group.rotation.set(phase, phase * 1.7, 0);
  group.userData.animate = (now) => {
    group.rotation.y = phase * 1.7 + now * spin * 1.6;
    group.rotation.x = phase + now * spin;
    glowSprite.material.opacity = 0.22 + 0.18 * Math.sin(now * 0.006 + phase);
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
