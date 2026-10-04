/**
 * Funky things along the track, so a race reads as a cartoon space carnival:
 * - Space cows: floating bubble-helmeted cows. Fly through one for a "MOO!" bonus.
 * - UFO spectators: little saucers of cheering aliens holding up signs, leapfrogging
 *   along the trackside (a handful recycled, so they cost a fixed few draw calls).
 * - Bounty crown: sits on whoever is leading.
 */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ALIENS, toon, inkOutline } from './aliens.js';

/** A floating cow in a bubble helmet, slowly tumbling. About 2 units long. */
export function makeSpaceCow(THREE) {
  const group = new THREE.Group();
  const cow = new THREE.Group();
  const white = toon(THREE, '#fbfbff'), black = toon(THREE, '#231c2e'), pink = toon(THREE, '#ff9ccf');
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.8, 4, 10), white);
  body.rotation.z = Math.PI / 2;
  inkOutline(THREE, body, 1.08);
  cow.add(body);
  // Spots, horns, eyes, pupils and legs are each merged into a single mesh (11 draw calls per cow).
  const spots = [[0.2, 0.3, 0.32, 0.22], [-0.35, 0.1, 0.4, 0.18], [0.45, -0.1, -0.35, 0.2], [-0.15, 0.32, -0.3, 0.16]].map(([x, y, z, r]) => new THREE.SphereGeometry(r, 8, 6).scale(1, 0.5, 1).translate(x, y, z));
  cow.add(new THREE.Mesh(mergeGeometries(spots), black));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), white);
  head.position.set(0.95, 0.25, 0);
  inkOutline(THREE, head, 1.08);
  cow.add(head);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), pink);
  snout.scale.set(0.7, 0.8, 1.2);
  snout.position.set(1.22, 0.15, 0);
  cow.add(snout);
  const horns = [], eyes = [], pupils = [], legs = [];
  for (const side of [-1, 1]) {
    horns.push(new THREE.ConeGeometry(0.06, 0.25, 6).rotateX(side * 0.5).translate(0.95, 0.6, side * 0.2));
    eyes.push(new THREE.SphereGeometry(0.09, 8, 6).translate(1.18, 0.38, side * 0.15));
    pupils.push(new THREE.SphereGeometry(0.045, 6, 5).translate(1.25, 0.38, side * 0.15));
    for (const end of [-1, 1]) legs.push(new THREE.CylinderGeometry(0.08, 0.07, 0.4, 6).translate(end * 0.4, -0.55, side * 0.25));
  }
  cow.add(new THREE.Mesh(mergeGeometries(horns), toon(THREE, '#ffe9b0')));
  cow.add(new THREE.Mesh(mergeGeometries(eyes), new THREE.MeshBasicMaterial({ color: '#ffffff' })));
  cow.add(new THREE.Mesh(mergeGeometries(pupils), new THREE.MeshBasicMaterial({ color: '#120c1c' })));
  cow.add(new THREE.Mesh(mergeGeometries(legs), white));
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), new THREE.MeshBasicMaterial({ color: '#cfefff', transparent: true, opacity: 0.18, depthWrite: false }));
  bubble.position.copy(head.position);
  cow.add(bubble);
  cow.scale.setScalar(0.9);
  group.add(cow);
  const phase = Math.random() * 6.28;
  group.userData.animate = (now) => {
    cow.rotation.set(Math.sin(now * 0.0011 + phase) * 0.4, now * 0.0009 + phase, Math.sin(now * 0.0013 + phase) * 0.3);
    cow.position.y = Math.sin(now * 0.002 + phase) * 0.25;
  };
  return group;
}

const SIGNS = ['ZAP!', 'GO GO', '★★★', 'MOO?', 'WOW', 'HI MOM', '⚡', 'FAST!', 'BLORP', '♥'];

function signTexture(THREE, text, color) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1430';
  g.fillRect(0, 0, 128, 80);
  g.fillStyle = color;
  g.fillRect(6, 6, 116, 68);
  g.fillStyle = '#1b1430';
  g.font = '900 34px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 42);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Two or three cartoon alien faces drawn on one canvas (a single sprite per saucer crew). */
