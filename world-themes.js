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

function bandedPlanetTexture(THREE, bands, storm) {
  return canvasTexture(THREE, 512, 256, (ctx, w, h) => {
    let y = 0;
    let i = 0;
    while (y < h) {
      const bh = 6 + hash(i * 4.3) * 22;
      ctx.fillStyle = bands[i % bands.length];
      ctx.fillRect(0, y, w, bh + 1);
      // turbulent band edges
      ctx.globalAlpha = 0.35;
      for (let x = 0; x < w; x += 8) {
        ctx.fillStyle = bands[(i + 1) % bands.length];
        ctx.fillRect(x, y + bh - 2 + Math.sin(x * 0.05 + i) * 3, 9, 4);
      }
      ctx.globalAlpha = 1;
      y += bh;
      i++;
    }
    if (storm) {
      ctx.fillStyle = storm;
      ctx.beginPath();
      ctx.ellipse(w * 0.66, h * 0.62, 34, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,220,.45)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  });
}

function earthTexture(THREE) {
  return canvasTexture(THREE, 1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#0d3f78';
    ctx.fillRect(0, 0, w, h);
    // continents
    for (let i = 0; i < 9; i++) {
      const cx = hash(i * 9.1) * w, cy = h * (0.25 + hash(i * 5.3) * 0.5);
      ctx.fillStyle = i % 3 ? '#2f6b3a' : '#7a6a45';
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.3) {
        const r = 40 + hash(i * 11 + a) * 70;
        ctx.lineTo(cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r);
      }
      ctx.fill();
    }
    // cloud streaks
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#f2f7ff';
    for (let i = 0; i < 70; i++) {
      const x = hash(i * 2.7) * w, y = hash(i * 6.1) * h;
      ctx.beginPath();
      ctx.ellipse(x, y, 30 + hash(i) * 90, 4 + hash(i * 3) * 9, (hash(i * 8) - 0.5) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function lavaTexture(THREE) {
  return canvasTexture(THREE, 256, 256, (ctx, w) => {
    ctx.fillStyle = '#1a0806';
    ctx.fillRect(0, 0, w, w);
    ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      let x = hash(i * 3.3) * w, y = hash(i * 7.9) * w;
      ctx.strokeStyle = i % 4 ? '#ff5a1a' : '#ffc14a';
      ctx.lineWidth = 1 + hash(i * 2.2) * 3.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += (hash(i * 13 + s) - 0.5) * 50;
        y += (hash(i * 17 + s) - 0.5) * 50;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // tile seam blur
    ctx.globalAlpha = 0.35;
    ctx.drawImage(ctx.canvas, w / 2, 0, w / 2, w, 0, 0, w / 2, w);
  }, true);
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
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform float flash; varying vec3 vDir;
      void main(){ float y = vDir.y; vec3 c = y > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, y)) : mix(mid, bottom, smoothstep(0.0, 0.35, -y));
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
  mesh.userData.update = ({ distance, routeAt }) => {
    const first = Math.floor(distance / spacing) - behind;
    for (let i = 0; i < count; i++) {
      const slot = first + i, along = slot * spacing, centre = routeAt(along), o = place(slot, centre);
      p.set(centre.x + o.x, centre.y + o.y, Z0 - (along - distance) + (o.z || 0));
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
    sky: ['#040a18', '#0d2244', '#02050b'], fog: ['#0a1a33', 34, 165], stars: 1,
    build(THREE, ctx) {
      const steel = new THREE.MeshStandardMaterial({ color: '#4a5d7a', metalness: 0.7, roughness: 0.4, emissive: '#13243d', flatShading: true });
      const neon = new THREE.MeshBasicMaterial({ color: ctx.course.accent });
      const sideX = (slot) => (slot % 2 ? 1 : -1) * (11.5 + hash(slot * 3) * 4);
      // Lattice pylons of the abandoned relay along both sides, some snapped off.
      const pylon = (slot) => {
        const broken = hash(slot) < 0.22, side = slot % 2 ? 1 : -1;
        return { x: sideX(slot), y: broken ? -9 : -1, rz: side * (0.08 + hash(slot * 5) * 0.22), sy: broken ? 0.45 : 1 };
      };
      const beams = makeTrackside(THREE, new THREE.BoxGeometry(0.9, 20, 0.9), steel, { count: 34, spacing: 8 }, pylon);
      const strips = makeTrackside(THREE, new THREE.BoxGeometry(0.16, 20, 0.16), neon, { count: 34, spacing: 8 }, (slot) => ({ ...pylon(slot), z: 0.5 }));
      // Overhead gantries spanning the route, with gaps where they have fallen.
      const cross = makeTrackside(THREE, new THREE.BoxGeometry(28, 0.7, 0.9), steel, { count: 12, spacing: 24 }, (slot) => ({ x: (hash(slot) - 0.5) * 3, y: 8.5 + hash(slot * 2) * 2, rz: (hash(slot * 7) - 0.5) * 0.25, s: hash(slot * 9) < 0.3 ? 0 : 1 }));
      const crossGlow = makeTrackside(THREE, new THREE.BoxGeometry(28, 0.12, 0.12), neon, { count: 12, spacing: 24 }, (slot) => ({ x: (hash(slot) - 0.5) * 3, y: 8 + hash(slot * 2) * 2, z: 0.5, rz: (hash(slot * 7) - 0.5) * 0.25, s: hash(slot * 9) < 0.3 ? 0 : 1 }));
      // The broken transit spine running alongside.
      const spine = makeTrackside(THREE, new THREE.CylinderGeometry(1.6, 1.6, 15, 10, 1, true), steel, { count: 14, spacing: 17 }, (slot) => ({ x: -19 + Math.sin(slot * 0.4) * 2, y: 5, rx: Math.PI / 2, rz: (hash(slot) - 0.5) * 0.25, s: hash(slot * 4) < 0.18 ? 0 : 1 }));
      const beacons = makeTrackside(THREE, new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff5d7a' }), { count: 34, spacing: 8 }, (slot) => ({ x: sideX(slot), y: 9, s: hash(slot) < 0.22 ? 0 : 1 }));
      ctx.blink = beacons;
      const glowCloud = skyObject(new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTexture(THREE, 7, [ctx.course.secondary, ctx.course.accent]), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })), [-30, 30, -200], 0.9);
      glowCloud.scale.set(260, 180, 1);
      const debris = makeParticles(THREE, ctx.glow, { count: 160, color: '#8fc3ff', size: 0.45, opacity: 0.6 });
      return [beams, strips, cross, crossGlow, spine, beacons, glowCloud, debris];
    },
    tick(ctx, { now }) { if (ctx.blink) ctx.blink.material.color.set(Math.sin(now * 0.006) > 0.2 ? '#ff5d7a' : '#2a0f18'); },
  },

  volcanic: {
    sky: ['#0d0408', '#4a1410', '#ff6a1c'], fog: ['#3a120e', 22, 150], stars: 0.25,
    build(THREE, ctx) {
      const lava = lavaTexture(THREE);
      lava.repeat.set(10, 10);
      const sea = groundPlane(THREE, new THREE.MeshStandardMaterial({ color: '#2a0d08', map: lava, emissive: '#ffffff', emissiveMap: lava, emissiveIntensity: 1.25, roughness: 0.9 }), -15, 0.05);
      const rock = new THREE.MeshStandardMaterial({ color: '#2b1712', roughness: 0.95, flatShading: true, emissive: '#3a0d04' });
      const volcanoes = makeTrackside(THREE, new THREE.ConeGeometry(9, 22, 7), rock, { count: 12, spacing: 32 }, (slot) => {
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
      const jupiter = skyObject(new THREE.Mesh(new THREE.SphereGeometry(48, 40, 24), new THREE.MeshBasicMaterial({ map: bandedPlanetTexture(THREE, ['#a5674a', '#e0b07c', '#c48a62', '#f0d2a4'], '#b0503a'), transparent: true, opacity: 0.55 })), [55, 70, -190]);
      const boltGeometry = new THREE.BufferGeometry();
      boltGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(32 * 3), 3));
      const bolt = new THREE.Line(boltGeometry, new THREE.LineBasicMaterial({ color: '#f4e8ff', transparent: true, opacity: 0, fog: false }));
      bolt.frustumCulled = false;
      ctx.bolt = bolt;
      ctx.nextBolt = 0;
      return [sea, volcanoes, plumes, ash, embers, jupiter, bolt];
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
    sky: ['#4a3420', '#c08447', '#6b4a2c'], fog: ['#a8743f', 10, 118], stars: 0,
    build(THREE, ctx) {
      const ice = new THREE.MeshStandardMaterial({ color: '#cfe8ff', metalness: 0.1, roughness: 0.15, emissive: '#5a8db0', emissiveIntensity: 0.35, transparent: true, opacity: 0.92, flatShading: true });
      // Canal walls of ice spires on both sides.
      const spires = makeTrackside(THREE, new THREE.ConeGeometry(1.6, 14, 5), ice, { count: 56, spacing: 5 }, (slot) => {
        const side = slot % 2 ? 1 : -1;
        return { x: side * (12.5 + hash(slot) * 5), y: -6 + hash(slot * 2) * 3, s: 0.6 + hash(slot * 3) * 1.1, rz: side * -(0.05 + hash(slot * 4) * 0.25), ry: hash(slot) * 6 };
      });
      const cliffs = makeTrackside(THREE, new THREE.BoxGeometry(8, 30, 14), new THREE.MeshStandardMaterial({ color: '#5a4436', roughness: 1, flatShading: true }), { count: 24, spacing: 12 }, (slot) => {
        const side = slot % 2 ? 1 : -1;
        return { x: side * (22 + hash(slot) * 4), y: -4, ry: hash(slot) * 0.5, rz: side * 0.08 };
      });
      // Liquid methane canal below.
      const canal = groundPlane(THREE, new THREE.MeshStandardMaterial({ color: '#2b1d14', metalness: 0.9, roughness: 0.18 }), -12);
      const haze = makeParticles(THREE, ctx.glow, { count: 160, color: '#ffd29a', size: 2.6, opacity: 0.12, additive: false });
      const snow = makeParticles(THREE, ctx.glow, { count: 220, color: '#fff3dc', size: 0.16, opacity: 0.8, fall: 1.5, additive: false });
      // Saturn, faint through the haze.
      const saturn = new THREE.Group();
      saturn.add(new THREE.Mesh(new THREE.SphereGeometry(26, 32, 20), new THREE.MeshBasicMaterial({ map: bandedPlanetTexture(THREE, ['#e8cf9a', '#d6b47a', '#f2e0b4']), transparent: true, opacity: 0.32 })));
      const ring = new THREE.Mesh(new THREE.RingGeometry(34, 52, 64), new THREE.MeshBasicMaterial({ color: '#f2dfb2', transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
      ring.rotation.x = 1.25;
      saturn.add(ring);
      saturn.rotation.z = 0.35;
      return [spires, cliffs, canal, haze, snow, skyObject(saturn, [-60, 58, -190])];
    },
  },

  nebula: {
    sky: ['#0a0620', '#2a1252', '#08051a'], fog: ['#1d0f38', 32, 165], stars: 1,
    build(THREE, ctx) {
      const colors = [ctx.course.accent, ctx.course.secondary, '#ff7ac8', '#6a4dff'];
      const clouds = new THREE.Group();
      for (let i = 0; i < 14; i++) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTexture(THREE, i * 31, colors), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
        sprite.userData = { x: (hash(i) - 0.5) * 200, y: (hash(i * 2) - 0.5) * 90, z: -60 - hash(i * 3) * 130, s: 60 + hash(i * 4) * 80 };
        sprite.scale.setScalar(sprite.userData.s);
        clouds.add(sprite);
      }
      clouds.userData.update = ({ distance, cameraX, cameraY }) => clouds.children.forEach((s) => {
        const u = s.userData, z = ((u.z + distance * 0.25) % 200 + 200) % 200 - 200;
        s.position.set(u.x + cameraX * 0.8, u.y + cameraY * 0.5, z);
        s.material.opacity = 0.5 * Math.min(1, (200 + z) / 60);
      });
      // Gravity-well vortex far ahead.
      const vortex = skyObject(new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshBasicMaterial({ map: canvasTexture(THREE, 256, 256, (c, w) => {
        c.translate(w / 2, w / 2);
        for (let a = 0; a < 900; a++) { const t = a / 900, r = t * w / 2; c.fillStyle = `rgba(230,190,255,${(1 - t) * 0.5})`; c.beginPath(); c.arc(Math.cos(t * 26) * r, Math.sin(t * 26) * r, 3 * (1 - t) + 0.6, 0, 6.3); c.fill(); }
      }), transparent: true, blending: THREE.AdditiveBlending })), [10, 18, -195], 0.95);
      ctx.vortex = vortex;
      const rocks = makeTrackside(THREE, new THREE.DodecahedronGeometry(2.2, 0), new THREE.MeshStandardMaterial({ color: '#3a2f4f', roughness: 0.9, flatShading: true }), { count: 30, spacing: 11 }, (slot) => {
        const side = slot % 2 ? 1 : -1;
        return { x: side * (16 + hash(slot) * 22), y: (hash(slot * 2) - 0.5) * 26, s: 0.5 + hash(slot * 3) * 1.6, rx: slot, ry: slot * 0.7 };
      });
      const dust = makeParticles(THREE, ctx.glow, { count: 220, color: '#e2b8ff', size: 0.4, opacity: 0.55 });
      return [clouds, vortex, rocks, dust];
    },
    tick(ctx, { now }) { if (ctx.vortex) ctx.vortex.rotation.z = now * 0.00012; },
  },

  earth: {
    sky: ['#010208', '#0c2a55', '#2a7cc4'], fog: ['#0b1e3a', 50, 190], stars: 1,
    build(THREE) {
      // A huge curved Earth below: the route rides low orbit above it.
      const planet = new THREE.Group();
      planet.add(new THREE.Mesh(new THREE.SphereGeometry(150, 72, 48), new THREE.MeshStandardMaterial({ map: earthTexture(THREE), roughness: 0.8, emissive: '#0a2a55', emissiveIntensity: 0.35 })));
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
      return [earth, sun, sats];
    },
    tick(ctx, { now }) { ctx.pieces[0].userData.spin.rotation.y = now * 0.000012; },
  },

  jupiter: {
    sky: ['#070504', '#2a1a10', '#140c08'], fog: ['#24170f', 44, 180], stars: 0.8,
    build(THREE, ctx) {
      // Jupiter fills the sky, with its ring plane sweeping across.
      const giant = new THREE.Group();
      giant.add(new THREE.Mesh(new THREE.SphereGeometry(95, 64, 40), new THREE.MeshStandardMaterial({ map: bandedPlanetTexture(THREE, ['#8f563c', '#e3b47a', '#c58d63', '#f1d6a8', '#a86a48', '#d9a777'], '#b5482f'), roughness: 0.9, emissive: '#3a1c10', emissiveIntensity: 0.5 })));
      giant.rotation.z = -0.18;
      const planet = skyObject(giant, [-70, 40, -200], 0.95);
      planet.userData.spin = giant.children[0];
      const ringTex = canvasTexture(THREE, 512, 8, (c, w) => { for (let x = 0; x < w; x++) { c.fillStyle = `rgba(230,205,160,${0.15 + hash(x * 0.37) * 0.55 * (Math.sin(x * 0.09) * 0.5 + 0.5)})`; c.fillRect(x, 0, 1, 8); } });
      const rings = new THREE.Mesh(new THREE.RingGeometry(70, 230, 128, 1), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      const uv = rings.geometry.attributes.uv, pos = rings.geometry.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < uv.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - 70) / 160, 0.5); }
      rings.rotation.x = -Math.PI / 2 + 0.06;
      const ringPlane = skyObject(rings, [-40, -9, -120], 0.9);
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
  let ctx = null;

  function clear() {
    if (!ctx) return;
    for (const piece of ctx.pieces) {
      root.remove(piece);
      piece.traverse((o) => {
        o.geometry?.dispose();
        for (const mat of [].concat(o.material || [])) { if (mat.map && mat.map !== glow) mat.map.dispose(); mat.dispose(); }
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
      ctx = { course, glow, sky, theme, boltAt: -1e9 };
      ctx.pieces = theme.build(THREE, ctx);
      ctx.pieces.forEach((piece) => root.add(piece));
      const [top, mid, bottom] = theme.sky;
      // Forged courses keep the world's look but take their own palette.
      sky.material.uniforms.top.value.set(course?.forged ? course.sky : top);
      sky.material.uniforms.mid.value.set(course?.forged ? course.fog : mid);
      sky.material.uniforms.bottom.value.set(bottom);
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
      sky.position.set(frame.cameraX, frame.cameraY, 13);
      for (const piece of ctx.pieces) piece.userData.update?.(frame);
      ctx.theme.tick?.(ctx, frame, THREE);
    },
    setVisible(visible) { root.visible = visible; },
    /** Shift the whole environment along z (Free Flight moves the camera instead of scrolling). */
    setOrigin(z) { root.position.z = z; },
    dispose() { clear(); scene.remove(root); },
  };
}

/** Hazard rock look per world: geometry family, material, and stretch. */
const HAZARD_LOOKS = {
  relay: { geometry: 'box', color: '#5d6f8c', emissive: '#1d3350', emissiveIntensity: 0.4, metalness: 0.85, roughness: 0.3, stretch: [1.4, 0.55, 0.8] },
  volcanic: { geometry: 'dodeca', color: '#2a1410', emissive: '#ff4a12', emissiveIntensity: 0.55, metalness: 0.1, roughness: 0.95, stretch: [1, 0.9, 1] },
  ice: { geometry: 'octa', color: '#d8f0ff', emissive: '#6fb6e8', emissiveIntensity: 0.45, metalness: 0.1, roughness: 0.08, opacity: 0.88, stretch: [0.7, 1.55, 0.7] },
  nebula: { geometry: 'dodeca', color: '#3a2a55', emissive: '#b26bff', emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.8, stretch: [1.1, 0.95, 1] },
  earth: { geometry: 'box', color: '#c9ced8', emissive: '#1d3d7a', emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.25, stretch: [1.5, 0.35, 1] },
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
