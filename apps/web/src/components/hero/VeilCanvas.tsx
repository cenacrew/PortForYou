'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Proposition « Voile » : un gradient de brume — l'esthétique dominante des
 * heroes actuels. Une aura Klein très diffuse dérive lentement dans l'ivoire,
 * déformée par le bruit à grande échelle et courbée par le curseur, le tout
 * sous un grain de film prononcé. Lent, flou, luxueux — zéro contour dur.
 */
const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uAspect;

  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // fbm 2 octaves — uniquement des basses fréquences : tout reste flou.
  float fbm(vec2 p) {
    return snoise(p) * 0.65 + snoise(p * 2.1) * 0.35;
  }

  void main() {
    vec2 uv = vUv;
    vec2 st = vec2(uv.x * uAspect, uv.y);
    float t = uTime * 0.045;

    // Le curseur attire doucement la brume : déplacement gaussien, nul au
    // centre comme au loin — aucune singularité, aucun tourbillon.
    vec2 pointer = vec2(uPointer.x * uAspect, uPointer.y);
    vec2 toPointer = pointer - st;
    float d2 = dot(toPointer, toPointer);
    st += toPointer * exp(-d2 * 6.0) * 0.6;

    // Domain warping à grande échelle : la brume dérive sans jamais se figer.
    vec2 q = vec2(fbm(st * 0.8 + vec2(t, -t * 0.6)), fbm(st * 0.8 + vec2(-t * 0.4, t)));
    float v = fbm(st * 0.9 + q * 0.9 + vec2(t * 0.5));

    // Une seule aura, ancrée en haut à droite, portée par le bruit.
    vec2 anchor = vec2(0.78 * uAspect, 0.72);
    float aura = smoothstep(1.15, 0.05, distance(st + q * 0.35, anchor));
    float intensity = aura * smoothstep(-0.55, 0.85, v);

    // Lisibilité : la brume s'amincit sous le bloc de titre…
    intensity *= 1.0 - (1.0 - smoothstep(0.05, 0.62, uv.x)) *
      smoothstep(0.12, 0.4, uv.y) * (1.0 - smoothstep(0.7, 0.95, uv.y)) * 0.65;
    // …et fond dans l'ivoire en bas du cadre.
    intensity *= smoothstep(0.0, 0.3, uv.y);

    vec3 paper = vec3(0.965, 0.953, 0.925);
    vec3 klein = vec3(0.141, 0.188, 0.910);
    vec3 deep  = vec3(0.035, 0.090, 0.500);

    vec3 color = paper;
    color = mix(color, klein, intensity * 0.85);
    color = mix(color, deep, intensity * intensity * 0.5);

    // Grain de film animé, marqué — la signature tactile du look.
    float grain = fract(sin(dot(uv * vec2(917.0, 533.0) + fract(uTime) * 71.0,
      vec2(12.9898, 78.233))) * 43758.5453);
    color += (grain - 0.5) * 0.085;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function VeilPlane() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { viewport, gl } = useThree();
  const target = useRef(new THREE.Vector2(0.7, 0.6));
  const smoothed = useRef(new THREE.Vector2(0.7, 0.6));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.7, 0.6) },
      uAspect: { value: 1.6 },
    }),
    [],
  );

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      target.current.set(
        (event.clientX - rect.left) / rect.width,
        1 - (event.clientY - rect.top) / rect.height,
      );
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [gl]);

  useFrame((_state, delta) => {
    if (!material.current) return;
    material.current.uniforms.uTime!.value += delta;
    material.current.uniforms.uAspect!.value = viewport.width / viewport.height;
    const lerp = 1 - Math.exp(-5 * delta); // la brume répond avec inertie
    smoothed.current.lerp(target.current, lerp);
    (material.current.uniforms.uPointer!.value as THREE.Vector2).copy(smoothed.current);
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function VeilCanvas() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden
    >
      <VeilPlane />
    </Canvas>
  );
}
