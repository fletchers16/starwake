import { rimObject } from './rim.js';
/**
 * Named set pieces the race route flies through or past ("attractions").
 * Each world gets three, placed at fixed lap fractions so every pilot sees the
 * same landmarks at the same point of the lap. Landmarks are scenery only (no
 * collision) and keep a clear opening of radius >= 9 around the route, wider
 * than the ship's flight envelope (x ±5.4, y ±3.7).
 *
 * Local space: the route passes along -z through the origin; an object that
 * spans distance extends toward negative z.
 */

const Z0 = 4.7;
const glow = (THREE, color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
const solid = (THREE, color, emissive = '#000000', intensity = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, metalness: 0.6, roughness: 0.45, flatShading: true, ...extra });

function canvasTexture(THREE, w, h, draw, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const BUILDERS = {
  relay: (THREE, course) => [
    { at: 0.18, name: 'THE BROKEN HALO', build() {
      const g = new THREE.Group();
      const hull = solid(THREE, '#3a4c66', '#0f2038', 0.4);
      for (let i = 0; i < 7; i++) {
        if (i === 4) continue; // the broken section
        const seg = new THREE.Mesh(new THREE.TorusGeometry(15, 1.5, 8, 18, (Math.PI * 2) / 7 - 0.06), hull);
        seg.rotation.z = (i / 7) * Math.PI * 2;
        g.add(seg);
        const strip = new THREE.Mesh(new THREE.TorusGeometry(13.4, 0.12, 6, 18, (Math.PI * 2) / 7 - 0.06), glow(THREE, course.accent));
        strip.rotation.z = seg.rotation.z;
        g.add(strip);
      }
      for (let i = 0; i < 3; i++) {
        const shard = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.6), hull);
        shard.position.set(Math.cos(4.4 + i * 0.25) * (16 + i * 3), Math.sin(4.4 + i * 0.25) * (16 + i * 3), -i * 3);
        shard.rotation.set(i, i * 2, i * 0.5);
        g.add(shard);
      }
      g.userData.tick = (now) => { g.rotation.z = now * 0.00008; };
      return g;
    } },
    { at: 0.47, name: 'RELAY TUNNEL', build() {
      const g = new THREE.Group();
      const frameMat = solid(THREE, '#2b3a52', course.secondary, 0.25);
      for (let i = 0; i < 9; i++) {
        const hex = new THREE.Mesh(new THREE.TorusGeometry(11, 0.45, 4, 6), frameMat);
        hex.rotation.z = Math.PI / 6;
        hex.position.z = -i * 9;
        g.add(hex);
        const light = new THREE.Mesh(new THREE.TorusGeometry(10.4, 0.06, 4, 6), glow(THREE, i % 2 ? course.accent : '#ffffff', 0.85));
        light.rotation.z = Math.PI / 6;
        light.position.z = -i * 9;
        g.add(light);
      }
      for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 72), frameMat);
        rail.position.set(Math.cos(a) * 11, Math.sin(a) * 11, -36);
        g.add(rail);
      }
      return g;
    } },
    { at: 0.78, name: 'DOCKING SPIRE', build() {
      const g = new THREE.Group();
      const steel = solid(THREE, '#344660', '#0f2038', 0.35);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 70, 8), steel);
      tower.position.set(20, 0, -6);
      g.add(tower);
      for (const y of [-12, 0, 12]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(34, 0.9, 1.4), steel);
        arm.position.set(4, y + 10, -6);
        g.add(arm);
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), glow(THREE, '#ff5d7a'));
        beacon.position.set(-12, y + 10, -6);
        g.add(beacon);
      }
      const ringLight = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.15, 6, 32), glow(THREE, course.accent));
      ringLight.rotation.x = Math.PI / 2;
      ringLight.position.set(20, 22, -6);
      g.add(ringLight);
      return g;
    } },
  ],

  volcanic: (THREE) => [
    { at: 0.2, name: "PELE'S ARCH", build() {
      const g = new THREE.Group();
      const basalt = solid(THREE, '#3a302c', '#ff6a1a', 0.04, { roughness: 0.95 });
      const arch = new THREE.Mesh(new THREE.TorusGeometry(17, 3.2, 7, 24, Math.PI), basalt);
      arch.position.y = -6;
      g.add(arch);
      const seam = new THREE.Mesh(new THREE.TorusGeometry(14, 0.25, 6, 32, Math.PI), glow(THREE, '#ff7a2a'));
      seam.position.y = -6;
      g.add(seam);
      for (const side of [-1, 1]) {
        const foot = new THREE.Mesh(new THREE.DodecahedronGeometry(5, 0), basalt);
        foot.position.set(side * 17, -8, 0);
        g.add(foot);
      }
      return g;
    } },
    { at: 0.5, name: 'ERUPTION FIELD', build(ctx) {
      const g = new THREE.Group();
      const rock = solid(THREE, '#2b1712', '#3a0d04', 0.4, { roughness: 1 });
      const plumes = [];
      for (const side of [-1, 1]) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(12, 24, 9, 1, true), rock);
        cone.position.set(side * 26, -8, -20);
        g.add(cone);
        const mouth = new THREE.Mesh(new THREE.CircleGeometry(2.6, 16), glow(THREE, '#ffb347'));
        mouth.rotation.x = -Math.PI / 2;
        mouth.position.set(side * 26, 4, -20);
        g.add(mouth);
        for (let i = 0; i < 10; i++) {
          const blob = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.glow, color: i % 2 ? '#ff7a2a' : '#ffcc66', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
          blob.userData = { side, phase: i / 10 };
          g.add(blob);
          plumes.push(blob);
        }
      }
      g.userData.tick = (now) => plumes.forEach((b) => {
        const t = (now * 0.0004 + b.userData.phase) % 1;
        b.position.set(b.userData.side * 26 + Math.sin(t * 9) * 1.5, 5 + t * 26, -20);
        b.scale.setScalar(2 + t * 7);
        b.material.opacity = (1 - t) * 0.9;
      });
      return g;
    } },
    { at: 0.8, name: 'STORM CELL', build(ctx) {
      const g = new THREE.Group();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2, r = 14 + (i % 3) * 2;
        const cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.glow, color: '#4a2a3a', transparent: true, opacity: 0.85, depthWrite: false }));
        cloud.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.8, -(i % 6) * 8);
        cloud.scale.setScalar(14);
        g.add(cloud);
      }
      const boltGeom = new THREE.BufferGeometry();
      boltGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(10 * 3), 3));
      const bolt = new THREE.Line(boltGeom, new THREE.LineBasicMaterial({ color: '#f2e6ff', transparent: true, opacity: 0 }));
      bolt.frustumCulled = false;
      g.add(bolt);
      let next = 0;
      g.userData.tick = (now) => {
        if (now > next) {
          next = now + 500 + Math.random() * 900;
          const a = Math.random() * Math.PI * 2, attr = boltGeom.attributes.position;
          for (let k = 0; k < 10; k++) attr.setXYZ(k, Math.cos(a) * (15 - k * 1.2) + (Math.random() - 0.5) * 2, Math.sin(a) * (15 - k * 1.2) + (Math.random() - 0.5) * 2, -Math.random() * 30);
          attr.needsUpdate = true;
          bolt.userData.at = now;
        }
        bolt.material.opacity = Math.max(0, 1 - (now - (bolt.userData.at || 0)) / 160);
      };
      return g;
    } },
  ],

  ice: (THREE) => [
    { at: 0.22, name: 'CRYSTAL CATHEDRAL', build() {
      const g = new THREE.Group();
      const ice = solid(THREE, '#dff3ff', '#7cc4f0', 0.45, { metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.9 });
      for (let i = 0; i < 6; i++) {
        for (const side of [-1, 1]) {
          const spire = new THREE.Mesh(new THREE.ConeGeometry(2.2, 34, 5), ice);
          spire.position.set(side * 12, 6, -i * 10);
          spire.rotation.z = side * 0.42;
          g.add(spire);
        }
      }
      return g;
    } },
    { at: 0.5, name: 'METHANE FALLS', build() {
      const g = new THREE.Group();
      const tex = canvasTexture(THREE, 64, 256, (c, w, h) => {
        for (let x = 0; x < w; x += 2) { c.fillStyle = `rgba(255,${200 + Math.random() * 40},${140 + Math.random() * 40},${0.25 + Math.random() * 0.45})`; c.fillRect(x, 0, 2, h); }
      }, true);
      tex.repeat.set(3, 1);
      const fall = new THREE.Mesh(new THREE.PlaneGeometry(40, 46), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
      fall.position.set(-17, 6, -14);
      fall.rotation.y = Math.PI / 2;
      g.add(fall);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(12, 32), new THREE.MeshStandardMaterial({ color: '#3b2716', metalness: 0.9, roughness: 0.15 }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(-12, -11, -14);
      g.add(pool);
      g.userData.tick = (now) => { tex.offset.y = (now * 0.0006) % 1; };
      return g;
    } },
    { at: 0.78, name: 'FROZEN GATE', build() {
      const g = new THREE.Group();
      const ice = solid(THREE, '#cfe8ff', '#5a8db0', 0.4, { metalness: 0.1, roughness: 0.1 });
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 40, 6), ice);
        pillar.position.set(side * 13, 2, 0);
        g.add(pillar);
      }
      const span = new THREE.Mesh(new THREE.BoxGeometry(30, 2.6, 3.4), ice);
      span.position.y = 13;
      g.add(span);
      for (let i = 0; i < 9; i++) {
        const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3 + (i % 3) * 1.5, 5), ice);
        icicle.rotation.x = Math.PI;
        icicle.position.set(-11 + i * 2.7, 10.5 - (i % 3) * 0.7, 0);
        g.add(icicle);
      }
      return g;
    } },
  ],

  nebula: (THREE, course) => [
    { at: 0.2, name: 'THE EYE', build(ctx) {
      const g = new THREE.Group();
      const swirl = canvasTexture(THREE, 256, 256, (c, w) => {
        c.translate(w / 2, w / 2);
        for (let a = 0; a < 1400; a++) { const t = a / 1400, r = 60 + t * 68; c.fillStyle = `rgba(220,170,255,${0.5 * (1 - t)})`; c.beginPath(); c.arc(Math.cos(t * 30) * r, Math.sin(t * 30) * r, 2.2 * (1 - t) + 0.6, 0, 6.3); c.fill(); }
      });
      const disc = new THREE.Mesh(new THREE.RingGeometry(10, 26, 64), new THREE.MeshBasicMaterial({ map: swirl, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      g.add(disc);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(10, 0.18, 8, 72), glow(THREE, course.accent));
      g.add(rim);
      g.userData.tick = (now) => { disc.rotation.z = now * 0.0004; };
      return g;
    } },
    { at: 0.5, name: 'DUST PILLARS', build(ctx) {
      const g = new THREE.Group();
      for (const side of [-1, 1]) {
        for (let i = 0; i < 9; i++) {
          const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.glow, color: i % 2 ? course.secondary : '#7a4dff', transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
          puff.position.set(side * (20 + (i % 2) * 3), -14 + i * 5, -10 - (i % 3) * 4);
          puff.scale.setScalar(16);
          g.add(puff);
        }
      }
      return g;
    } },
    { at: 0.8, name: 'THE DERELICT', build() {
      const g = new THREE.Group();
      const hull = solid(THREE, '#3a3550', '#1a1030', 0.4);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, 60, 8, 1, false, 0, Math.PI * 1.5), hull);
      body.rotation.x = Math.PI / 2;
      body.position.set(18, 4, -24);
      g.add(body);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 10), hull);
      bridge.position.set(18, 11, -6);
      g.add(bridge);
      for (let i = 0; i < 5; i++) {
        const port = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 1.6), glow(THREE, i % 2 ? '#ff9d5c' : course.accent));
        port.position.set(12.6, 4, -6 - i * 8);
        g.add(port);
      }
      g.userData.tick = (now) => { g.rotation.z = Math.sin(now * 0.0002) * 0.04; };
      return g;
    } },
  ],

  earth: (THREE, course) => [
    { at: 0.22, name: 'ORBITAL STATION', build() {
      const g = new THREE.Group();
      const truss = solid(THREE, '#cfd6e2', '#22446e', 0.25, { metalness: 0.8 });
      const panel = new THREE.MeshStandardMaterial({ color: '#1d3d8a', emissive: '#0d2a66', emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.25 });
      const beam = new THREE.Mesh(new THREE.BoxGeometry(60, 1.2, 1.2), truss);
      beam.position.y = 12;
      g.add(beam);
      for (const x of [-26, -16, 16, 26]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 18), panel);
        wing.position.set(x, 12, 0);
        g.add(wing);
      }
      const module = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 14, 16), truss);
      module.rotation.z = Math.PI / 2;
      module.position.set(0, 16, 0);
      g.add(module);
      for (const side of [-1, 1]) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), glow(THREE, side < 0 ? '#ff5d5d' : '#5dff9a'));
        lamp.position.set(side * 30, 12, 0);
        g.add(lamp);
      }
      return g;
    } },
    { at: 0.5, name: 'AURORA CURTAIN', build() {
      const g = new THREE.Group();
      const tex = canvasTexture(THREE, 256, 64, (c, w, h) => {
        const grad = c.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(120,255,190,0)');
        grad.addColorStop(0.5, 'rgba(120,255,190,.7)');
        grad.addColorStop(1, 'rgba(120,160,255,0)');
        c.fillStyle = grad;
        c.fillRect(0, 0, w, h);
      });
      const curtains = [];
      for (let i = 0; i < 3; i++) {
        const curtain = new THREE.Mesh(new THREE.PlaneGeometry(80, 26, 40, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
        curtain.position.set(0, 8, -i * 14);
        g.add(curtain);
        curtains.push(curtain);
      }
      g.userData.tick = (now) => curtains.forEach((c, i) => {
        const pos = c.geometry.attributes.position;
        for (let k = 0; k < pos.count; k++) pos.setZ(k, Math.sin(pos.getX(k) * 0.12 + now * 0.0015 + i) * 2.5);
        pos.needsUpdate = true;
      });
      return g;
    } },
    { at: 0.8, name: 'SATELLITE SWARM', build() {
      const g = new THREE.Group();
      const body = solid(THREE, '#d6dbe4', '#22446e', 0.2, { metalness: 0.85 });
      const panel = new THREE.MeshStandardMaterial({ color: '#1d3d8a', emissive: '#0d2a66', emissiveIntensity: 0.6 });
      for (let i = 0; i < 14; i++) {
        const sat = new THREE.Group();
        sat.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 2), body));
        for (const side of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.4), panel); p.position.x = side * 2.3; sat.add(p); }
        const a = (i / 14) * Math.PI * 2, r = 13 + (i % 3) * 4;
        sat.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.7, -(i % 5) * 9);
        sat.rotation.set(i, i * 0.7, i * 0.3);
        g.add(sat);
      }
      g.userData.tick = (now) => { g.rotation.z = now * 0.00012; };
      return g;
    } },
  ],

  jupiter: (THREE, course) => [
    { at: 0.24, name: 'THE CASSINI GAP', build() {
      const g = new THREE.Group();
      const tex = canvasTexture(THREE, 512, 8, (c, w) => { for (let x = 0; x < w; x++) { c.fillStyle = `rgba(230,205,160,${0.35 + Math.random() * 0.55})`; c.fillRect(x, 0, 1, 8); } });
      for (const y of [-12, 12]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(90, 1.2, 70), new THREE.MeshStandardMaterial({ color: '#d9c49e', map: tex, roughness: 0.9, transparent: true, opacity: 0.85 }));
        wall.position.set(0, y, -40);
        g.add(wall);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(90, 0.12, 0.12), glow(THREE, course.accent));
        edge.position.set(0, y + (y < 0 ? 0.7 : -0.7), -5);
        g.add(edge);
      }
      return g;
    } },
    { at: 0.52, name: 'EUROPA FLYBY', build() {
      const g = new THREE.Group();
      const tex = canvasTexture(THREE, 512, 256, (c, w, h) => {
        c.fillStyle = '#e8e0d0';
        c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(150,80,50,.55)';
        for (let i = 0; i < 60; i++) { c.lineWidth = 1 + Math.random() * 2; c.beginPath(); let x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 120; y += (Math.random() - 0.5) * 40; c.lineTo(x, y); } c.stroke(); }
      });
      const moon = new THREE.Mesh(new THREE.SphereGeometry(22, 48, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
      moon.position.set(-42, 12, -30);
      g.add(moon);
      g.userData.tick = (now) => { moon.rotation.y = now * 0.00006; };
      return g;
    } },
    { at: 0.8, name: 'MAGNETIC ARC', build() {
      const g = new THREE.Group();
      const arcs = [];
      for (let i = 0; i < 4; i++) {
        const arc = new THREE.Mesh(new THREE.TorusGeometry(15 + i * 1.5, 0.22, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ color: i % 2 ? '#8ad8ff' : course.accent, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
        arc.position.set(0, -5, -i * 7);
        g.add(arc);
        arcs.push(arc);
      }
      g.userData.tick = (now) => arcs.forEach((a, i) => { a.material.opacity = 0.35 + 0.4 * Math.max(0, Math.sin(now * 0.004 - i)); });
      return g;
    } },
  ],
};

/**
 * Build this course's landmarks. Returns { objects, upcoming(distance, lapLength) }.
 * Each object positions itself in `userData.update(frame)`.
 */
export function buildLandmarks(THREE, course, ctx) {
  const specs = (BUILDERS[course?.kind] || BUILDERS.relay)(THREE, course);
  const objects = specs.map((spec) => {
    const object = rimObject(spec.build(ctx), { strength: 0.6 });
    object.userData.name = spec.name;
    object.userData.at = spec.at;
    object.traverse((o) => { o.frustumCulled = false; });
    const tick = object.userData.tick;
    object.userData.update = ({ distance, routeAt, lapLength = 940, now }) => {
      const base = spec.at * lapLength;
      const k = Math.ceil((distance - 70 - base) / lapLength);
      const along = k * lapLength + base, ahead = along - distance;
      object.visible = ahead < 320;
      if (!object.visible) return;
      const centre = routeAt(along);
      object.position.set(centre.x, centre.y, Z0 - ahead);
      tick?.(now);
    };
    return object;
  });
  return {
    objects,
    /** Nearest landmark ahead within `range` metres: { name, ahead, key }. */
    upcoming(distance, lapLength = 940, range = 140) {
      let best = null;
      for (const spec of specs) {
        const base = spec.at * lapLength;
        const k = Math.ceil((distance - base) / lapLength);
        const ahead = k * lapLength + base - distance;
        if (ahead >= 0 && ahead <= range && (!best || ahead < best.ahead)) best = { name: spec.name, ahead, key: `${spec.name}:${k}` };
      }
      return best;
    },
  };
}
