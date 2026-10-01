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
  threeD: [0.805, 0.565, 0.195, 0.435] as const,
};

// Right-hand end of the stroke = the left edge of the "3D" mark.
// The stroke spans the icon + VOXEL and stops where 3D begins.
// Step 1 only: a simple horizontal filament, revealing LEFT → RIGHT.
const LINE_START = new THREE.Vector3(-4.62, -1.03, 0);
const LINE_END = new THREE.Vector3(3.82, -1.03, 0);
type Clip = keyof typeof CLIPS;

function LogoLayer({
  clip,
  opacity,
  groupRef,
  position,
  z,
  materialRef,
}: {
  clip: Clip;
  opacity: number;
  groupRef: RefObject<THREE.Group | null>;
  materialRef: RefObject<THREE.ShaderMaterial | null>;
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
          ref={materialRef}
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
              if (vUv.y > 0.17 && vUv.y < 0.24 && vUv.x > 0.13 && vUv.x < 0.81) discard;
              vec4 color = texture2D(uMap, vUv);
              float alpha = max(color.r, max(color.g, color.b)) * uOpacity;
              if (alpha < 0.01) discard;
              gl_FragColor = vec4(color.rgb, alpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}

function PouringLine({
  lineRef,
  glowRef,
}: {
  lineRef: MutableRefObject<THREE.Group | null>;
  glowRef: MutableRefObject<THREE.Mesh | null>;
}) {
  const length = LINE_END.x - LINE_START.x;

  return (
    <group>
      <group
        ref={lineRef}
        position={[LINE_START.x, LINE_START.y, 0.05]}
        scale={[0.001, 1, 1]}
      >
        <mesh position={[length / 2, 0, 0]}>
          <planeGeometry args={[length, 0.042]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.98} />
        </mesh>
        <mesh position={[length / 2, 0, -0.01]} scale={[1, 2, 1]}>
          <planeGeometry args={[length, 0.042]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
      <mesh ref={glowRef} position={[LINE_START.x, LINE_START.y, 0.16]}>
        <circleGeometry args={[0.065, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
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
    cubeMaterial: MutableRefObject<THREE.ShaderMaterial | null>;
    word: MutableRefObject<THREE.Group | null>;
    wordMaterial: MutableRefObject<THREE.ShaderMaterial | null>;
    threeD: MutableRefObject<THREE.Group | null>;
    threeDMaterial: MutableRefObject<THREE.ShaderMaterial | null>;
    line: MutableRefObject<THREE.Group | null>;
    curve: MutableRefObject<THREE.Mesh | null>;
    nozzle: MutableRefObject<THREE.Group | null>;
    glow: MutableRefObject<THREE.Mesh | null>;
    drop: MutableRefObject<THREE.Mesh | null>;
  };
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) refs.camera.current = camera;
  }, [camera, refs]);

  useFrame(() => camera.updateProjectionMatrix());

  useEffect(() => {
    if (!timelineStarted || !(camera instanceof THREE.PerspectiveCamera)) return;

    const {
      stage,
      cube,
      word,
      wordMaterial,
      cubeMaterial,
      threeD,
      threeDMaterial,
      line,
      curve,
      nozzle,
      glow,
      drop,
    } = refs;

    if (
      !stage.current ||
      !cube.current ||
      !word.current ||
      !wordMaterial.current ||
      !cubeMaterial.current ||
      !threeD.current ||
      !threeDMaterial.current ||
      !line.current ||
      !curve.current ||
      !nozzle.current ||
      !glow.current ||
      !drop.current
    ) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const glowMaterial = glow.current.material as THREE.MeshBasicMaterial;
    const dropMaterial = drop.current.material as THREE.MeshBasicMaterial;

    gsap.set(camera.position, { x: 0.42, y: 0.12, z: 13.9 });
    gsap.set(camera.rotation, { x: -0.045, y: 0.075, z: 0.006 });

    gsap.set(stage.current.scale, { x: 0.9, y: 0.9, z: 0.9 });
    gsap.set(cubeMaterial.current.uniforms.uOpacity, { value: 0 });
    gsap.set(wordMaterial.current.uniforms.uOpacity, { value: 0 });
    gsap.set(threeDMaterial.current.uniforms.uOpacity, { value: 0 });

    gsap.set(line.current.scale, { x: 0.001, y: 1, z: 1 });
    gsap.set(line.current.position, {
      x: LINE_START.x,
      y: LINE_START.y,
      z: 0.05,
    });
    gsap.set(glowMaterial, { opacity: 0 });

    if (reduced) {
      gsap.set(line.current.scale, { x: 1, y: 1, z: 1 });
      return;
    }

    // STEP 1 ONLY: reveal the white line from LEFT → RIGHT.
    const tl = gsap.timeline();

    tl.to(line.current.scale, {
      x: 1,
      duration: 1.6,
      ease: "none",
    }, 0)
      .to(glowMaterial, {
        opacity: 0.65,
        duration: 0.15,
      }, 0);

    return () => tl.kill();
  }, [refs, timelineStarted]);

  return null;
}

function LogoScene({ timelineStarted }: { timelineStarted: boolean }) {
  const refs = useMemo(() => ({
    camera: { current: null } as MutableRefObject<THREE.PerspectiveCamera | null>,
    stage: { current: null } as MutableRefObject<THREE.Group | null>,
    cube: { current: null } as MutableRefObject<THREE.Group | null>,
    cubeMaterial: { current: null } as MutableRefObject<THREE.ShaderMaterial | null>,
    word: { current: null } as MutableRefObject<THREE.Group | null>,
    wordMaterial: { current: null } as MutableRefObject<THREE.ShaderMaterial | null>,
    threeD: { current: null } as MutableRefObject<THREE.Group | null>,
    threeDMaterial: { current: null } as MutableRefObject<THREE.ShaderMaterial | null>,
    line: { current: null } as MutableRefObject<THREE.Group | null>,
    glow: { current: null } as MutableRefObject<THREE.Mesh | null>,
  }), []);

  return (
    <>
      <CameraController timelineStarted={timelineStarted} refs={refs} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 4, 6]} intensity={2.4} />
      <pointLight color="#a855f7" position={[-4, 1, 4]} intensity={8} distance={14} />
      <group ref={refs.stage}>
          <PouringLine
          lineRef={refs.line}
          glowRef={refs.glow}
        />
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
        duration: reduced ? 0.05 : 0.20,
        ease: "power3.inOut",
        onComplete: () => setShow(false),
      });
    }, reduced ? 500 : 5000);

    return () => window.clearTimeout(finish);
  }, []);

  if (!show) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[300] overflow-hidden bg-[#11131b]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(132,108,190,0.22),rgba(17,19,27,0.96)_68%)]" />

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 13.7], fov: 28, near: 0.1, far: 100 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <LogoScene timelineStarted={timelineStarted} />
      </Canvas>
    </div>
  );
}
