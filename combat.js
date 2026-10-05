/**
 * Battle racing (Mario Kart-style): item pods, laser blasters and NPC rivals.
 *
 * - "?" pods along the track hand out a random item; trailing racers get better
 *   ones (seekers), leaders get defensive ones (shields).
 * - Items: Laser Blaster (3 auto-aimed shots at the racer ahead), Comet Seeker
 *   (homes in on whoever is 1st), Bubble Shield (blocks one zap), Turbo Snack.
 * - A zap spins the target out (slow + dizzy for 1.2 s, combo lost) and the
 *   shooter steals ZAP_STEAL points from them. Zaps never cost hull.
 * - Sim pilots are NPC racers flown by cartoon aliens: they weave, grab pods,
 *   shoot back and can be shot. Their point swings are reported to the server
 *   so the final standings match what you saw.
 * - Bounty: the leader wears a crown, and zapping them steals double.
 * - Zap Frenzy: in the final 15 seconds every steal doubles again and sim pilots
 *   fire twice as often.
 * - Human rivals are zapped through the server (see `outgoingZaps` and
 *   `receiveZaps`); the hit plays out on the victim's screen.
 *
 * Positions use the race convention: an opponent `gap` metres ahead of the
 * player sits at z = Z0 - gap, offset from routeAt(d) by its lane x/y.
 */
import { ALIENS, makeAlienPilot, toon, inkOutline } from './aliens.js';
import { makeCrown } from './critters.js';

export const ZAP_STEAL = 150;
const FRENZY_SECONDS = 15;
const STUN = 1.2;
const Z0 = 4.7;

export const ITEMS = {
  blaster: { label: 'LASER BLASTER', icon: '⌁', ammo: 3, color: '#7ef5ff', tip: 'AUTO-AIMS AT THE RACER AHEAD' },
  seeker: { label: 'COMET SEEKER', icon: '☄', ammo: 1, color: '#ffd166', tip: 'HUNTS DOWN 1ST PLACE' },
  shield: { label: 'BUBBLE SHIELD', icon: '◯', ammo: 1, color: '#9dffcf', tip: 'BLOCKS ONE ZAP' },
  turbo: { label: 'TURBO SNACK', icon: '✸', ammo: 1, color: '#ff9bf0', tip: 'INSTANT BOOST' },
};

// Item odds for the leader and for last place; everyone else is blended between.
const ODDS_FRONT = { blaster: 0.5, shield: 0.35, turbo: 0.15, seeker: 0 };
const ODDS_BACK = { blaster: 0.3, shield: 0.08, turbo: 0.3, seeker: 0.32 };

function rollItem(placeFraction, rand = Math.random) {
  const w = Object.keys(ODDS_FRONT).map((k) => [k, ODDS_FRONT[k] + (ODDS_BACK[k] - ODDS_FRONT[k]) * placeFraction]);
  let pick = rand() * w.reduce((s, [, v]) => s + v, 0);
  for (const [k, v] of w) if ((pick -= v) <= 0) return k;
  return 'blaster';
}

/** Rainbow "?" pod texture, shared by every pod. */
let podTexture = null;
function makePodTexture(THREE) {
  if (podTexture) return podTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 128, 128);
  ['#ff6ad5', '#c774e8', '#94d0ff', '#8ff7a7', '#ffe66d'].forEach((col, i) => grad.addColorStop(i / 4, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  g.lineWidth = 10;
  g.strokeStyle = '#1b1430';
  g.strokeRect(5, 5, 118, 118);
  g.font = '900 92px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 12;
  g.strokeText('?', 64, 70);
  g.fillStyle = '#ffffff';
  g.fillText('?', 64, 70);
  podTexture = new THREE.CanvasTexture(c);
  podTexture.colorSpace = THREE.SRGBColorSpace;
  podTexture.userData.shared = true;
  return podTexture;
}

/** Item pod: a bobbing, spinning rainbow "?" box with an ink outline. */
export function makeItemPod(THREE) {
  const group = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 1.25), new THREE.MeshBasicMaterial({ map: makePodTexture(THREE) }));
  inkOutline(THREE, box, 1.1);
  group.add(box);
  const phase = Math.random() * 6.28;
  group.userData.animate = (now) => {
    box.rotation.set(now * 0.0015 + phase, now * 0.002 + phase, 0);
    box.position.y = Math.sin(now * 0.004 + phase) * 0.2;
    box.scale.setScalar(1 + Math.sin(now * 0.008 + phase) * 0.06);
  };
  return group;
}

