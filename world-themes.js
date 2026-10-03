import { createSkyline } from './skyline.js';
import { NOISE_GLSL, makeSwirlMaterial } from './swirl.js';
import { crystalCluster, rockSlab, volcano, gradient, roughen } from './shapes.js';
import { lavaCrustTexture, earthSurfaceTexture, earthCloudTexture, gasGiantTexture, moonTexture } from './textures.js';
import { rimColor, rimObject } from './rim.js';
import { createFogRamp } from './fog-ramp.js';
import { buildLandmarks } from './landmarks.js';
/**
 * Per-world environments: sky, fog, ground, and scrolling set pieces that make
 * each course look like its name.
 *
 * The race camera stays near z = 13 and the world scrolls toward it: an object
 * `ahead` metres down the course sits at z = 4.7 - ahead and follows the route
 * centre in x/y. Set pieces use the same convention via `routeAt(distance)`.
 *
 *   const env = createWorldEnvironment(THREE, scene);
 *   env.apply(course);                                   // on course change
 *   env.update({ distance, routeAt, cameraX, now, speed }); // every frame
 */

const Z0 = 4.7;
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function canvasTexture(THREE, width, height, draw, repeat = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Shared soft round sprite for glows, dust, and embers.
function glowTexture(THREE) {
  return canvasTexture(THREE, 64, 64, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
}

function cloudTexture(THREE, seed, colors) {
  return canvasTexture(THREE, 256, 256, (ctx, w) => {
    for (let i = 0; i < 26; i++) {
      const x = w * (0.2 + hash(seed + i) * 0.6), y = w * (0.2 + hash(seed + i * 3.1) * 0.6), r = w * (0.12 + hash(seed + i * 7.7) * 0.22);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, colors[i % colors.length]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.18 + hash(seed + i * 1.3) * 0.2;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, w);
    }
  });
}

/** Sky dome with a three-stop vertical gradient; ignores fog. */
function makeSky(THREE) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color('#050a16') },
      mid: { value: new THREE.Color('#0b1a33') },
      bottom: { value: new THREE.Color('#03060d') },
      flash: { value: 0 },
      uNebula: { value: 0 },
      uNebA: { value: new THREE.Color('#c06bff') },
      uNebB: { value: new THREE.Color('#3fb6ff') },
      uTime: { value: 0 },
      uGlow: { value: new THREE.Color('#000000') },
      uGlowStrength: { value: 0 },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `${NOISE_GLSL}
      uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform float flash; uniform float uNebula; uniform vec3 uNebA; uniform vec3 uNebB; uniform float uTime; uniform vec3 uGlow; uniform float uGlowStrength; varying vec3 vDir;
      void main(){ float y = vDir.y; vec3 c = y > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, y)) : mix(mid, bottom, smoothstep(0.0, 0.35, -y));
        if (uNebula > 0.0) {
          // Painted nebula: continuous fbm wisps across the whole sky instead of sprite blobs.
          vec3 p = vDir * 2.6 + vec3(0.0, 0.0, uTime * 0.008);
          float n = fbm3(p), hue = fbm3(p * 1.7 + 5.3), detail = fbm3(p * 4.1 + 9.1);
          float m = smoothstep(0.42, 0.78, n) * (0.6 + 0.6 * detail);
          c += mix(uNebB, uNebA, hue) * m * uNebula;
          c += mix(uNebA, vec3(1.0), 0.5) * smoothstep(0.7, 0.9, n * detail * 1.6) * 0.25 * uNebula;
        }
        // Horizon glow band gives each world a lit skyline instead of a black edge.
        c += uGlow * uGlowStrength * exp(-abs(y + 0.02) * 9.0);
        gl_FragColor = vec4(c + flash * vec3(0.55, 0.5, 0.75), 1.0); }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Pieces that live along the course: `count` items spaced `spacing` metres
 * apart, re-placed every frame relative to the route so they scroll past.
 * `place(i, slot, pos)` returns { x, y, z offsets, scale, rotY } for the slot.
 */
function makeTrackside(THREE, geometry, material, { count, spacing, behind = 2 }, place) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  // Start hidden: identity matrices would stack every instance at the origin, in front of the camera.
  for (let i = 0; i < count; i++) mesh.setMatrixAt(i, m.makeScale(0, 0, 0));
  mesh.userData.update = ({ distance, routeAt, cameraX = 0, cameraY = 0 }) => {
    const first = Math.floor(distance / spacing) - behind;
    for (let i = 0; i < count; i++) {
      const slot = first + i, along = slot * spacing, centre = routeAt(along), o = place(slot, centre);
      p.set(centre.x + o.x, centre.y + o.y, Z0 - (along - distance) + (o.z || 0));
      // Keep the flight corridor clear: on tight bends scenery can swing in front of the lens.
      const ahead = along - distance;
      if (ahead > -12 && ahead < 45 && Math.abs(p.x - cameraX) < 7 && Math.abs(p.y - cameraY) < 7) { mesh.setMatrixAt(i, m.makeScale(0, 0, 0)); continue; }
      e.set(o.rx || 0, o.ry || 0, o.rz || 0);
      q.setFromEuler(e);
      s.set(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1, o.sz ?? o.s ?? 1);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return mesh;
}

/** Drifting particles in a box around the camera that wrap as the ship flies. */
function makeParticles(THREE, texture, { count, color, size, opacity, spread = [60, 34, 170], fall = 0, additive = true }) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (hash(i * 1.7) - 0.5) * spread[0];
    positions[i * 3 + 1] = (hash(i * 2.9) - 0.5) * spread[1];
    positions[i * 3 + 2] = -hash(i * 4.1) * spread[2];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ map: texture, color, size, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true }));
  points.frustumCulled = false;
  const base = positions.slice();
  points.userData.update = ({ distance, cameraX, now }) => {
    const attr = geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      const z = ((base[i * 3 + 2] + distance) % spread[2] + spread[2]) % spread[2] - spread[2] + 14;
      const y = fall ? ((base[i * 3 + 1] - now * 0.001 * fall * (0.6 + hash(i) * 0.8)) % spread[1] + spread[1] * 1.5) % spread[1] - spread[1] / 2 : base[i * 3 + 1];
      attr.setXYZ(i, base[i * 3] + cameraX, y, z);
    }
    attr.needsUpdate = true;
  };
  return points;
}

/** Distant jagged ridgeline ring (mountains or cliffs) silhouetted against the horizon glow. */
function ridgeline(THREE, { color, radius = 190, base = -40, height = 34, seed = 1, segments = 160, glow = null }) {
  const pos = [], idx = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const n = Math.abs(Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 7.3 + seed * 2) * 0.3 + Math.sin(a * 17.1 + seed * 3) * 0.2);
    const top = base + height * (0.35 + 0.65 * n) * (0.7 + 0.3 * hash(i + seed));
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
    pos.push(x, base - 30, z, x, top, z);
    if (i < segments) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const colors = [];
  const dark = new THREE.Color(color), lit = new THREE.Color(glow || color);
  for (let i = 0; i < pos.length / 3; i++) { const c = i % 2 ? dark : lit.clone().lerp(dark, 0.4); colors.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false }));
  mesh.frustumCulled = false;
  return mesh;
}

/** Large sky object that tracks the camera so it reads as infinitely far away. */
function skyObject(object, offset, follow = 0.92) {
  object.userData.update = ({ cameraX, cameraY }) => object.position.set(offset[0] + cameraX * follow, offset[1] + cameraY * follow * 0.6, offset[2]);
  object.traverse((o) => { if (o.material) { o.material.fog = false; if (o.material.transparent) o.material.depthWrite = false; } });
  object.renderOrder = -5;
  return object;
}

/** Scrolling ground plane (lava sea, cloud deck) at a fixed altitude. */
function groundPlane(THREE, material, y, uvScale = 0.02) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.update = ({ distance, cameraX }) => {
    mesh.position.set(cameraX, y, -150);
    if (material.map) material.map.offset.set(cameraX * uvScale * 0.1, distance * uvScale * 0.1);
    if (material.emissiveMap) material.emissiveMap.offset.copy(material.map.offset);
  };
  return mesh;
}

const THEMES = {
  relay: {
    horizonGlow: ['#1c6fd0', 0.3],
    nebula: { strength: 0.35, a: '#2a62d8', b: '#18c9b2' },
    fogRamp: ['#1b6f8a', '#16305a'],
    sky: ['#040a18', '#0d2244', '#02050b'], fog: ['#0a1a33', 34, 165], stars: 1,
    build(THREE, ctx) {
      const steel = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, metalness: 0.7, roughness: 0.4, emissive: '#0e1c30', flatShading: true });
      const beamGeo = gradient(new THREE.BoxGeometry(0.9, 20, 0.9), '#1c2840', '#6f8bb4', 0.8);
      const neon = new THREE.MeshBasicMaterial({ color: ctx.course.accent });
      const sideX = (slot) => (slot % 2 ? 1 : -1) * (11.5 + hash(slot * 3) * 4);
      // Lattice pylons of the abandoned relay along both sides, some snapped off.
      const pylon = (slot) => {
        const broken = hash(slot) < 0.22, side = slot % 2 ? 1 : -1;
        return { x: sideX(slot), y: broken ? -9 : -1, rz: side * (0.08 + hash(slot * 5) * 0.22), sy: broken ? 0.45 : 1 };
      };
      const beams = makeTrackside(THREE, beamGeo, steel, { count: 34, spacing: 8 }, pylon);
      const strips = makeTrackside(THREE, new THREE.BoxGeometry(0.16, 20, 0.16), neon, { count: 34, spacing: 8 }, (slot) => ({ ...pylon(slot), z: 0.5 }));
      // Overhead gantries spanning the route, with gaps where they have fallen.
      const cross = makeTrackside(THREE, gradient(new THREE.BoxGeometry(28, 0.7, 0.9), '#334866', '#7a96bf'), steel, { count: 12, spacing: 24 }, (slot) => ({ x: (hash(slot) - 0.5) * 3, y: 8.5 + hash(slot * 2) * 2, rz: (hash(slot * 7) - 0.5) * 0.25, s: hash(slot * 9) < 0.3 ? 0 : 1 }));
      const crossGlow = makeTrackside(THREE, new THREE.BoxGeometry(28, 0.12, 0.12), neon, { count: 12, spacing: 24 }, (slot) => ({ x: (hash(slot) - 0.5) * 3, y: 8 + hash(slot * 2) * 2, z: 0.5, rz: (hash(slot * 7) - 0.5) * 0.25, s: hash(slot * 9) < 0.3 ? 0 : 1 }));
      // The broken transit spine running alongside.
      const spine = makeTrackside(THREE, gradient(new THREE.CylinderGeometry(1.6, 1.6, 15, 10, 1, true).rotateX(Math.PI / 2).rotateX(-Math.PI / 2), '#22304a', '#5f7aa3'), steel, { count: 14, spacing: 17 }, (slot) => ({ x: -19 + Math.sin(slot * 0.4) * 2, y: 5, rx: Math.PI / 2, rz: (hash(slot) - 0.5) * 0.25, s: hash(slot * 4) < 0.18 ? 0 : 1 }));
      const beacons = makeTrackside(THREE, new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: '#bff6ff' }), { count: 34, spacing: 8 }, (slot) => ({ x: sideX(slot), y: 9, s: hash(slot) < 0.22 ? 0 : 1 }));
      ctx.blink = beacons;
      const glowCloud = skyObject(new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTexture(THREE, 7, [ctx.course.secondary, ctx.course.accent]), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })), [-30, 30, -200], 0.9);
      glowCloud.scale.set(260, 180, 1);
      const debris = makeParticles(THREE, ctx.glow, { count: 160, color: '#8fc3ff', size: 0.45, opacity: 0.6 });
      // Distant megastructure city and broken orbital ring (Kenney Space Kit, CC0).
      const skyline = skyObject(createSkyline(THREE, { accent: ctx.course.accent, glowTexture: ctx.glow }), [0, 0, -150], 0.9);
      ctx.skyline = skyline;
      return [beams, strips, cross, crossGlow, spine, beacons, glowCloud, debris, skyline];
    },
    tick(ctx, { now }) {
      if (ctx.blink) ctx.blink.material.color.set(Math.sin(now * 0.006) > 0.2 ? '#bff6ff' : '#14243a');
      ctx.skyline?.userData.tick(now);
    },
  },

  volcanic: {
    horizonGlow: ['#ff5a1f', 0.6],
    fogRamp: ['#c2481c', '#5a1a16'],
    sky: ['#0d0408', '#4a1410', '#ff6a1c'], fog: ['#3a120e', 22, 150], stars: 0.25,
    build(THREE, ctx) {
      // Seamless lava crust (Voronoi plates + glowing seams); no mirroring needed.
      const lava = lavaCrustTexture(THREE);
      lava.repeat.set(6, 6);
      const sea = groundPlane(THREE, new THREE.MeshStandardMaterial({ color: '#2a0d08', map: lava, emissive: '#ffffff', emissiveMap: lava, emissiveIntensity: 1.25, roughness: 0.9 }), -15, 0.05);
      const rock = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.95, flatShading: true, emissive: '#3a0d04', emissiveIntensity: 0.4 });
      const volcanoes = makeTrackside(THREE, volcano(9, 22, 5), rock, { count: 12, spacing: 32 }, (slot) => {
        const side = slot % 2 ? 1 : -1;
        return { x: side * (34 + hash(slot) * 20), y: -6 + hash(slot * 2) * 4, s: 0.6 + hash(slot * 3) * 0.8, ry: hash(slot) * 6 };
      });
      const plumeMat = new THREE.SpriteMaterial({ map: ctx.glow, color: '#ff7a2a', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
      const plumes = new THREE.Group();
      for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(plumeMat); s.scale.set(16, 30, 1); plumes.add(s); }
      plumes.userData.update = ({ distance, routeAt }) => {
        plumes.children.forEach((s, i) => {
          const slot = Math.floor(distance / 64) + i - 1, along = slot * 64 + 20, c = routeAt(along), side = slot % 2 ? 1 : -1;
          s.position.set(c.x + side * (36 + hash(slot) * 18), 6, Z0 - (along - distance));
        });
      };
      const ash = makeParticles(THREE, ctx.glow, { count: 260, color: '#9a8478', size: 0.28, opacity: 0.55, fall: 4, additive: false });
      const embers = makeParticles(THREE, ctx.glow, { count: 120, color: '#ff8a2a', size: 0.35, opacity: 0.9, fall: -3 });
      // Jupiter looms over Io.
      const jupiter = skyObject(new THREE.Mesh(new THREE.SphereGeometry(48, 40, 24), new THREE.MeshBasicMaterial({ map: gasGiantTexture(THREE, ['#a5674a', '#e0b07c', '#c48a62', '#f0d2a4'], { storm: { u: 0.66, v: 0.62, rx: 0.07, ry: 0.06, color: '#b0503a' } }), transparent: true, opacity: 0.55 })), [55, 70, -190]);
      const boltGeometry = new THREE.BufferGeometry();
      boltGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(32 * 3), 3));
      const bolt = new THREE.Line(boltGeometry, new THREE.LineBasicMaterial({ color: '#f4e8ff', transparent: true, opacity: 0, fog: false }));
      bolt.frustumCulled = false;
      ctx.bolt = bolt;
      ctx.nextBolt = 0;
      // Dark volcanic ranges on the horizon, lit from below by the lava glow.
      const ridges = skyObject(ridgeline(THREE, { color: '#140806', glow: '#7a2410', base: -40, height: 58, seed: 3 }), [0, 0, 0], 1);
      return [sea, volcanoes, plumes, ash, embers, jupiter, bolt, ridges];
    },
    tick(ctx, { now, cameraX }, THREE) {
      const flash = Math.max(0, 1 - (now - ctx.boltAt) / 180);
      ctx.sky.material.uniforms.flash.value = flash * 0.5;
      ctx.bolt.material.opacity = flash;
      if (now > ctx.nextBolt) {
        ctx.boltAt = now;
        ctx.nextBolt = now + 1800 + Math.random() * 3800;
        const pts = [];
        let x = cameraX + (Math.random() - 0.5) * 80, y = 40;
        while (y > -12) { pts.push(new THREE.Vector3(x, y, -120)); x += (Math.random() - 0.5) * 9; y -= 3 + Math.random() * 5; }
        // Fixed-size buffer: bolts vary in length, so draw only the points used.
        const attr = ctx.bolt.geometry.attributes.position, count = Math.min(32, pts.length);
        for (let i = 0; i < count; i++) attr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
        attr.needsUpdate = true;
        ctx.bolt.geometry.setDrawRange(0, count);
        ctx.bolt.geometry.computeBoundingSphere();
      }
    },
  },

  ice: {
    horizonGlow: ['#ffc070', 0.22],
    fogRamp: ['#e6ad68', '#bb7c44'],
    sky: ['#4a3420', '#c08447', '#6b4a2c'], fog: ['#a8743f', 10, 118], stars: 0,
    build(THREE, ctx) {
      const ice = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, metalness: 0.1, roughness: 0.15, emissive: '#3d6f94', emissiveIntensity: 0.25, flatShading: true });
      // Crystal clusters with a deep-blue base fading to frosted tips (replaces single-colour cones).
      const crystal = gradient(crystalCluster(7, 5).scale(10, 14, 10).translate(0, -7, 0), '#4f7fa8', '#f4fbff', 0.8);
      const slab = gradient(rockSlab(8, 30, 14, 3), '#5b4334', '#b08a66', 1.2);
      // Canal walls of ice spires on both sides.
      const spires = makeTrackside(THREE, crystal, ice, { count: 56, spacing: 5 }, (slot) => {
        const side = slot % 2 ? 1 : -1;
        return { x: side * (12.5 + hash(slot) * 5), y: -6 + hash(slot * 2) * 3, s: 0.6 + hash(slot * 3) * 1.1, rz: side * -(0.05 + hash(slot * 4) * 0.25), ry: hash(slot) * 6 };
      });
      const cliffs = makeTrackside(THREE, slab, new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 1, flatShading: true }), { count: 24, spacing: 12 }, (slot) => {
        const side = slot % 2 ? 1 : -1;
        return { x: side * (22 + hash(slot) * 4), y: -4, ry: hash(slot) * 0.5, rz: side * 0.08 };
      });
      // Liquid methane canal below.
      const canal = groundPlane(THREE, new THREE.MeshStandardMaterial({ color: '#2b1d14', metalness: 0.9, roughness: 0.18 }), -12);
      const haze = makeParticles(THREE, ctx.glow, { count: 160, color: '#ffd29a', size: 2.6, opacity: 0.12, additive: false });
      const snow = makeParticles(THREE, ctx.glow, { count: 220, color: '#fff3dc', size: 0.16, opacity: 0.8, fall: 1.5, additive: false });
      // Saturn, faint through the haze.
      const saturn = new THREE.Group();
      saturn.add(new THREE.Mesh(new THREE.SphereGeometry(26, 32, 20), new THREE.MeshBasicMaterial({ map: gasGiantTexture(THREE, ['#e8cf9a', '#d6b47a', '#f2e0b4'], { seed: 41 }), transparent: true, opacity: 0.32 })));
      const ring = new THREE.Mesh(new THREE.RingGeometry(34, 52, 64), new THREE.MeshBasicMaterial({ color: '#f2dfb2', transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
      ring.rotation.x = 1.25;
      saturn.add(ring);
      saturn.rotation.z = 0.35;
      // Hazy far cliffs so the canyon opens onto a skyline, not a flat haze.
      const ridges = skyObject(ridgeline(THREE, { color: '#7d5634', glow: '#a8743f', base: -30, height: 62, seed: 9 }), [0, 0, 0], 1);
      return [spires, cliffs, canal, haze, snow, skyObject(saturn, [-60, 58, -190]), ridges];
    },
  },

  nebula: {
    nebula: { strength: 1, a: '#c06bff', b: '#3fb6ff' },
    fogRamp: ['#7a3fb0', '#3a1a66'],
    sky: ['#0a0620', '#2a1252', '#08051a'], fog: ['#1d0f38', 32, 165], stars: 1,
    build(THREE, ctx) {
      const colors = [ctx.course.accent, ctx.course.secondary, '#ff7ac8', '#6a4dff'];
      // Mid-distance dust clouds: Kenney smoke sprites, scattered with random rotation and size (no grid).
      const clouds = new THREE.Group();
      for (let i = 0; i < 22; i++) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.smoke, color: colors[i % colors.length], transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, rotation: hash(i * 5) * Math.PI * 2 }));
        sprite.userData = { x: (hash(i) - 0.5) * 220, y: (hash(i * 2) - 0.5) * 100, z: -40 - hash(i * 3) * 160, s: 30 + Math.pow(hash(i * 4), 2) * 110 };
        sprite.scale.setScalar(sprite.userData.s);
        clouds.add(sprite);
      }
      clouds.userData.update = ({ distance, cameraX, cameraY }) => clouds.children.forEach((s) => {
        const u = s.userData, z = ((u.z + distance * 0.25) % 200 + 200) % 200 - 200;
        s.position.set(u.x + cameraX * 0.8, u.y + cameraY * 0.5, z);
        s.material.opacity = 0.32 * Math.min(1, (200 + z) / 60);
      });
      // Gravity-well vortex far ahead: animated swirl shader instead of a flat drawn spiral.
      const swirl = makeSwirlMaterial(THREE, { colorA: ctx.course.accent, colorB: ctx.course.secondary, outer: 46, inner: 0.06, intensity: 0.9 });
      const vortex = skyObject(new THREE.Mesh(new THREE.CircleGeometry(46, 96), swirl), [10, 18, -195], 0.95);
      ctx.vortex = vortex;
      ctx.swirl = swirl;
      const rockGeo = gradient(roughen(new THREE.DodecahedronGeometry(2.2, 1), 0.7, 51), '#3a2f58', '#9a84c8', 1);
      const rocks = makeTrackside(THREE, rockGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.85, flatShading: true }), { count: 30, spacing: 11 }, (slot) => {
        const side = slot % 2 ? 1 : -1;
        return { x: side * (16 + hash(slot) * 22), y: (hash(slot * 2) - 0.5) * 26, s: 0.5 + hash(slot * 3) * 1.6, rx: slot, ry: slot * 0.7 };
      });
      const dust = makeParticles(THREE, ctx.glow, { count: 220, color: '#e2b8ff', size: 0.4, opacity: 0.55 });
      return [clouds, vortex, rocks, dust];
    },
    tick(ctx, { now }) { if (ctx.swirl) ctx.swirl.uniforms.uTime.value = now * 0.001; },
  },

  earth: {
    horizonGlow: ['#3f9cff', 0.35],
    fogRamp: ['#3f86c7', '#173e70'],
    sky: ['#010208', '#0c2a55', '#2a7cc4'], fog: ['#0b1e3a', 50, 190], stars: 1,
    build(THREE) {
      // A huge curved Earth below: the route rides low orbit above it.
      const planet = new THREE.Group();
      // Unlit: the race's local point lights would otherwise pool bright cyan on the surface under the ship.
      // Lit only by the Sun (a fixed direction toward the sun sprite): a real day side and soft terminator,
      // and immune to the race's local point lights, which pooled bright cyan on a standard material.
      planet.add(new THREE.Mesh(new THREE.SphereGeometry(150, 72, 48), new THREE.ShaderMaterial({
        fog: false,
        uniforms: { map: { value: earthSurfaceTexture(THREE) }, sun: { value: new THREE.Vector3(0.32, 0.86, -0.43).normalize() } },
        vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
        // Day side lit by the Sun, a warm terminator, city lights on the night-side land, sun glint on the oceans
        // and a blue atmospheric haze toward the limb, so it reads as Earth at a glance.
        fragmentShader: `uniform sampler2D map; uniform vec3 sun; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main(){
            vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
            // Only a sliver of the globe is ever on screen, so the (seamless) map repeats 3x around it.
            vec3 c = texture2D(map, vec2(vUv.x * 3.0, vUv.y)).rgb;
            float ndl = dot(n, sun);
            float day = smoothstep(-0.12, 0.35, ndl);
            float land = smoothstep(0.0, 0.06, c.g - c.b);
            vec3 col = c * (0.05 + 1.15 * day);
            col += vec3(1.0, 0.45, 0.18) * 0.22 * exp(-pow(ndl * 7.0, 2.0));
            float city = step(0.86, h(floor(vUv * vec2(900.0, 450.0)))) * land * (1.0 - smoothstep(-0.25, 0.02, ndl));
            col += vec3(1.0, 0.78, 0.42) * city * 0.9;
            col += vec3(1.0, 0.95, 0.85) * pow(max(dot(reflect(-sun, n), v), 0.0), 160.0) * (1.0 - land) * day * 0.35;
            float limb = pow(1.0 - max(dot(n, v), 0.0), 8.0);
            col = mix(col, vec3(0.35, 0.65, 1.0) * (0.25 + day), limb * 0.55);
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      })));
      // Soft cloud layer on its own sphere so it can drift over the continents.
      const clouds = new THREE.Mesh(new THREE.SphereGeometry(151.5, 72, 48), new THREE.MeshBasicMaterial({ map: earthCloudTexture(THREE), transparent: true, depthWrite: false, opacity: 0.9 }));
      planet.add(clouds);
      planet.userData.clouds = clouds;
      // Pole along the x axis: the equator runs under the route, and spinning about the pole rolls the surface toward the camera.
      planet.children.forEach((child) => { child.rotation.order = 'ZYX'; child.rotation.z = Math.PI / 2; });
      planet.add(new THREE.Mesh(new THREE.SphereGeometry(155, 72, 48), new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
        vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
        fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float r = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(vec3(0.35,0.7,1.0)*r*1.6, r); }',
      })));
      planet.rotation.z = 0.12;
      const earth = skyObject(planet, [0, -182, -95], 1);
      earth.userData.spin = planet;
      const sun = skyObject(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(THREE), color: '#fff2d0', transparent: true, blending: THREE.AdditiveBlending })), [70, 6, -190]);
      sun.scale.set(60, 60, 1);
      const panel = new THREE.MeshStandardMaterial({ color: '#1d3d7a', metalness: 0.7, roughness: 0.3, emissive: '#0b2a66' });
      const sats = makeTrackside(THREE, new THREE.BoxGeometry(5, 0.15, 1.6), panel, { count: 10, spacing: 40 }, (slot) => ({ x: (slot % 2 ? 1 : -1) * (18 + hash(slot) * 14), y: 4 + hash(slot * 2) * 10, ry: slot, rz: slot * 0.3 }));
      // The Moon hangs in the upper sky so the frame above the planet isn't empty black.
      const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 40, 24), (() => { const t = moonTexture(THREE); return new THREE.MeshStandardMaterial({ map: t, roughness: 1, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.7 }); })());
      const moonObj = skyObject(moon, [-48, 44, -170]);
      return [earth, sun, sats, moonObj];
    },
    tick(ctx, { now }) {
      const planet = ctx.pieces[0].userData.spin;
      // Fast enough that continents visibly roll by beneath the route.
      planet.children[0].rotation.y = -now * 0.00004;
      if (planet.userData.clouds) planet.userData.clouds.rotation.y = -now * 0.00003;
    },
  },

  jupiter: {
    horizonGlow: ['#d07436', 0.28],
    fogRamp: ['#b9814f', '#5a3a24'],
    sky: ['#070504', '#2a1a10', '#140c08'], fog: ['#24170f', 44, 180], stars: 0.8,
    build(THREE, ctx) {
      // Jupiter fills the sky, with its ring plane sweeping across.
      const giant = new THREE.Group();
      giant.add(new THREE.Mesh(new THREE.SphereGeometry(95, 64, 40), new THREE.MeshStandardMaterial({ map: gasGiantTexture(THREE, ['#8f563c', '#e3b47a', '#c58d63', '#f1d6a8', '#a86a48', '#d9a777'], { storm: { u: 0.66, v: 0.62, rx: 0.07, ry: 0.06, color: '#b5482f' } }), roughness: 0.9, emissive: '#3a1c10', emissiveIntensity: 0.5 })));
      giant.rotation.z = -0.18;
      // The planet sits on the ring plane (equator at y=-9) with its ring centred on it, so the ring's gap hugs the planet.
      const planet = skyObject(giant, [-60, -9, -230], 0.92);
      planet.userData.spin = giant.children[0];
      const ringTex = canvasTexture(THREE, 512, 8, (c, w) => { for (let x = 0; x < w; x++) { c.fillStyle = `rgba(230,205,160,${0.5 + hash(x * 0.37) * 0.45 * (Math.sin(x * 0.09) * 0.5 + 0.5)})`; c.fillRect(x, 0, 1, 8); } });
      const rings = new THREE.Mesh(new THREE.RingGeometry(112, 300, 160, 1), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      const uv = rings.geometry.attributes.uv, pos = rings.geometry.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < uv.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - 112) / 188, 0.5); }
      rings.rotation.x = -Math.PI / 2 + 0.06;
      const ringPlane = skyObject(rings, [-60, -9, -230], 0.92);
      // Ring particles the route skims through.
      const ringDust = makeParticles(THREE, ctx.glow, { count: 340, color: '#f0d8b0', size: 0.32, opacity: 0.7, spread: [90, 3.5, 170], additive: false });
      ringDust.position.y = -7;
      const chunks = makeTrackside(THREE, new THREE.IcosahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: '#cbb592', roughness: 0.8, flatShading: true }), { count: 40, spacing: 7 }, (slot) => ({ x: (hash(slot) - 0.5) * 60, y: -8 + (hash(slot * 2) - 0.5) * 2, s: 0.3 + hash(slot * 3) * 1.2, rx: slot, ry: slot * 1.3 }));
      return [planet, ringPlane, ringDust, chunks];
    },
    tick(ctx, { now }) { ctx.pieces[0].userData.spin.rotation.y = now * 0.00002; },
  },
};

