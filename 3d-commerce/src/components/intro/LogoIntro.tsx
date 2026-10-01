"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";
import gsap from "gsap";

const INTRO_KEY = "voxel3d-logo-intro-seen";
const LOGO_SRC = "/logo/voxel3d.svg";

const CLIPS = {
  cube: [0, 0, 0.23, 0.64] as const,
  word: [0.225, 0, 0.775, 0.64] as const,
  line: [0.11, 0.565, 0.815, 0.435] as const,
  threeD: [0.805, 0.565, 0.195, 0.435] as const,
};

type Clip = keyof typeof CLIPS;

function LogoLayer({
  clip,
  opacity,
  groupRef,
  position,
  z,
}: {
  clip: Clip;
  opacity: number;
  groupRef: RefObject<THREE.Group | null>;
  position: [number, number, number];
  z: number;
}) {
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(LOGO_SRC);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }, []);

  const [x, y, width, height] = CLIPS[clip];

  return (
    <group ref={groupRef} position={position} renderOrder={z}>
      <mesh>
        <planeGeometry args={[12.51, 3.28]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={{
            uMap: { value: texture },
            uClip: { value: new THREE.Vector4(x, 1 - y - height, width, height) },
            uOpacity: { value: opacity },
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform sampler2D uMap;
            uniform vec4 uClip;
            uniform float uOpacity;
            varying vec2 vUv;
            void main() {
              if (vUv.x < uClip.x || vUv.x > uClip.x + uClip.z ||
                  vUv.y < uClip.y || vUv.y > uClip.y + uClip.w) discard;
              vec4 color = texture2D(uMap, vUv);
              float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
              float alpha = smoothstep(0.008, 0.055, luminance) * uOpacity;
              if (alpha < 0.01) discard;
              gl_FragColor = vec4(color.rgb, alpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}

function CameraController({
  timelineStarted,
  refs,
}: {
  timelineStarted: boolean;
  refs: {
    camera: MutableRefObject<THREE.PerspectiveCamera | null>;
    stage: MutableRefObject<THREE.Group | null>;
    cube: MutableRefObject<THREE.Group | null>;
    word: MutableRefObject<THREE.Group | null>;
    line: MutableRefObject<THREE.Group | null>;
    threeD: MutableRefObject<THREE.Group | null>;
  };
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) refs.camera.current = camera;
  }, [camera, refs]);

  useFrame(() => camera.updateProjectionMatrix());

  useEffect(() => {
    if (!timelineStarted || !(camera instanceof THREE.PerspectiveCamera)) return;
    const { stage, cube, word, line, threeD } = refs;
    if (!stage.current || !cube.current || !word.current || !line.current || !threeD.current) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = [stage.current, cube.current, word.current, line.current, threeD.current];

    gsap.set(camera.position, { x: 0.28, y: 0.16, z: 13.7 });
    gsap.set(camera.rotation, { x: -0.05, y: 0.10, z: 0.008 });
    gsap.set(stage.current.scale, { x: 0.86, y: 0.86, z: 0.86 });
    gsap.set(cube.current.scale, { x: 0.78, y: 0.78, z: 0.78 });
    gsap.set(cube.current.rotation, { x: 0.10, y: -0.42, z: -0.06 });
    gsap.set(word.current.position, { x: 0.62, y: 0, z: -0.06 });
    gsap.set(word.current.scale, { x: 0.82, y: 0.82, z: 0.82 });
    gsap.set(line.current.position, { x: -4.63, y: -0.12, z: -0.12 });
    gsap.set(line.current.scale, { x: 0.001, y: 1, z: 1 });
    gsap.set(threeD.current.position, { x: 1.16, y: -0.05, z: -0.18 });
    gsap.set(threeD.current.scale, { x: 0.68, y: 0.68, z: 0.68 });

    if (reduced) {
      gsap.set(targets, { clearProps: "all" });
      return;
    }

    const tl = gsap.timeline();
    tl.to(stage.current.scale, { x: 1, y: 1, z: 1, duration: 0.28, ease: "power3.out" }, 0)
      .to(camera.position, { x: 0, y: 0, z: 12.55, duration: 0.52, ease: "power3.out" }, 0)
      .to(camera.rotation, { x: 0, y: 0, z: 0, duration: 0.62, ease: "power3.inOut" }, 0)
      .to(cube.current.rotation, { x: 0, y: 0, z: 0, duration: 0.52, ease: "back.out(1.7)" }, 0.06)
      .to(cube.current.scale, { x: 1, y: 1, z: 1, duration: 0.48, ease: "back.out(1.4)" }, 0.06)
      .to(word.current.position, { x: 0, duration: 0.5, ease: "power3.out" }, 0.38)
      .to(word.current.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "power3.out" }, 0.38)
      .to(line.current.position, { x: -0.41, duration: 0.62, ease: "power2.inOut" }, 0.84)
      .to(line.current.scale, { x: 1, duration: 0.62, ease: "power2.inOut" }, 0.84)
      .to(threeD.current.position, { x: 0, duration: 0.38, ease: "power3.out" }, 1.22)
      .to(threeD.current.scale, { x: 1, y: 1, z: 1, duration: 0.38, ease: "back.out(1.5)" }, 1.22)
      .to(camera.position, { x: -0.16, y: 0.05, z: 12.8, duration: 0.38, ease: "power2.inOut" }, 1.42)
      .to(camera.rotation, { x: 0.006, y: -0.012, z: -0.004, duration: 0.38, ease: "power2.inOut" }, 1.42);

    return () => tl.kill();
  }, [refs, timelineStarted]);

  return null;
}

function LogoScene({ timelineStarted }: { timelineStarted: boolean }) {
  const refs = useMemo(() => ({
    camera: { current: null } as MutableRefObject<THREE.PerspectiveCamera | null>,
    stage: { current: null } as MutableRefObject<THREE.Group | null>,
    cube: { current: null } as MutableRefObject<THREE.Group | null>,
    word: { current: null } as MutableRefObject<THREE.Group | null>,
    line: { current: null } as MutableRefObject<THREE.Group | null>,
    threeD: { current: null } as MutableRefObject<THREE.Group | null>,
  }), []);

  return (
    <>
      <CameraController timelineStarted={timelineStarted} refs={refs} />
      <group ref={refs.stage}>
        <LogoLayer clip="cube" opacity={1} groupRef={refs.cube} position={[0, 0, 0.16]} z={4} />
        <LogoLayer clip="word" opacity={1} groupRef={refs.word} position={[0, 0, 0]} z={3} />
        <LogoLayer clip="line" opacity={1} groupRef={refs.line} position={[0, 0, -0.08]} z={2} />
        <LogoLayer clip="threeD" opacity={1} groupRef={refs.threeD} position={[0, 0, -0.16]} z={1} />
      </group>
    </>
  );
}

export function LogoIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(true);
  const [timelineStarted, setTimelineStarted] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.sessionStorage.getItem(INTRO_KEY) === "1") {
      setShow(false);
      return;
    }

    setTimelineStarted(true);
    const finish = window.setTimeout(() => {
      window.sessionStorage.setItem(INTRO_KEY, "1");
      gsap.to(rootRef.current, {
        opacity: 0,
        duration: reduced ? 0.05 : 0.28,
        ease: "power3.inOut",
        onComplete: () => setShow(false),
      });
    }, reduced ? 450 : 2050);

    return () => window.clearTimeout(finish);
  }, []);

  if (!show) return null;

  return (
    <div ref={rootRef} aria-hidden="true" className="fixed inset-0 z-[300] overflow-hidden bg-[#050507]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(100,84,162,0.18),transparent_52%)]" />
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 13.7], fov: 28, near: 0.1, far: 100 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <LogoScene timelineStarted={timelineStarted} />
      </Canvas>
    </div>
  );
}