/**
 * Cartoon pass for a built ship: toon materials in two tones, ink outlines on the
 * big parts, the glass canopy swapped for a fishbowl, and an alien pilot seated in it.
 * Returns { pilot }; `ship.userData.tick(now, dizzy)` animates the pilot.
 */
export function toonifyShip(THREE, ship, { color, alien = ALIENS[0], trimColor = '#2a2244' }) {
  if (ship.userData.toon) return { pilot: ship.userData.pilot };
  ship.userData.toon = true;
  const body = toon(THREE, color), trim = toon(THREE, trimColor);
  ship.traverse((o) => {
    if (o.isPointLight) { o.intensity = 0; return; }
    if (!o.isMesh || !o.material || o.userData.ink) return;
    if (o.material.isMeshPhysicalMaterial) { o.visible = false; return; }
    const glowy = o.material.isMeshBasicMaterial || (o.material.emissiveIntensity || 0) > 0.6;
    if (glowy) return;
    const bright = (o.material.color?.getHSL?.({}).l ?? 0.5) > 0.35;
    o.material.dispose?.();
    o.material = bright ? body : trim;
    o.geometry.computeBoundingSphere();
    if (o.geometry.boundingSphere.radius > 0.4) inkOutline(THREE, o, 1.06);
  });
  const pilot = makeAlienPilot(THREE, alien);
  // Oversized so the pilot reads from the chase camera.
  pilot.position.set(0, 0.74, -0.28);
  pilot.scale.setScalar(1.15);
  ship.add(pilot);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.52, 18, 12), new THREE.MeshBasicMaterial({ color: '#dffcff', transparent: true, opacity: 0.16, depthWrite: false }));
  bowl.position.copy(pilot.position);
  ship.add(bowl);
  ship.userData.pilot = pilot;
  ship.userData.tick = (now, dizzy) => pilot.userData.tick(now, dizzy);
  return { pilot };
}