export function createWorldEnvironment(THREE, scene) {
  const root = new THREE.Group();
  root.name = 'world-environment';
  scene.add(root);
  const sky = makeSky(THREE);
  root.add(sky);
  const glow = glowTexture(THREE);
  // Kenney Particle Pack smoke (CC0), shared by every world that needs soft clouds.
  const smoke = new THREE.TextureLoader().load('/assets/kenney/particles/smoke_04.png');
  smoke.colorSpace = THREE.SRGBColorSpace;
  const fogRamp = createFogRamp(THREE);
  let ctx = null;
  let lastPatch = 0;

  function clear() {
    if (!ctx) return;
    for (const piece of ctx.pieces) {
      root.remove(piece);
      piece.traverse((o) => {
        o.geometry?.dispose();
        for (const mat of [].concat(o.material || [])) { if (mat.map && mat.map !== glow && mat.map !== smoke) mat.map.dispose(); mat.dispose(); }
      });
    }
    ctx = null;
  }

  return {
    /** Build the environment for a course; returns { starOpacity } for the caller. */
    apply(course) {
      const theme = THEMES[course?.kind] || THEMES.relay;
      const key = `${course?.id}:${course?.accent}:${course?.fog}`;
      if (ctx?.key === key) {
        if (scene.fog) scene.fog.color.copy(ctx.fogColor);
        return ctx.look;
      }
      clear();
      ctx = { course, glow, smoke, sky, theme, boltAt: -1e9 };
      ctx.pieces = theme.build(THREE, ctx);
      ctx.pieces.forEach((piece) => { root.add(piece); rimObject(piece, { strength: 0.45 }); });
      // Named attractions the route flies through (see landmarks.js).
      ctx.landmarks = buildLandmarks(THREE, course, ctx);
      ctx.landmarks.objects.forEach((object) => { root.add(object); ctx.pieces.push(object); });
      const [top, mid, bottom] = theme.sky;
      // Forged courses keep the world's look but take their own palette.
      sky.material.uniforms.top.value.set(course?.forged ? course.sky : top);
      sky.material.uniforms.mid.value.set(course?.forged ? course.fog : mid);
      sky.material.uniforms.bottom.value.set(bottom);
      sky.material.uniforms.uNebula.value = theme.nebula?.strength || 0;
      sky.material.uniforms.uGlow.value.set(theme.horizonGlow?.[0] || '#000000');
      sky.material.uniforms.uGlowStrength.value = theme.horizonGlow?.[1] || 0;
      if (theme.nebula) { sky.material.uniforms.uNebA.value.set(course?.forged ? course.accent : theme.nebula.a); sky.material.uniforms.uNebB.value.set(course?.forged ? course.secondary : theme.nebula.b); }
      // Depth ramp: near and mid bands per world; the far band is the fog colour, and the sky horizon matches it.
      const far = new THREE.Color(course?.forged ? course.fog : theme.fog[0]);
      if (course?.forged) {
        fogRamp.setColors(far.clone().lerp(new THREE.Color(course.accent), 0.45), far.clone().lerp(new THREE.Color(course.accent), 0.2));
      } else {
        fogRamp.setColors(theme.fogRamp[0], theme.fogRamp[1]);
      }
      sky.material.uniforms.mid.value.copy(far);
      // Rim light uses a brightened near-haze colour so silhouettes catch the world's light.
      rimColor.value.copy(fogRamp.uniforms.fogRampNear.value).lerp(new THREE.Color('#ffffff'), 0.25);
      if (scene.fog) {
        scene.fog.color.set(course?.forged ? course.fog : theme.fog[0]);
        scene.fog.near = theme.fog[1];
        scene.fog.far = theme.fog[2];
      }
      ctx.key = key;
      ctx.fogColor = scene.fog ? scene.fog.color.clone() : null;
      ctx.look = { starOpacity: theme.stars };
      return ctx.look;
    },
    update(frame) {
      if (!ctx || !root.visible) return;
      // New meshes (obstacles, ghosts, bursts) appear every race; patch their fog about once a second.
      if (!lastPatch || frame.now - lastPatch > 1000) { fogRamp.patchScene(scene); lastPatch = frame.now; }
      sky.position.set(frame.cameraX, frame.cameraY, 13);
      sky.material.uniforms.uTime.value = (frame.now || 0) * 0.001;
      for (const piece of ctx.pieces) piece.userData.update?.(frame);
      ctx.theme.tick?.(ctx, frame, THREE);
    },
    setVisible(visible) { root.visible = visible; },
    /** Next landmark within range ahead, for the "ENTERING …" caption. */
    upcomingLandmark(distance, lapLength) { return ctx?.landmarks?.upcoming(distance, lapLength) || null; },
    /** Shift the whole environment along z (Free Flight moves the camera instead of scrolling). */
    setOrigin(z) { root.position.z = z; },
    dispose() { clear(); scene.remove(root); },
  };
}

