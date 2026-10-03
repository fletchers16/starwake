/**
 * Final colour grade (after Sayonara Wild Hearts' per-stage palettes): a gentle
 * split-tone (shadows toward the world's base hue, highlights toward its accent),
 * a vignette that frames the track, and faint animated film grain to break up
 * flat CG gradients. Runs as the last composer pass.
 */
export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uShadow: { value: null },
    uHighlight: { value: null },
    uSplit: { value: 0.07 },
    uVignette: { value: 0.28 },
    uGrain: { value: 0.03 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec3 uShadow; uniform vec3 uHighlight;
    uniform float uSplit; uniform float uVignette; uniform float uGrain; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      vec3 tone = mix(uShadow, uHighlight, smoothstep(0.1, 0.8, l));
      c.rgb += (tone - vec3(0.5)) * uSplit * (1.0 - l * 0.6);
      float d = distance(vUv, vec2(0.5));
      c.rgb *= 1.0 - uVignette * smoothstep(0.38, 0.9, d);
      c.rgb += (hash(vUv * 900.0 + fract(uTime) * 61.0) - 0.5) * uGrain;
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), c.a);
    }`,
};
