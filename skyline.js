/**
 * Distant megastructure skyline for Neon Rift: Kenney Space Kit (CC0) station
 * modules scaled up into a far-off silhouette city with lit edges, light
 * strips and blinking beacons, plus a colossal broken orbital ring. Fills the
 * empty black void without adding clutter near the track.
 */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon } from './aliens.js';

const MODELS = ['structure_detailed', 'hangar_roundA', 'monorail_trackSupport', 'satelliteDish_large', 'pipe_ringSupport'];
const cache = new Map();
const loader = new GLTFLoader();

function loadModel(name) {
  if (!cache.has(name)) cache.set(name, loader.loadAsync(`/assets/kenney/models/${name}.glb`).then((gltf) => gltf.scene).catch(() => null));
  return cache.get(name);
}

const hash = (n) => { const x = Math.sin(n * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };

export function createSkyline(THREE, { accent = '#71f5dc', glowTexture } = {}) {
  const group = new THREE.Group();
  // Cel-shaded lilac silhouettes (the old rim-lit steel read as wireframe next to the cartoon track).
  const hull = toon(THREE, '#4a3f9a');
  const strip = new THREE.MeshBasicMaterial({ color: accent, fog: false });
  // Beacons are one point cloud (one draw call) whose per-beacon brightness blinks via vertex colours.
  const beaconSpots = [];
  let beaconPoints = null;

  // Everything here shares two materials, so geometry is merged into a few
  // meshes (one hull, one light) to keep the skyline to a handful of draw calls.
  const clean = (g) => { for (const key of Object.keys(g.attributes)) if (key !== 'position' && key !== 'normal') g.deleteAttribute(key); return g.index ? g.toNonIndexed() : g; };
  const hullParts = [], lightParts = [];
  const place = (geometry, euler) => geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(euler));

  // Colossal broken orbital ring arcing across the far sky.
  for (let i = 0; i < 9; i++) {
    if (i === 3 || i === 7) continue;
    const e = new THREE.Euler(1.18, 0.12, (i / 9) * Math.PI * 2);
    hullParts.push(clean(place(new THREE.TorusGeometry(150, 2.6, 6, 14, (Math.PI * 2) / 9 - 0.05), e)));
    lightParts.push(clean(place(new THREE.TorusGeometry(147, 0.35, 4, 14, (Math.PI * 2) / 9 - 0.05), e)));
  }
  const ringHull = new THREE.Mesh(mergeGeometries(hullParts), hull);
  const ringLight = new THREE.Mesh(mergeGeometries(lightParts), strip);
  group.add(ringHull, ringLight);

  // Skyline: station modules scattered on a far arc, scaled into towers and domes.
  Promise.all(MODELS.map(loadModel)).then((scenes) => {
    const towerParts = [], stripParts = [];
    for (let i = 0; i < 16; i++) {
      const source = scenes[i % scenes.length];
      if (!source) continue;
      const model = source.clone(true);
      const side = i % 2 ? 1 : -1;
      const scale = 14 + hash(i) * 26;
      model.scale.setScalar(scale);
      model.position.set(side * (60 + hash(i * 3) * 170), -42 + hash(i * 5) * 18, -40 - hash(i * 7) * 120);
      model.rotation.y = hash(i * 11) * Math.PI * 2;
      model.updateMatrixWorld(true);
      model.traverse((o) => { if (o.isMesh) towerParts.push(clean(o.geometry.clone().applyMatrix4(o.matrixWorld))); });
      const box = new THREE.Box3().setFromObject(model);
      const top = box.max.y;
      // A vertical light strip and a beacon on each structure.
      const height = Math.max(4, top - box.min.y);
      stripParts.push(clean(new THREE.BoxGeometry(0.5, height * 0.8, 0.5).translate(model.position.x + (hash(i * 13) - 0.5) * scale * 0.6, box.min.y + height * 0.45, model.position.z + scale * 0.3)));
      beaconSpots.push({ x: model.position.x, y: top + 2, z: model.position.z, phase: hash(i * 17) * 6.28 });
    }
    if (beaconSpots.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(beaconSpots.flatMap((b) => [b.x, b.y, b.z])), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(beaconSpots.length * 3), 3));
      beaconPoints = new THREE.Points(geometry, new THREE.PointsMaterial({ map: glowTexture, size: 7, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      beaconPoints.frustumCulled = false;
      group.add(beaconPoints);
    }
    if (towerParts.length) {
      const towers = new THREE.Mesh(mergeGeometries(towerParts), hull);
      const strips = new THREE.Mesh(mergeGeometries(stripParts), strip);
      towers.frustumCulled = strips.frustumCulled = false;
      group.add(towers, strips);
    }
  });

  group.userData.tick = (now) => {
    if (!beaconPoints) return;
    const colors = beaconPoints.geometry.attributes.color, tint = [0.75, 0.96, 1];
    beaconSpots.forEach((b, i) => { const k = 0.35 + 0.65 * Math.max(0, Math.sin(now * 0.003 + b.phase)); colors.setXYZ(i, tint[0] * k, tint[1] * k, tint[2] * k); });
    colors.needsUpdate = true;
  };
  return group;
}