function crewTexture(THREE, i) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const n = 2 + (i % 2);
  for (let k = 0; k < n; k++) {
    const a = ALIENS[(i * 3 + k) % ALIENS.length], cx = (k + 0.5) * (256 / n), cy = 74, r = 34;
    g.lineWidth = 6; g.strokeStyle = '#1b1430'; g.fillStyle = a.skin;
    for (let s = 0; s < a.antennae; s++) {
      const dx = a.antennae === 1 ? 0 : s ? 14 : -14;
      g.beginPath(); g.moveTo(cx + dx * 0.5, cy - r + 4); g.lineTo(cx + dx, cy - r - 22); g.stroke();
      g.beginPath(); g.arc(cx + dx, cy - r - 24, 7, 0, Math.PI * 2); g.fillStyle = a.color; g.fill(); g.stroke(); g.fillStyle = a.skin;
    }
    g.beginPath(); g.ellipse(cx, cy, r, r * 0.88, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    for (let e = 0; e < a.eyes; e++) {
      const ex = cx + (a.eyes === 1 ? 0 : (e / (a.eyes - 1) - 0.5) * (a.eyes === 3 ? 34 : 26)), er = a.eyes === 1 ? 13 : 9;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, cy - 6, er, 0, Math.PI * 2); g.fill(); g.lineWidth = 3; g.stroke();
      g.fillStyle = '#1b1430'; g.beginPath(); g.arc(ex + 2, cy - 5, er * 0.45, 0, Math.PI * 2); g.fill();
    }
    g.lineWidth = 4; g.beginPath(); g.arc(cx, cy + 8, 11, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.fillStyle = a.skin;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A saucer of cheering aliens holding up a sign (about 5 draw calls). */
function makeSaucer(THREE, i) {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.6, 0.45, 18), toon(THREE, '#b8c4d8'));
  inkOutline(THREE, hull, 1.06);
  group.add(hull);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.08, 6, 24), new THREE.MeshBasicMaterial({ color: ['#ffd84d', '#ff8be8', '#7ef5ff'][i % 3] }));
  rim.rotation.x = Math.PI / 2;
  group.add(rim);
  const crew = new THREE.Sprite(new THREE.SpriteMaterial({ map: crewTexture(THREE, i), transparent: true }));
  crew.scale.set(2.6, 1.3, 1);
  crew.position.y = 0.85;
  group.add(crew);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), new THREE.MeshBasicMaterial({ map: signTexture(THREE, SIGNS[i % SIGNS.length], ['#ffd84d', '#9dffcf', '#ff9bd0'][i % 3]) }));
  sign.position.set(0.9, 1.75, 0.1);
  group.add(sign);
  group.userData = { crew, sign, phase: i * 1.7 };
  return group;
}

/**
 * Cheering UFO spectators that leapfrog along the track. Call `update(frame)` each
 * frame with { distance, routeAt, now, z0 }.
 */
export function createSpectators(THREE, count = 5, spacing = 60) {
  const group = new THREE.Group();
  const saucers = Array.from({ length: count }, (_, i) => makeSaucer(THREE, i));
  saucers.forEach((s) => group.add(s));
  group.userData.update = ({ distance, routeAt, now, z0 = 4.7 }) => {
    saucers.forEach((s, i) => {
      const slot = Math.floor(distance / spacing) + i, along = slot * spacing + 30, c = routeAt(along);
      const side = slot % 2 ? 1 : -1, ahead = along - distance;
      s.position.set(c.x + side * (11 + (slot % 3) * 2.5), c.y + 3 + Math.sin(now * 0.002 + s.userData.phase) * 0.4, z0 - ahead);
      s.rotation.y = side * -0.5;
      s.rotation.z = Math.sin(now * 0.0016 + s.userData.phase) * 0.08;
      s.visible = ahead > 2 && ahead < 200;
      // Cheering: hop and wave the sign.
      s.userData.crew.position.y = 0.85 + Math.abs(Math.sin(now * 0.008 + i)) * 0.22;
      s.userData.sign.rotation.z = Math.sin(now * 0.006 + i) * 0.25;
    });
  };
  return group;
}

/** Gold cartoon crown for the race leader. */
export function makeCrown(THREE) {
  const group = new THREE.Group();
  const gold = toon(THREE, '#ffd84d');
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.28, 10, 1, true), gold);
  inkOutline(THREE, band, 1.08);
  group.add(band);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 5), gold);
    spike.position.set(Math.cos(a) * 0.36, 0.28, Math.sin(a) * 0.36);
    group.add(spike);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({ color: i % 2 ? '#7ef5ff' : '#ff8be8' }));
    gem.position.set(Math.cos(a) * 0.36, 0.46, Math.sin(a) * 0.36);
    group.add(gem);
  }
  group.visible = false;
  return group;
}
