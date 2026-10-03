/**
 * Fresnel rim light (after Redout's crisp low-poly silhouettes): surfaces
 * turning away from the camera pick up the world's sky colour, so dark shapes
 * read as clean silhouettes against fog instead of blending into it.
 *
 * One shared colour uniform drives every rim; world-themes.js sets it per world.
 * Works with MeshStandard/MeshPhysical (and instancing) via onBeforeCompile and
 * chains with other patches such as fog-ramp.js.
 */
import * as THREE from 'three';

export const rimColor = { value: new THREE.Color('#7fb6ff') };

export function addRim(material, { strength = 0.5, power = 2.6 } = {}) {
  if (!material || material.userData.rim || !(material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) return material;
  material.userData.rim = true;
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey?.bind(material);
  const s = strength.toFixed(2), p = power.toFixed(2);
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.rimColor = rimColor;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimFacing = 1.0 - abs( dot( normalize( normal ), normalize( vViewPosition ) ) );
        totalEmissiveRadiance += rimColor * pow( rimFacing, ${p} ) * ${s};`);
  };
  material.customProgramCacheKey = () => `rim${s}_${p}:${previousKey ? previousKey() : ''}`;
  material.needsUpdate = true;
  return material;
}

/** Rim every standard material under an object (e.g. a built ship or landmark). */
export function rimObject(object, options) {
  object.traverse((o) => {
    if (!o.isMesh) return;
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) addRim(material, options);
  });
  return object;
}
