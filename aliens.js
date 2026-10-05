/**
 * Cartoon alien pilots: squashy heads with googly eyes and bobbing antennae,
 * toon-shaded (three flat light bands) so they read as characters, not props.
 * Every NPC racer has one in its cockpit; the same builder is used for the hub
 * and trackside critters.
 */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** The cast. Each alien has a name, skin, eye count and a racing colour. */
export const ALIENS = [
  { name: 'ZORP', skin: '#7dff6a', eyes: 1, color: '#9dff7a', antennae: 2, quip: 'ZORP SAYS HI' },
  { name: 'BLIX', skin: '#c18cff', eyes: 3, color: '#c7a3ff', antennae: 1, quip: 'BLIX IS DIZZY' },
  { name: 'MUNGO', skin: '#ffb15c', eyes: 2, color: '#ffd27a', antennae: 2, quip: 'MUNGO MAD' },
  { name: 'QUEEP', skin: '#5ce1ff', eyes: 2, color: '#8fe8ff', antennae: 0, quip: 'QUEEP!' },
  { name: 'GLORB', skin: '#ff7fc8', eyes: 1, color: '#ffa6d6', antennae: 1, quip: 'GLORB GLORBS' },
  // Pilots for humans (picked from the callsign); sim pilots use the first five.
  { name: 'PIP', skin: '#ffe066', eyes: 2, color: '#ffe680', antennae: 2, quip: 'PIP PIP!' },
  { name: 'NUBBS', skin: '#4fe3c1', eyes: 3, color: '#7ef5dc', antennae: 1, quip: 'NUBBS NODS' },
  { name: 'KAZOO', skin: '#ff9e6b', eyes: 1, color: '#ffb88a', antennae: 2, quip: 'KAZOOOO' },
];

/** A stable alien for any name (so a friend always sees you as the same character). */
export const alienFor = (name = '') => ALIENS[[...String(name)].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261) % ALIENS.length];

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
 * Eyes, pupils and antennae are each merged into one mesh (7 draw calls per pilot).
 * `group.userData.tick(now, dizzy)` bobs the head, wiggles antennae, blinks, and
 * spins the pupils when dizzy.
 */
export function makeAlienPilot(THREE, alien = ALIENS[0]) {
  const group = new THREE.Group();
  const skin = toon(THREE, alien.skin);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), skin);
  head.scale.set(1, 0.86, 0.95);
  inkOutline(THREE, head, 1.09);
  group.add(head);

  const n = alien.eyes, whites = [], dots = [];
  for (let i = 0; i < n; i++) {
    const spread = n === 1 ? 0 : (i / (n - 1) - 0.5) * (n === 3 ? 0.36 : 0.26);
    const size = n === 1 ? 0.17 : 0.11, y = 0.08 + (n === 3 && i === 1 ? 0.07 : 0);
    whites.push(new THREE.SphereGeometry(size, 14, 10).translate(spread, y, -0.26));
    dots.push(new THREE.SphereGeometry(size * 0.48, 10, 8).translate(spread, y, -0.26 - size * 0.62));
  }
  const eyes = new THREE.Group();
  eyes.add(new THREE.Mesh(mergeGeometries(whites), new THREE.MeshBasicMaterial({ color: '#ffffff' })));
  const pupils = new THREE.Mesh(mergeGeometries(dots), new THREE.MeshBasicMaterial({ color: '#120c1c' }));
  eyes.add(pupils);
  eyes.position.y = 0.08;
  eyes.children.forEach((c) => c.position.y = -0.08);
  group.add(eyes);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 6, 12, Math.PI), pupils.material);
  mouth.rotation.set(0, Math.PI, Math.PI);
  mouth.position.set(0, -0.1, -0.31);
  group.add(mouth);

  const antennae = new THREE.Group();
  if (alien.antennae) {
    const stems = [], bulbs = [];
    for (let i = 0; i < alien.antennae; i++) {
      const side = alien.antennae === 1 ? 0 : i ? 1 : -1;
      const tilt = new THREE.Matrix4().makeRotationZ(-side * 0.35);
      stems.push(new THREE.CylinderGeometry(0.015, 0.02, 0.32, 5).translate(0, 0.16, 0).applyMatrix4(tilt).translate(side * 0.13, 0, 0));
      bulbs.push(new THREE.SphereGeometry(0.055, 10, 8).translate(0, 0.34, 0).applyMatrix4(tilt).translate(side * 0.13, 0, 0));
    }
    antennae.add(new THREE.Mesh(mergeGeometries(stems), skin), new THREE.Mesh(mergeGeometries(bulbs), new THREE.MeshBasicMaterial({ color: alien.color })));
    antennae.position.y = 0.24;
    group.add(antennae);
  }

  const phase = Math.random() * 6.28;
  group.userData.tick = (now, dizzy = 0) => {
    const t = now * 0.001 + phase;
    head.position.y = Math.sin(t * 4) * 0.025;
    antennae.rotation.x = Math.sin(t * 6) * 0.22;
    eyes.scale.y = (t % 3.7) < 0.12 ? 0.15 : 1;
    // Dizzy pupils whirl in circles after a zap.
    const r = dizzy ? 0.05 : 0.015;
    pupils.position.x = Math.cos(t * (dizzy ? 14 : 1.3)) * r;
    pupils.position.y = -0.08 + Math.sin(t * (dizzy ? 14 : 1.1)) * r;
  };
  return group;
}

/**
 * Fallback trash talk when the AI announcer isn't available (no OpenAI key on the
 * deployment). With a key, netlify/functions/banter.ts writes per-course lines.
 */
export const CANNED_LINES = {
  ZORP: { zap: ['Zorp sees all. Zorp zaps all.', 'One eye, zero mercy!', 'Smile for the laser!'], zapped: ['My beautiful eye!', 'Lucky shot, earthling.', 'Zorp will remember this.'], lead: ['Behold: first place. As usual.', 'Bow before the eye!', 'See you at the finish. Not.'] },
  BLIX: { zap: ['Pew pew pew! Three times!', 'All three eyes saw that!', 'Ha! Dizzy now, aren\'t you?'], zapped: ['The room is spinning!', 'Which way is forward?!', 'Ouch, ouch, and ouch.'], lead: ['Blix is in front! Wheee!', 'Triple-eyed and first!', 'Catch me if you can! You can\'t.'] },
  MUNGO: { zap: ['Mungo is not sorry.', 'Out of my lane!', 'That is for last week.'], zapped: ['Mungo is mad now.', 'You will regret that.', 'Grrrrrr.'], lead: ['Mungo first. Finally.', 'Move. Mungo is winning.', 'Hmph. As it should be.'] },
  QUEEP: { zap: ['QUEEP QUEEP! Got you!', 'Tiny ship, big laser!', 'Zappity zap!'], zapped: ['Queeeeep!', 'No fair! I\'m tiny!', 'Waaah, my points!'], lead: ['Queep in first! Queep in first!', 'So fast! So small!', 'Bye bye!'] },
  GLORB: { zap: ['The cosmos zapped you, man.', 'It\'s nothing personal. It\'s physics.', 'Glorb happens.'], zapped: ['All things are temporary. Even points.', 'Whoa. Heavy.', 'I felt that in my soul, dude.'], lead: ['First is just a state of mind.', 'Glorb is one with the lead.', 'Far out. I\'m winning.'] },
};