/** Hazard rock look per world: geometry family, material, and stretch. */
const HAZARD_LOOKS = {
  relay: { geometry: 'icosa', color: '#4a5a74', emissive: '#16263c', emissiveIntensity: 0.4, metalness: 0.85, roughness: 0.32, stretch: [1.3, 0.8, 1] },
  volcanic: { geometry: 'dodeca', color: '#2a1410', emissive: '#ff4a12', emissiveIntensity: 0.55, metalness: 0.1, roughness: 0.95, stretch: [1, 0.9, 1] },
  ice: { geometry: 'octa', color: '#d8f0ff', emissive: '#6fb6e8', emissiveIntensity: 0.45, metalness: 0.1, roughness: 0.08, opacity: 0.88, stretch: [0.7, 1.55, 0.7] },
  nebula: { geometry: 'dodeca', color: '#3a2a55', emissive: '#b26bff', emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.8, stretch: [1.1, 0.95, 1] },
  earth: { geometry: 'icosa', color: '#9aa4b4', emissive: '#1d3d7a', emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.25, stretch: [1.5, 0.35, 1] },
  jupiter: { geometry: 'icosa', color: '#d9c49e', emissive: '#6b4a2a', emissiveIntensity: 0.25, metalness: 0.05, roughness: 0.85, stretch: [1.15, 0.85, 1] },
};

