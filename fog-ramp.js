/**
 * Depth-ramp fog (after Firewatch): instead of fading everything to one fog
 * colour, distance steps through three bands — near haze, mid tone, and the
 * far colour (scene.fog.color), which matches the sky's horizon.
 *
 * Works by patching each material's fog chunk via onBeforeCompile. The ramp
 * colours are shared uniform objects, so changing world updates every
 * material at once without recompiling.
 */

export function createFogRamp(THREE) {
  const uniforms = {
    fogRampNear: { value: new THREE.Color('#1b6f8a') },
    fogRampMid: { value: new THREE.Color('#16305a') },
  };

  const CHUNK = `#ifdef USE_FOG
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
    float rampT = clamp( vFogDepth / max( fogFar, 1.0 ), 0.0, 1.0 );
    vec3 rampColor = rampT < 0.45
      ? mix( fogRampNear, fogRampMid, smoothstep( 0.0, 0.45, rampT ) )
      : mix( fogRampMid, fogColor, smoothstep( 0.45, 1.0, rampT ) );
    gl_FragColor.rgb = mix( gl_FragColor.rgb, rampColor, fogFactor );
  #endif`;

  function patchMaterial(material) {
    if (!material || material.userData.fogRamp || material.fog === false || material.isShaderMaterial) return;
    material.userData.fogRamp = true;
    const previous = material.onBeforeCompile;
    const previousKey = material.customProgramCacheKey?.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      previous?.call(material, shader, renderer);
      if (!shader.fragmentShader.includes('#include <fog_fragment>')) return;
      shader.uniforms.fogRampNear = uniforms.fogRampNear;
      shader.uniforms.fogRampMid = uniforms.fogRampMid;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\nuniform vec3 fogRampNear;\nuniform vec3 fogRampMid;')
        .replace('#include <fog_fragment>', CHUNK);
    };
    material.customProgramCacheKey = () => `fogramp:${previousKey ? previousKey() : ''}`;
    material.needsUpdate = true;
  }

  return {
    uniforms,
    /** Patch every material currently in the scene graph (cheap; already-patched ones are skipped). */
    patchScene(root) {
      root.traverse((object) => {
        const list = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of list) patchMaterial(material);
      });
    },
    setColors(near, mid) {
      uniforms.fogRampNear.value.set(near);
      uniforms.fogRampMid.value.set(mid);
    },
  };
}
