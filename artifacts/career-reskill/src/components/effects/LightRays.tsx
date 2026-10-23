import { useEffect, useRef } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const VERT = `attribute vec2 position; void main(){ gl_Position = vec4(position,0.0,1.0); }`;
const FRAG = `
precision highp float;
uniform float iTime; uniform vec2 iResolution; uniform vec2 rayPos; uniform vec2 rayDir;
uniform vec3 raysColor; uniform float raysSpeed; uniform float lightSpread; uniform float rayLength;
uniform float fadeDistance; uniform vec2 mousePos; uniform float mouseInfluence; uniform float noiseAmount; uniform float distortion;
float noise(vec2 st){ return fract(sin(dot(st, vec2(12.9898,78.233))) * 43758.5453123); }
float rayStrength(vec2 src, vec2 dir, vec2 coord, float a, float b, float speed){
  vec2 s = coord - src; float cosA = dot(normalize(s), dir);
  float d = distortion * sin(iTime * 1.5 + length(s) * 0.005); float ang = cosA + d;
  float spread = pow(max(ang, 0.0), 1.0 / max(lightSpread, 0.001));
  float dist = length(s); float maxD = max(iResolution.x, iResolution.y) * rayLength;
  float lenF = clamp((maxD - dist) / maxD, 0.0, 1.0);
  float fadeF = fadeDistance * max(iResolution.x, iResolution.y);
  float fade = clamp((fadeF - dist) / fadeF, 0.0, 1.0);
  float base = clamp((0.5 + 0.2 * sin(ang * a + iTime * speed)) + (0.3 + 0.2 * cos(-ang * b + iTime * speed * 0.8)), 0.0, 1.0);
  return base * lenF * fade * spread;
}
void main(){
  vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);
  vec2 dir = normalize(rayDir);
  if (mouseInfluence > 0.0) { dir = normalize(mix(dir, normalize(mousePos * iResolution - rayPos), mouseInfluence)); }
  float r1 = rayStrength(rayPos, dir, coord, 45.2, 31.4, 0.8 * raysSpeed);
  float r2 = rayStrength(rayPos, dir, coord, 28.5, 19.8, 1.2 * raysSpeed);
  float r3 = rayStrength(rayPos, dir, coord, 12.1, 56.2, 0.5 * raysSpeed);
  float c = pow(r1 * 0.4 + r2 * 0.4 + r3 * 0.2, 0.7) * 1.5;
  if (noiseAmount > 0.0) { c *= (1.0 - noiseAmount + noiseAmount * noise(coord * 0.01 + iTime * 0.05)); }
  c = clamp(c, 0.0, 1.0);
  gl_FragColor = vec4(raysColor * c, c);
}`;

/** Fixed, decorative WebGL light rays adapted from the uploaded LightRays source. */
export function LightRays({ raysColor = '#3f8f82', raysSpeed = 0.8, lightSpread = 0.9, rayLength = 1.6, fadeDistance = 1.1, mouseInfluence = 0.08, noiseAmount = 0.06, distortion = 0.04 }: {
  raysColor?: string; raysSpeed?: number; lightSpread?: number; rayLength?: number; fadeDistance?: number; mouseInfluence?: number; noiseAmount?: number; distortion?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: Renderer;
    try {
      const canvas = document.createElement('canvas');
      if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) {
        container.dataset.fallback = 'true';
        return;
      }
      renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio, 1.5), alpha: true, premultipliedAlpha: true });
    } catch {
      container.dataset.fallback = 'true';
      return;
    }
    const gl = renderer.gl;
    if (!gl) { container.dataset.fallback = 'true'; return; }
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.cssText = 'width:100%;height:100%;display:block';
    container.appendChild(canvas);

    const uniforms = {
      iTime: { value: 0 }, iResolution: { value: [1, 1] }, rayPos: { value: [0, 0] }, rayDir: { value: [0, 1] },
      raysColor: { value: hexToRgb(raysColor) }, raysSpeed: { value: raysSpeed }, lightSpread: { value: lightSpread },
      rayLength: { value: rayLength }, fadeDistance: { value: fadeDistance }, mousePos: { value: [0.5, 0.5] },
      mouseInfluence: { value: reduced ? 0 : mouseInfluence }, noiseAmount: { value: noiseAmount }, distortion: { value: distortion },
    };
    const program = new Program(gl, { vertex: VERT, fragment: FRAG, uniforms, transparent: true });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      const w = container.clientWidth; const h = container.clientHeight;
      renderer.setSize(w, h);
      const dpr = renderer.dpr;
      uniforms.iResolution.value = [w * dpr, h * dpr];
      uniforms.rayPos.value = [0.62 * w * dpr, -0.2 * h * dpr];
      uniforms.rayDir.value = [-0.25, 1];
    };
    resize();
    window.addEventListener('resize', resize);

    const mouse = { x: 0.5, y: 0.5 }; const smooth = { x: 0.5, y: 0.5 };
    const onMove = (e: PointerEvent) => { mouse.x = e.clientX / window.innerWidth; mouse.y = e.clientY / window.innerHeight; };
    if (!reduced) window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    const loop = (t: number) => {
      uniforms.iTime.value = t * 0.001;
      smooth.x += (mouse.x - smooth.x) * 0.08; smooth.y += (mouse.y - smooth.y) * 0.08;
      uniforms.mousePos.value = [smooth.x, smooth.y];
      try { renderer.render({ scene: mesh }); } catch { return; }
      if (!reduced) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(loop); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    };
  }, [raysColor, raysSpeed, lightSpread, rayLength, fadeDistance, mouseInfluence, noiseAmount, distortion]);

  return <div ref={ref} className="light-rays" aria-hidden="true" data-testid="bg-light-rays" />;
}