export function hazardLook(kind) {
  return HAZARD_LOOKS[kind] || null;
}

/**
 * Checkpoint gate styled for the world. Returns a Group centred on the route;
 * the caller positions it and sets userData.
 */
export function buildWorldFrame(THREE, course, { radius = 8, index = 0 } = {}) {
  const group = new THREE.Group();
  const accent = index % 5 === 0 ? '#f4fffd' : course.accent;
  const secondary = course.secondary;
  const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
  const metal = (color, emissive, intensity = 0.3) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, metalness: 0.8, roughness: 0.3, flatShading: true });
  const ring = (r, tube, segments, material, arc = Math.PI * 2, radial = 8) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, radial, segments, arc), material);
    group.add(mesh);
    return mesh;
  };
  const around = (count, fn) => { for (let i = 0; i < count; i++) fn(i, (i / count) * Math.PI * 2); };

  switch (course.kind) {
    case 'volcanic': {
      // Basalt arch, open at the bottom, with glowing lava seams.
      const arc = Math.PI * 1.4, start = -Math.PI * 0.2;
      const basalt = new THREE.MeshStandardMaterial({ color: '#2b1712', emissive: '#ff4a12', emissiveIntensity: 0.18, roughness: 0.95, flatShading: true });
      const rock = ring(radius, 0.75, 14, basalt, arc, 5);
      rock.rotation.z = start;
      const seam = ring(radius - 0.55, 0.07, 48, glow('#ff7a2a'), arc);
      seam.rotation.z = start;
      around(9, (i) => {
        const a = start + (i / 8) * arc, chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + hash(i + index) * 0.5, 0), basalt);
        chunk.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
        chunk.rotation.set(i, i * 2, i * 3);
        group.add(chunk);
      });
      for (const side of [-1, 1]) {
        const ember = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), glow(accent));
        ember.position.set(side * Math.cos(start) * radius, Math.sin(start) * radius - 0.6, 0.4);
        group.add(ember);
      }
      break;
    }
    case 'ice': {
      // Octagonal crystal gate ringed with inward ice spikes.
      const ice = new THREE.MeshStandardMaterial({ color: '#dff3ff', emissive: '#7cc4f0', emissiveIntensity: 0.4, metalness: 0.1, roughness: 0.06, transparent: true, opacity: 0.85, flatShading: true });
      ring(radius, 0.32, 8, ice, Math.PI * 2, 4).rotation.z = Math.PI / 8;
      ring(radius - 0.45, 0.05, 8, glow(accent, 0.8), Math.PI * 2, 4).rotation.z = Math.PI / 8;
      around(16, (i, a) => {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.2 + hash(i * 3 + index) * 1.4, 4), ice);
        const r = radius + 0.4;
        spike.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
        spike.rotation.z = a + (i % 2 ? Math.PI / 2 : -Math.PI / 2);
        group.add(spike);
      });
      break;
    }
    case 'nebula': {
      // Floating energy ring: two counter-tilted glowing bands and orbiting motes.
      ring(radius, 0.12, 96, glow(accent)).rotation.x = 0.18;
      ring(radius + 0.35, 0.05, 96, glow(secondary, 0.7)).rotation.y = 0.22;
      ring(radius + 1.1, 0.5, 64, new THREE.MeshBasicMaterial({ color: secondary, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
      around(10, (i, a) => {
        const mote = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), glow(i % 2 ? accent : '#ffffff'));
        mote.position.set(Math.cos(a) * (radius + 0.7), Math.sin(a) * (radius + 0.7), 0);
        group.add(mote);
      });
      group.userData.spin = 0.004;
      break;
    }
    case 'earth': {
      // Orbital station ring with solar wings on each side.
      const hull = metal('#d6dbe4', '#22446e', 0.25);
      ring(radius, 0.3, 48, hull, Math.PI * 2, 6).scale.y = 1.15;
      ring(radius - 0.4, 0.06, 64, glow(accent, 0.85)).scale.y = 1.15;
      const panel = new THREE.MeshStandardMaterial({ color: '#1d3d8a', emissive: '#0d2a66', emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.25 });
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.18), hull);
        arm.position.set(side * (radius + 1.2), 0, 0);
        group.add(arm);
        for (let k = 0; k < 2; k++) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 0.06), panel);
          wing.position.set(side * (radius + 2.5 + k * 2.7), 0, 0);
          group.add(wing);
        }
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), glow(side < 0 ? '#ff5d5d' : '#5dff9a'));
        light.position.set(side * radius * 1.0, radius * 0.5, 0.3);
        group.add(light);
      }
      break;
    }
    case 'jupiter': {
      // A gate assembled from tumbling ring-ice chunks around an amber guide line.
      ring(radius, 0.06, 96, glow(accent, 0.9)).scale.x = 1.18;
      const chunkMat = new THREE.MeshStandardMaterial({ color: '#e2cfa8', emissive: '#5a3a1e', emissiveIntensity: 0.3, roughness: 0.85, flatShading: true });
      around(22, (i, a) => {
        const chunk = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + hash(i * 5 + index) * 0.45, 0), chunkMat);
        const r = radius + 0.5 + (hash(i * 7) - 0.5) * 0.8;
        chunk.position.set(Math.cos(a) * r * 1.18, Math.sin(a) * r, (hash(i) - 0.5) * 0.8);
        chunk.rotation.set(i, i * 1.7, i * 0.3);
        group.add(chunk);
      });
      group.userData.spin = -0.002;
      break;
    }
    default: {
      // Neon Rift: hexagonal relay gate with girder struts and status lights.
      const girder = metal('#33445e', secondary, 0.25);
      ring(radius, 0.26, 6, girder, Math.PI * 2, 4).rotation.z = Math.PI / 6;
      ring(radius - 0.38, 0.07, 6, glow(accent), Math.PI * 2, 4).rotation.z = Math.PI / 6;
      around(6, (i, a) => {
        const corner = a + Math.PI / 6;
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.6, 0.6), girder);
        strut.position.set(Math.cos(corner) * (radius + 0.6), Math.sin(corner) * (radius + 0.6), 0);
        strut.rotation.z = corner - Math.PI / 2;
        group.add(strut);
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), glow(i % 2 ? accent : '#ff5d7a'));
        light.position.set(Math.cos(corner) * (radius + 1.45), Math.sin(corner) * (radius + 1.45), 0.2);
        group.add(light);
      });
    }
  }
  // Every gate keeps a bright top marker so checkpoints read at speed.
  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.1 }));
  marker.position.set(0, radius - 0.05, 0.2);
  group.add(marker);
  return group;
}
