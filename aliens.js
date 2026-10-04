/**
 * Cartoon alien pilots: squashy heads with googly eyes and bobbing antennae,
 * toon-shaded (three flat light bands) so they read as characters, not props.
 * Every NPC racer has one in its cockpit; the same builder is used for the hub
 * and trackside critters.
 */

/** The cast. Each alien has a name, skin, eye count and a racing colour. */
export const ALIENS = [
  { name: 'ZORP', skin: '#7dff6a', eyes: 1, color: '#9dff7a', antennae: 2, quip: 'ZORP SAYS HI' },
  { name: 'BLIX', skin: '#c18cff', eyes: 3, color: '#c7a3ff', antennae: 1, quip: 'BLIX IS DIZZY' },
  { name: 'MUNGO', skin: '#ffb15c', eyes: 2, color: '#ffd27a', antennae: 2, quip: 'MUNGO MAD' },
  { name: 'QUEEP', skin: '#5ce1ff', eyes: 2, color: '#8fe8ff', antennae: 0, quip: 'QUEEP!' },
  { name: 'GLORB', skin: '#ff7fc8', eyes: 1, color: '#ffa6d6', antennae: 1, quip: 'GLORB GLORBS' },
];

let gradientMap = null;
/** Three-band ramp for MeshToonMaterial: shadow, mid, lit. */
export function toonGradient(THREE) {
  if (gradientMap) return gradientMap;
  const data = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  gradientMap = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  return gradientMap;
}

export const toon = (THREE, color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(THREE), ...extra });

/** Inverted-hull ink outline for a mesh (cartoon line art). */
export function inkOutline(THREE, mesh, thickness = 1.08, color = '#140f24') {
  const line = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
  line.scale.setScalar(thickness);
  line.userData.ink = true;
  mesh.add(line);
  return line;
}

/**
 * A little alien pilot head (about 0.7 units tall), facing -z (forward).
 * `group.userData.tick(now)` bobs the head, wiggles antennae and blinks.
 */
export function makeAlienPilot(THREE, alien = ALIENS[0]) {
  const group = new THREE.Group();
  const skin = toon(THREE, alien.skin);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), skin);
  head.scale.set(1, 0.86, 0.95);
  inkOutline(THREE, head, 1.09);
  group.add(head);

  const white = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const pupil = new THREE.MeshBasicMaterial({ color: '#120c1c' });
  const eyes = [];
  const n = alien.eyes;
  for (let i = 0; i < n; i++) {
    const spread = n === 1 ? 0 : (i / (n - 1) - 0.5) * (n === 3 ? 0.36 : 0.26);
    const size = n === 1 ? 0.17 : 0.11;
    const eye = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(size, 14, 10), white);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(size * 0.48, 10, 8), pupil);
    dot.position.z = -size * 0.62;
    eye.add(ball, dot);
    eye.position.set(spread, 0.08 + (n === 3 && i === 1 ? 0.07 : 0), -0.26);
    eye.userData.dot = dot;
    group.add(eye);
    eyes.push(eye);
  }
  // A small smile on the front of the head.
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 6, 12, Math.PI), pupil);
  mouth.rotation.set(0, Math.PI, Math.PI);
  mouth.position.set(0, -0.1, -0.31);
  group.add(mouth);

  const antennae = [];
  for (let i = 0; i < alien.antennae; i++) {
    const side = alien.antennae === 1 ? 0 : i ? 1 : -1;
    const stalk = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.32, 5), skin);
    stem.position.y = 0.16;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshBasicMaterial({ color: alien.color }));
    bulb.position.y = 0.34;
    stalk.add(stem, bulb);
    stalk.position.set(side * 0.13, 0.24, 0);
    stalk.rotation.z = -side * 0.35;
    group.add(stalk);
    antennae.push(stalk);
  }

  const phase = Math.random() * 6.28;
  group.userData.tick = (now, dizzy = 0) => {
    const t = now * 0.001 + phase;
    head.position.y = Math.sin(t * 4) * 0.025;
    antennae.forEach((a, i) => { a.rotation.x = Math.sin(t * 6 + i) * 0.25; });
    const blink = (t % 3.7) < 0.12 ? 0.15 : 1;
    eyes.forEach((e, i) => {
      e.scale.y = blink;
      // Dizzy pupils spin in circles after a zap.
      const r = dizzy ? 0.05 : 0.015;
      e.userData.dot.position.x = Math.cos(t * (dizzy ? 14 : 1.3) + i) * r;
      e.userData.dot.position.y = Math.sin(t * (dizzy ? 14 : 1.1) + i) * r;
    });
  };
  return group;
}
