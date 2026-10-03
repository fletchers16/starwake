/**
 * Crafted low-poly shapes: replaces single-colour primitives (cones, boxes)
 * with clustered, roughened forms that carry a vertical colour gradient —
 * the hand-painted low-poly look rather than placeholder geometry.
 * Materials using these must set `vertexColors: true`.
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

function rand(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5 >>> 0) / 4294967296);
}

/** Vertical colour gradient (bottom -> top) baked into a `color` attribute. */
export function gradient(geometry, bottom, top, curve = 1) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const a = new THREE.Color(bottom), b = new THREE.Color(top), c = new THREE.Color();
  const pos = geometry.attributes.position, colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.pow((pos.getY(i) - min.y) / Math.max(1e-6, max.y - min.y), curve);
    c.copy(a).lerp(b, t);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** Displace vertices with seeded jitter, keeping faces stitched, then flat-shade. */
export function roughen(geometry, amount, seed = 1) {
  const r = rand(seed);
  let g = geometry.index ? geometry : mergeVertices(geometry);
  g = mergeVertices(g.toNonIndexed(), 1e-4);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) + (r() - 0.5) * amount, pos.getY(i) + (r() - 0.5) * amount * 0.6, pos.getZ(i) + (r() - 0.5) * amount);
  }
  const out = g.toNonIndexed();
  out.computeVertexNormals();
  return out;
}

/** A cluster of hexagonal shards with pointed tips (unit height ~1, base at y=0). */
export function crystalCluster(seed = 1, shards = 4) {
  const r = rand(seed), parts = [];
  for (let i = 0; i < shards; i++) {
    const h = i === 0 ? 1 : 0.45 + r() * 0.45, w = (i === 0 ? 0.16 : 0.09 + r() * 0.06);
    const prism = new THREE.CylinderGeometry(w, w * 1.15, h * 0.78, 6, 1);
    prism.translate(0, h * 0.39, 0);
    const tip = new THREE.ConeGeometry(w, h * 0.22, 6, 1);
    tip.translate(0, h * 0.78 + h * 0.11, 0);
    const shard = mergeGeometries([prism.toNonIndexed(), tip.toNonIndexed()]);
    const lean = i === 0 ? 0 : 0.25 + r() * 0.35, dir = r() * Math.PI * 2;
    shard.rotateZ(lean * Math.cos(dir));
    shard.rotateX(lean * Math.sin(dir));
    if (i) shard.translate(Math.cos(dir) * 0.12, 0, Math.sin(dir) * 0.12);
    parts.push(shard);
  }
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}

/** Roughened rock slab (for canyon walls and cliffs). */
export function rockSlab(w, h, d, seed = 1) {
  const box = new THREE.BoxGeometry(w, h, d, 3, 5, 3);
  return roughen(box, Math.min(w, d) * 0.35, seed);
}

/** Volcano: roughened cone with a crater lip, dark base to hot rim. */
export function volcano(radius, height, seed = 1) {
  const cone = new THREE.CylinderGeometry(radius * 0.18, radius, height, 10, 4, true);
  const g = roughen(cone, radius * 0.18, seed);
  return gradient(g, '#1c100c', '#7a3218', 2.2);
}
