/**
 * Shader building blocks for soft, volumetric-looking space effects:
 * GLSL value-noise fbm, and an animated swirl disc (spiral arms with soft
 * edges) used for Helix Deep's vortex and "The Eye".
 */

export const NOISE_GLSL = `
  float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
  float vnoise(vec3 p){
    vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += vnoise(p) * a; p = p * 2.03 + 11.7; a *= 0.5; } return s; }
`;

/** Animated swirl on a RingGeometry/CircleGeometry of the given outer radius. */
export function makeSwirlMaterial(THREE, { colorA = '#c48bff', colorB = '#5fd0ff', outer = 26, inner = 0.18, intensity = 1 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uA: { value: new THREE.Color(colorA) },
      uB: { value: new THREE.Color(colorB) },
      uOuter: { value: outer },
      uInner: { value: inner },
      uIntensity: { value: intensity },
    },
    vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `${NOISE_GLSL}
      uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform float uOuter; uniform float uInner; uniform float uIntensity;
      varying vec3 vPos;
      void main(){
        float r = length(vPos.xy) / uOuter;
        float a = atan(vPos.y, vPos.x);
        // Spiral arms: angle bent by radius, rotating over time, broken up by noise.
        float arms = 0.5 + 0.5 * sin(a * 3.0 + log(max(r, 0.02)) * 7.0 - uTime * 0.6);
        float n = fbm3(vec3(cos(a) * r * 4.0, sin(a) * r * 4.0, uTime * 0.05 + r * 2.0));
        float density = pow(arms, 2.0) * smoothstep(0.25, 0.85, n + 0.25);
        float fade = smoothstep(uInner, uInner + 0.12, r) * (1.0 - smoothstep(0.62, 1.0, r));
        vec3 col = mix(uB, uA, smoothstep(0.15, 0.9, r)) * (1.0 + 1.5 * (1.0 - smoothstep(uInner, uInner + 0.2, r)));
        float alpha = density * fade * uIntensity;
        gl_FragColor = vec4(col * alpha, alpha);
      }`,
  });
}