function canvasSprite(THREE, draw, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createCombat(THREE, { world, getRoute, routeAt, makeShipMesh, ships, nameTag, glow, sfx, toast, onPlayerHit = () => {} }) {
  const starTex = new THREE.TextureLoader().load('/assets/kenney/particles/star_06.png');
  const reticleTex = canvasSprite(THREE, (g, s) => {
    g.strokeStyle = '#ffffff';
    g.lineWidth = 7;
    g.beginPath(); g.arc(s / 2, s / 2, s * 0.32, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      g.beginPath(); g.moveTo(s / 2 + Math.cos(a) * s * 0.2, s / 2 + Math.sin(a) * s * 0.2); g.lineTo(s / 2 + Math.cos(a) * s * 0.46, s / 2 + Math.sin(a) * s * 0.46); g.stroke();
    }
  });

  let racers = [];          // NPC sim pilots
  let externals = [];       // scripted opponents (challenge ghosts)
  let effects = [];         // beams, impact flashes, seekers
  let pods = [];            // pod distances (one lap)
  let zapCounts = {};       // human target id -> cumulative zaps we've landed
  let zapSeen = {};         // shooter id -> zaps on us already applied
  let paid = {};            // shooter id -> points we've actually lost to them (reported back)
  let credited = 0;         // points other humans have confirmed losing to us
  let lastPlayerHitByBot = -9;
  let rollTimer = 0;
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.75, 24, 16), new THREE.MeshBasicMaterial({ color: '#9dffcf', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
  const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.05, 6, 40), new THREE.MeshBasicMaterial({ color: '#d8fff0', transparent: true, opacity: 0.7, depthWrite: false }));
  shield.add(shieldRim);
  shield.visible = false;
  world.add(shield);
  const reticle = new THREE.Sprite(new THREE.SpriteMaterial({ map: reticleTex, color: '#7ef5ff', transparent: true, depthTest: false, depthWrite: false }));
  reticle.renderOrder = 30;
  reticle.visible = false;
  world.add(reticle);
  const playerStars = dizzyStars();
  world.add(playerStars);
  const crown = makeCrown(THREE);
  world.add(crown);
  let leaderId = null, frenzy = false;
  /** Steal multiplier against a target: ×2 on the crowned leader, ×2 during the frenzy. */
  // Steal: 6% of the target's score (at least ZAP_STEAL), ×2 on the crowned leader, ×2 in the frenzy.
  const steal = (id, score = 0) => Math.max(ZAP_STEAL, Math.round(score * 0.06)) * (id === leaderId ? 2 : 1) * (frenzy ? 2 : 1);

  function dizzyStars() {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: '#ffe66d', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.scale.setScalar(0.55);
      g.add(s);
    }
    g.visible = false;
    return g;
  }
  function tickStars(g, now, on, x, y, z) {
    g.visible = on;
    if (!on) return;
    g.position.set(x, y + 1.25, z);
    g.children.forEach((s, i) => { const a = now * 0.008 + (i * Math.PI * 2) / 3; s.position.set(Math.cos(a) * 0.7, Math.sin(a * 2) * 0.08, Math.sin(a) * 0.7); });
  }

  /** Recolour a ship into toon materials in its alien's colours and seat the pilot. */
  function makeNpcShip(index, { alien = ALIENS[index % ALIENS.length], color = alien.color, label = alien.name, shipDef = ships[(index + 1) % ships.length] } = {}) {
    const ship = makeShipMesh(shipDef);
    const { pilot } = toonifyShip(THREE, ship, { color, alien });
    const tag = nameTag(label, color);
    tag.position.set(0, 2.2, 0);
    ship.add(tag);
    ship.scale.multiplyScalar(0.92);
    world.add(ship);
    return { ship, pilot, tag, alien };
  }

  // Shared textures (glow, stars, reticle, pod) are never disposed; only per-object ones (name tags).
  const sharedMaps = new Set([glow, starTex, reticleTex]);
  function disposeObject(o) {
    world.remove(o);
    o.traverse((c) => {
      c.geometry?.dispose?.();
      if (c.material && !Array.isArray(c.material)) { if (c.material.map && !sharedMaps.has(c.material.map) && !c.material.map.userData?.shared) c.material.map.dispose(); c.material.dispose?.(); }
    });
  }
  const disposeStars = (g) => { world.remove(g); g.children.forEach((s) => s.material.dispose()); };

  // ---------- lifecycle ----------

  let field = () => 0;
  function start(r, { botPaces = [], botFinals = [], podDistances = [], fieldScore = null } = {}) {
    if (fieldScore) field = fieldScore;
    dispose();
    pods = podDistances.slice().sort((a, b) => a - b);
    racers = botPaces.map((pace, i) => {
      const view = makeNpcShip(i);
      return {
        id: `bot-${i}`, index: i, name: view.alien.name, color: view.alien.color, alien: view.alien, ...view,
        pace, profile: botFinals[i] || { base: 0, pace: 1 }, adj: 0,
        d: i % 2 ? 9 + i * 3 : -6 - i * 3, x: (i % 2 ? 1 : -1) * (1.8 + Math.floor(i / 2) * 1.3), y: 0,
        tx: 0, ty: 0, nextWeave: 0, stunUntil: -9, shieldUntil: -9, item: null, ammo: 0, cooldown: 2 + i, nextPod: 0, spin: 0,
        stars: (() => { const s = dizzyStars(); world.add(s); return s; })(),
      };
    });
    zapCounts = {};
    zapSeen = {};
    paid = {};
    credited = 0;
    lastPlayerHitByBot = -9;
    leaderId = null;
    frenzy = false;
    Object.assign(r, { item: null, ammo: 0, shieldUntil: -9, stunUntil: -9, zapPoints: 0, spin: 0, rolling: 0 });
  }

  function dispose() {
    for (const b of racers) { disposeObject(b.ship); disposeStars(b.stars); }
    for (const e of effects) disposeObject(e.mesh);
    for (const e of externals) { disposeObject(e.mesh); disposeStars(e.stars); }
    racers = [];
    effects = [];
    externals = [];
    shield.visible = reticle.visible = playerStars.visible = crown.visible = false;
  }

  /** Scripted opponent (e.g. a challenge ghost): { id, name, color, mesh, sample(t)->{d,x,y}, score(t), zappable }. */
  function addExternal(opponent) {
    if (!opponent.mesh) opponent.mesh = makeNpcShip(0, opponent.look || {}).ship;
    externals.push({ adj: 0, stunUntil: -9, spin: 0, stars: (() => { const s = dizzyStars(); world.add(s); return s; })(), ...opponent });
  }

  // ---------- helpers ----------

  // Rubber-banded to the human field (matches the server's scoreBots at the end of the heat).
  const liveBotScore = (b, r) => Math.max(0, Math.floor(0.55 * b.profile.pace * field(r) + 0.45 * b.profile.base * (r.time / r.duration) + b.adj));

  /** Everyone except the player, as targetable records with route distance d and lane x/y. */
  function opponents(r, rivals) {
    const list = racers.map((b) => ({ kind: 'bot', ref: b, id: b.id, name: b.name, d: b.d, x: b.x, y: b.y, score: liveBotScore(b, r) }));
    for (const e of externals) { const p = e.sample(r.time); list.push({ kind: 'ext', ref: e, id: e.id, name: e.name, d: p.d, x: p.x, y: p.y, score: Math.max(0, Math.floor(e.score(r.time) + e.adj)) }); }
    for (const h of rivals) list.push({ kind: 'human', ref: h, id: h.id, name: String(h.name || 'PILOT').toUpperCase(), d: h.shown ?? h.d, x: h.x, y: h.y, score: h.score || 0 });
    return list;
  }

  /** Nearest opponent ahead inside the blaster's aiming cone. */
  function lockTarget(from, list) {
    let best = null;
    for (const o of list) {
      const gap = o.d - from.d;
      if (gap < 3 || gap > 85) continue;
      if (Math.abs(o.x - from.x) > 3.2 + gap * 0.09 || Math.abs(o.y - from.y) > 2.6 + gap * 0.06) continue;
      if (!best || gap < best.d - from.d) best = o;
    }
    return best;
  }

  function worldPos(r, d, x, y) {
    const c = routeAt(d, getRoute());
    return new THREE.Vector3(c.x + x, c.y + y, Z0 - (d - r.distance));
  }

  function beam(from, to, color) {
    const len = from.distanceTo(to);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 6, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
    mesh.position.copy(from).lerp(to, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 5, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false }));
    mesh.add(core);
    world.add(mesh);
    effects.push({ mesh, life: 0.22, age: 0, fade: [mesh.material, core.material] });
    flash(to, color, 2.4);
  }

  function flash(at, color, size = 2) {
    const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    mesh.position.copy(at);
    mesh.scale.setScalar(size);
    world.add(mesh);
    effects.push({ mesh, life: 0.35, age: 0, grow: size * 1.8, fade: [mesh.material] });
  }

  // ---------- hits ----------

  function hitPlayer(r, shooterName, color) {
    if (r.time < r.shieldUntil) { r.shieldUntil = -9; sfx.pop?.(); toast('SHIELD POPPED', `BLOCKED ${shooterName}`); return 0; }
    const stolen = Math.min(steal('player', r.score), Math.max(0, Math.floor(r.score)));
    r.zapPoints -= stolen;
    r.stunUntil = r.time + STUN;
    r.combo = 0;
    sfx.zapped?.();
    toast(`ZAPPED BY ${shooterName}`, `−${stolen}${leaderId === 'player' ? ' · BOUNTY' : ''} · SPIN OUT`);
    onPlayerHit(color);
    return stolen;
  }

  function hitOpponent(r, target, shooter) {
    const t = target.ref;
    if (target.kind === 'bot') {
      if (r.time < t.shieldUntil) { t.shieldUntil = -9; return 0; }
      const live = liveBotScore(t, r), stolen = Math.min(steal(t.id, live), live);
      t.adj -= stolen;
      t.stunUntil = r.time + STUN;
      return stolen;
    }
    if (target.kind === 'ext') {
      if (!t.zappable) return 0;
      const live = Math.max(0, Math.floor(t.score(r.time) + t.adj)), stolen = Math.min(steal(t.id, live), live);
      t.adj -= stolen;
      t.stunUntil = r.time + STUN;
      return stolen;
    }
    // Human rival: the hit is resolved on their screen; we spin their ship locally.
    if (shooter === 'player') zapCounts[t.id] = (zapCounts[t.id] || 0) + 1;
    t.stunUntil = r.time + STUN;
    // The victim's client decides what it actually lost (shield, bounty, frenzy) and reports it
    // back through the server; we're credited in `receiveCredits`, so nothing is banked here.
    return 0;
  }

  // ---------- player actions ----------

  /** Player flew through a pod. placeFraction: 0 = leading, 1 = last. */
  function pickup(r, placeFraction) {
    if (r.item || r.rolling) return false;
    const item = rollItem(placeFraction);
    r.rolling = 0.75; // short slot-machine roll before the item lands
    r.pendingItem = item;
    return true;
  }

  function fire(r, rivals, shipPos) {
    if (!r.item || r.rolling || r.time < r.stunUntil) return;
    const kind = r.item, list = opponents(r, rivals), me = { d: r.distance, x: r.x, y: r.y };
    if (kind === 'blaster') {
      const target = lockTarget(me, list);
      const from = shipPos.clone().add(new THREE.Vector3(0, 0.2, -1.6));
      sfx.zap?.();
      if (target) {
        const stolen = hitOpponent(r, target, 'player');
        r.zapPoints += stolen;
        beam(from, worldPos(r, target.d, target.x, target.y), ITEMS.blaster.color);
        toast(`SNIPED ${target.name}!`, target.kind === 'human' ? 'STEALING…' : stolen ? `+${stolen} STOLEN${target.id === leaderId ? ' · BOUNTY ♛' : ''}` : 'SHIELD BLOCKED IT');
      } else {
        beam(from, worldPos(r, r.distance + 70, r.x, r.y), ITEMS.blaster.color);
      }
    } else if (kind === 'seeker') {
      const ranked = list.slice().sort((a, b) => b.score - a.score);
      const target = ranked[0];
      if (target) {
        sfx.zap?.();
        const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: ITEMS.seeker.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        mesh.scale.setScalar(1.6);
        world.add(mesh);
        effects.push({ mesh, life: 1.1, age: 0, seeker: { target, from: shipPos.clone() } });
        toast('COMET SEEKER', `HUNTING ${target.name}`);
      }
    } else if (kind === 'shield') {
      r.shieldUntil = r.time + 10;
      sfx.shield?.();
      toast('BUBBLE SHIELD', 'BLOCKS THE NEXT ZAP');
    } else if (kind === 'turbo') {
      r.starBoostUntil = Math.max(r.starBoostUntil || 0, r.time + 1.8);
      sfx.boost?.();
      toast('TURBO SNACK', 'NOM NOM · BOOST');
    }
    if (--r.ammo <= 0) r.item = null;
  }

  /** Blaster lock for the HUD reticle (null when nothing is in the cone). */
  function currentLock(r, rivals) {
    if (r.item !== 'blaster' || r.rolling) return null;
    return lockTarget({ d: r.distance, x: r.x, y: r.y }, opponents(r, rivals));
  }

  // ---------- simulation ----------

  function update(r, dt, rivals) {
    if (r.rolling) {
      r.rolling -= dt;
      rollTimer += dt;
      if (rollTimer > 0.09) { rollTimer = 0; sfx.roll?.(Math.floor(r.rolling * 30)); }
      if (r.rolling <= 0) {
        r.rolling = 0;
        r.item = r.pendingItem;
        r.ammo = ITEMS[r.item].ammo;
        sfx.item?.();
        toast(ITEMS[r.item].label, ITEMS[r.item].tip);
      }
    }
    if (!r.started) return;
    const lap = r.lapDistance;
    // Bounty leader and the final-seconds frenzy.
    let best = { id: 'player', score: r.score };
    for (const o of opponents(r, rivals)) if (o.score > best.score) best = o;
    if (best.id !== leaderId) {
      if (best.id === 'player' && leaderId) toast('YOU TOOK 1ST ♛', 'YOU WEAR THE BOUNTY · ZAPS ON YOU STEAL ×2');
      leaderId = best.id;
    }
    const nowFrenzy = r.duration - r.time <= FRENZY_SECONDS;
    if (nowFrenzy && !frenzy) { toast('ZAP FRENZY!', `FINAL ${FRENZY_SECONDS}s · EVERY STEAL ×2`); sfx.perfect?.(); }
    frenzy = nowFrenzy;
    for (const b of racers) {
      const stunned = r.time < b.stunUntil;
      // Rubber band: sim pilots close up when far behind you and ease off far ahead, so the pack stays a fight.
      const band = 1 + Math.max(-0.12, Math.min(0.14, (r.distance - b.d) / 140));
      b.d += dt * r.rate * b.pace * band * (stunned ? 0.35 : 1);
      if (r.time > b.nextWeave) { b.tx = (Math.random() - 0.5) * 8; b.ty = (Math.random() - 0.5) * 3.6; b.nextWeave = r.time + 1.4 + Math.random() * 2.2; }
      // Sidestep the player's ship (which sits ~2.4 m ahead of the track origin) instead of flying through it.
      const near = b.d - r.distance - 2.4;
      if (Math.abs(near) < 3.2 && Math.abs(b.x - r.x) < 2.4 && Math.abs(b.y - r.y) < 2) b.tx = r.x + (b.x >= r.x ? 3 : -3);
      b.x += (b.tx - b.x) * Math.min(1, dt * 1.6);
      b.y += (b.ty - b.y) * Math.min(1, dt * 1.6);
      b.spin = stunned ? (1 - (b.stunUntil - r.time) / STUN) * Math.PI * 4 : 0;
      // Pods: sim pilots grab items as they pass them (positions repeat every lap).
      if (pods.length) {
        const next = Math.floor(b.nextPod / pods.length) * lap + pods[b.nextPod % pods.length];
        if (b.d >= next) {
          b.nextPod++;
          if (!b.item && Math.random() < 0.7) { b.item = Math.random() < 0.78 ? 'blaster' : 'shield'; b.ammo = b.item === 'blaster' ? 2 : 1; }
        }
      }
      if (b.item === 'shield') { b.shieldUntil = r.time + 8; b.item = null; }
      b.cooldown -= dt * (frenzy ? 2 : 1);
      if (b.item === 'blaster' && b.cooldown <= 0 && !stunned) botShoot(r, b, rivals);
    }
    // Effects
    for (const e of effects) {
      e.age += dt;
      const k = Math.min(1, e.age / e.life);
      if (e.fade) e.fade.forEach((m) => { m.opacity = 1 - k; });
      if (e.grow) e.mesh.scale.setScalar(e.grow * (0.6 + k));
      if (e.seeker) {
        const t = e.seeker.target, to = worldPos(r, t.ref.d ?? t.d, t.ref.x ?? t.x, t.ref.y ?? t.y);
        const p = e.seeker.from.clone().lerp(to, k);
        p.y += Math.sin(k * Math.PI) * 4;
        e.mesh.position.copy(p);
        if (k >= 1 && !e.done) {
          e.done = true;
          const stolen = hitOpponent(r, t, 'player');
          r.zapPoints += stolen;
          flash(to, ITEMS.seeker.color, 4);
          sfx.zapped?.();
          toast(`COMET HIT ${t.name}`, t.kind === 'human' ? 'STEALING…' : stolen ? `+${stolen} STOLEN` : 'SHIELD BLOCKED IT');
        }
      }
    }
    effects = effects.filter((e) => { if (e.age < e.life) return true; disposeObject(e.mesh); return false; });
  }

  function botShoot(r, b, rivals) {
    const me = { d: b.d, x: b.x, y: b.y };
    const player = { kind: 'player', id: 'player', name: 'YOU', d: r.distance, x: r.x, y: r.y };
    const others = opponents(r, rivals).filter((o) => o.id !== b.id && o.kind !== 'human');
    const target = lockTarget(me, [player, ...others]);
    if (!target) return;
    // Fairness: you can be zapped by sim pilots at most once every 5 seconds.
    if (target.kind === 'player' && r.time - lastPlayerHitByBot < 5) return;
    b.cooldown = 2.4 + Math.random() * 1.6;
    const from = worldPos(r, b.d, b.x, b.y).add(new THREE.Vector3(0, 0.2, -1.4));
    beam(from, worldPos(r, target.d, target.x, target.y), b.color);
    if (target.kind === 'player') {
      lastPlayerHitByBot = r.time;
      b.adj += hitPlayer(r, b.name, b.color);
    } else {
      b.adj += hitOpponent(r, target, b.id);
    }
    if (--b.ammo <= 0) b.item = null;
  }

  // ---------- networking (human rivals) ----------

  /** Cumulative zap counts per human target, sent with every telemetry update. */
  const outgoingZaps = () => Object.entries(zapCounts).map(([target, count]) => ({ target, count }));

  /** Apply zaps other humans landed on us: [{ from, name, count }] (cumulative per shooter). */
  function receiveZaps(r, list = []) {
    for (const z of list) {
      const fresh = (Number(z.count) || 0) - (zapSeen[z.from] || 0);
      if (fresh <= 0) continue;
      zapSeen[z.from] = Number(z.count) || 0;
      if (r.started && !r.done) for (let k = 0; k < fresh; k++) paid[z.from] = (paid[z.from] || 0) + hitPlayer(r, String(z.name || 'RIVAL').toUpperCase(), '#ff7ca7');
    }
  }

  /** Points we've lost to each human shooter (cumulative), reported so they can be credited. */
  const outgoingPaid = () => Object.entries(paid).map(([to, amount]) => ({ to, amount }));

  /** Credit points other humans confirmed losing to our zaps: [{ from, name, amount }] (cumulative per victim). */
  function receiveCredits(r, list = []) {
    const total = list.reduce((sum, c) => sum + Math.max(0, Number(c.amount) || 0), 0);
    if (total > credited && !r.done) {
      const gained = total - credited;
      r.zapPoints += gained;
      toast('ZAP CONFIRMED', `+${gained} STOLEN`);
    }
    credited = Math.max(credited, total);
  }

  // ---------- rendering ----------

  function render(r, now, rivals, shipModel, rivalMeshes) {
    for (const b of racers) {
      const gap = b.d - r.distance, p = worldPos(r, b.d, b.x, b.y);
      b.ship.position.copy(p);
      b.ship.position.y += Math.sin(now * 0.004 + b.index) * 0.14;
      // Racers just behind you stay visible beside the ship, but never between the camera and the ship.
      b.ship.visible = gap > -1.5 && gap < 130;
      b.ship.rotation.z = -(b.tx - b.x) * 0.06 + b.spin;
      b.tag.visible = gap > 4 && r.started;
      const stunned = r.time < b.stunUntil;
      b.pilot.userData.tick(now, stunned);
      tickStars(b.stars, now, stunned && b.ship.visible, b.ship.position.x, b.ship.position.y, b.ship.position.z);
    }
    for (const e of externals) {
      const s = e.sample(r.time), gap = s.d - r.distance, stunned = r.time < e.stunUntil;
      e.mesh.position.copy(worldPos(r, s.d, s.x, s.y));
      e.mesh.visible = gap > -1.5 && gap < 140;
      e.mesh.rotation.z = stunned ? (1 - (e.stunUntil - r.time) / STUN) * Math.PI * 4 : 0;
      e.mesh.userData.tick?.(now, stunned);
      tickStars(e.stars, now, stunned && e.mesh.visible, e.mesh.position.x, e.mesh.position.y, e.mesh.position.z);
    }
    // Human rivals spin when our shot lands (purely visual on our side).
    for (const h of rivals) {
      const mesh = rivalMeshes.get(h.id);
      if (mesh && r.time < (h.stunUntil || -9)) mesh.rotation.z += 0.5;
    }
    // Player: spin-out, dizzy stars, shield bubble, blaster lock reticle.
    const stunned = r.time < r.stunUntil;
    r.spin = stunned ? (1 - (r.stunUntil - r.time) / STUN) * Math.PI * 4 : 0;
    shipModel.userData.tick?.(now, stunned);
    for (const h of rivals) rivalMeshes.get(h.id)?.userData.tick?.(now, r.time < (h.stunUntil || -9));
    tickStars(playerStars, now, stunned, shipModel.position.x, shipModel.position.y, shipModel.position.z);
    shield.visible = r.time < r.shieldUntil;
    if (shield.visible) {
      shield.position.copy(shipModel.position);
      const left = r.shieldUntil - r.time;
      shield.material.opacity = (left < 2 && Math.floor(now / 120) % 2) ? 0.08 : 0.22;
      shieldRim.rotation.set(now * 0.002, now * 0.003, 0);
    }
    // Crown over the leader.
    const leaderMesh = leaderId === 'player' ? shipModel : racers.find((b) => b.id === leaderId)?.ship || externals.find((e) => e.id === leaderId)?.mesh || rivalMeshes.get(leaderId);
    crown.visible = !!(r.started && leaderMesh?.visible);
    if (crown.visible) {
      crown.position.copy(leaderMesh.position);
      crown.position.y += 1.35 + Math.sin(now * 0.005) * 0.08;
      crown.rotation.y = now * 0.002;
    }
    const lock = currentLock(r, rivals);
    reticle.visible = !!lock;
    if (lock) {
      reticle.position.copy(worldPos(r, lock.d, lock.x, lock.y));
      reticle.scale.setScalar(2.2 + Math.sin(now * 0.012) * 0.2);
      reticle.material.rotation = now * 0.002;
    }
  }

  return {
    makeRacerMesh: (opts) => makeNpcShip(0, opts),
    start, dispose, addExternal, pickup, fire, update, render, currentLock,
    outgoingZaps, receiveZaps, outgoingPaid, receiveCredits,
    /** Live scores of sim pilots for standings. */
    botScores: (r) => racers.map((b) => ({ id: b.id, name: b.name, score: liveBotScore(b, r) })),
    externalScores: (r) => externals.map((e) => ({ id: e.id, name: e.name, score: Math.max(0, Math.floor(e.score(r.time) + e.adj)) })),
    /** Per-bot point swings from zaps this heat (reported to the server on completion). */
    botAdjust: () => racers.map((b) => Math.round(b.adj)),
    externalAdjust: () => externals.map((e) => Math.round(e.adj)),
    racerNames: () => racers.map((b) => b.name),
    isFrenzy: () => frenzy,
    leader: () => leaderId,
  };
}
