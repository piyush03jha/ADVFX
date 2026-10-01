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

const POUR_START = new THREE.Vector3(-4.05, -1.02, 0);
const POUR_STRAIGHT_END = new THREE.Vector3(3.15, -1.02, 0);
const POUR_CURVE_END = new THREE.Vector3(3.15, -0.28, 0);

function createTurnCurve() {
  const radius = 0.74;
  const k = 0.5522848;
  const center = new THREE.Vector3(3.15, -0.28, 0);

  return new THREE.CubicBezierCurve3(
    POUR_STRAIGHT_END,
    new THREE.Vector3(center.x + radius * k, center.y - radius, 0),
    new THREE.Vector3(center.x + radius, center.y - radius * k, 0),
    POUR_CURVE_END,
  );
}

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
              if (vUv.y > 0.17 && vUv.y < 0.24) discard;
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
  curveRef,
  nozzleRef,
  glowRef,
  dropRef,
}: {
  lineRef: MutableRefObject<THREE.Group | null>;
  curveRef: MutableRefObject<THREE.Mesh | null>;
  nozzleRef: MutableRefObject<THREE.Group | null>;
  glowRef: MutableRefObject<THREE.Mesh | null>;
  dropRef: MutableRefObject<THREE.Mesh | null>;
}) {
  const turnCurve = useMemo(() => createTurnCurve(), []);

  const curveGeometry = useMemo(() => {
    const geometry = new THREE.TubeGeometry(turnCurve, 40, 0.020, 8, false);
    geometry.setDrawRange(0, 0);
    return geometry;
  }, [turnCurve]);

  useEffect(() => () => curveGeometry.dispose(), [curveGeometry]);

  const straightLength = POUR_START.distanceTo(POUR_STRAIGHT_END);

  return (
    <group>
      {/* The stroke is deliberately simple: long straight run first. */}
      <group ref={lineRef} position={[POUR_START.x, POUR_START.y, 0.05]}>
        <mesh position={[straightLength / 2, 0, 0]}>
          <planeGeometry args={[straightLength, 0.042]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.98} />
        </mesh>
        <mesh position={[straightLength / 2, 0, -0.01]} scale={[1, 3.0, 1]}>
          <planeGeometry args={[straightLength, 0.042]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.10}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* Exact quarter-turn: horizontal → rounded 90° → vertical into the icon. */}
      <mesh ref={curveRef} geometry={curveGeometry} position={[0, 0, 0.05]}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.98} />
      </mesh>

      {/* Minimal 3D printer nozzle. Its origin is the tip so the white filament
          always appears to come directly from the nozzle and follows its path. */}
      <group
        ref={nozzleRef}
        position={[POUR_START.x, POUR_START.y, 0.24]}
        rotation={[0, 0, -0.34]}
      >
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.145, 0.16, 0.46, 8]} />
          <meshStandardMaterial color="#202027" metalness={0.85} roughness={0.24} />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.09, 16]} />
          <meshStandardMaterial color="#d9d9df" metalness={0.9} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0.09, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.155, 0.20, 8]} />
          <meshStandardMaterial color="#e9e9ee" metalness={0.92} roughness={0.16} />
        </mesh>
        <mesh position={[0, 0.49, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.48, 8]} />
          <meshStandardMaterial color="#09090d" metalness={0.65} roughness={0.28} />
        </mesh>
      </group>

      <mesh ref={glowRef} position={[POUR_START.x, POUR_START.y, 0.16]} scale={[1.15, 1.15, 1.15]}>
        <circleGeometry args={[0.065, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={dropRef} position={[POUR_START.x, POUR_START.y, 0.16]} scale={[0.001, 0.001, 0.001]}>
        <sphereGeometry args={[0.030, 12, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
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

    gsap.set(cube.current.scale, { x: 0.72, y: 0.72, z: 0.72 });
    gsap.set(cube.current.rotation, { x: 0.18, y: -0.42, z: -0.08 });

    gsap.set(word.current.scale, { x: 0.82, y: 0.82, z: 0.82 });
    gsap.set(word.current.position, { x: 2.10, y: 0.05, z: -0.04 });

    gsap.set(threeD.current.scale, { x: 0.68, y: 0.68, z: 0.68 });
    gsap.set(threeD.current.position, { x: -3.15, y: 0.02, z: -0.08 });

    gsap.set(line.current.scale, { x: 0.001, y: 1, z: 1 });
    gsap.set(line.current.position, { x: POUR_START.x, y: POUR_START.y, z: 0.05 });
    curve.current.geometry.setDrawRange(0, 0);

    gsap.set(nozzle.current.position, { x: 5.45, y: POUR_START.y, z: 0.24 });
    gsap.set(nozzle.current.rotation, { z: 0 });
    gsap.set(nozzle.current.scale, { x: 0.82, y: 0.82, z: 0.82 });

    gsap.set(glowMaterial, { opacity: 0 });
    gsap.set(drop.current.scale, { x: 0.001, y: 0.001, z: 0.001 });
    gsap.set(dropMaterial, { opacity: 0.9 });

    if (reduced) {
      gsap.set(cubeMaterial.current.uniforms.uOpacity, { value: 1 });
      gsap.set(wordMaterial.current.uniforms.uOpacity, { value: 1 });
      gsap.set(threeDMaterial.current.uniforms.uOpacity, { value: 1 });
      gsap.set([cube.current, word.current, threeD.current], { clearProps: "transform" });
      gsap.set(line.current.scale, { x: 1, y: 1, z: 1 });
      gsap.set(curve.current.geometry, { drawRange: { start: 0, count: curve.current.geometry.index?.count ?? 0 } });
      gsap.set(nozzle.current.position, { x: POUR_CURVE_END.x, y: POUR_CURVE_END.y, z: 0.24 });
      gsap.set(nozzle.current.rotation, { z: 0 });
      return;
    }

    const tl = gsap.timeline();

    // 0.00–0.18: camera enters while the nozzle arrives.
    // The complete sequence is intentionally compact so the intro stays under ~2 seconds.

    // 0.08–1.14: straight right → left, then a smooth 90° turn upward into the icon.
    const curveIndexCount = curve.current.geometry.index?.count ?? 0;
    const curveProgress = { value: 0 };
    const turnCurve = createTurnCurve();

    tl.to(cubeMaterial.current.uniforms.uOpacity, {
      value: 1,
      duration: 0.18,
      ease: "power2.out",
    }, 1.38)
      // Enter from the right and settle onto the exact start of the logo stroke.
      .fromTo(nozzle.current.position,
        { x: POUR_START.x - 1.15, y: POUR_START.y + 0.45, z: 0.24 },
        {
          x: POUR_START.x,
          y: POUR_START.y,
          duration: 0.28,
          ease: "power3.out",
        },
        0.08,
      )
      .to(nozzle.current.position, {
        x: POUR_STRAIGHT_END.x,
        y: POUR_STRAIGHT_END.y,
        duration: 0.78,
        ease: "none",
      }, 0.42)
      .to(line.current.scale, {
        x: 1,
        duration: 0.78,
        ease: "none",
      }, 0.42)
      .to(glowMaterial, {
        opacity: 0.56,
        duration: 0.12,
        ease: "power2.out",
      }, 0.20)
      .to(drop.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.08,
        ease: "power2.out",
      }, 0.42)
      // Follow the quarter-circle and rotate the applicator with the path.
      .to(curveProgress, {
        value: 1,
        duration: 0.26,
        ease: "power2.inOut",
        onUpdate: () => {
          const p = curveProgress.value;
          const point = turnCurve.getPointAt(p);
          curve.current?.geometry.setDrawRange(
            0,
            Math.max(1, Math.floor(curveIndexCount * p)),
          );

          nozzle.current?.position.set(point.x, point.y, 0.24);
          nozzle.current?.rotation.set(0, 0, THREE.MathUtils.lerp(-0.34, Math.PI / 2, p));

          glow.current?.position.set(point.x, point.y, 0.16);
          drop.current?.position.set(point.x, point.y, 0.16);
        },
      }, 1.20)
      .to(drop.current.scale, {
        x: 0.001,
        y: 0.001,
        z: 0.001,
        duration: 0.10,
        ease: "power2.in",
      }, 1.22);

    // 1.50–1.80: the applicator disappears into the icon, then the logo resolves.
    tl.to(nozzle.current.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 0.14,
      ease: "power2.in",
    }, 1.24)
      .to(glowMaterial, {
        opacity: 0,
        duration: 0.14,
        ease: "power2.out",
      }, 1.24);

    // 1.50–1.95: the icon resolves first, followed by VOXEL and 3D.
    tl.to(cube.current, {
      scale: 1,
      rotation: { x: 0, y: 0, z: 0 },
      duration: 0.18,
      ease: "back.out(1.7)",
    }, 1.38)
      .to(wordMaterial.current.uniforms.uOpacity, {
        value: 1,
        duration: 0.20,
        ease: "power2.out",
      }, 1.50)
      .to(word.current.position, {
        x: 2.10,
        y: 0.05,
        duration: 0.20,
        ease: "power3.out",
      }, 1.50)
      .to(threeDMaterial.current.uniforms.uOpacity, {
        value: 1,
        duration: 0.18,
        ease: "power2.out",
      }, 1.68)
      .to(threeD.current.position, {
        x: -3.15,
        y: 0.02,
        duration: 0.18,
        ease: "back.out(1.5)",
      }, 1.68)
      .to(camera.position, {
        x: 0.05,
        y: 0.02,
        z: 12.82,
        duration: 0.24,
        ease: "power2.inOut",
      }, 1.68)
      .to(camera.rotation, {
        x: 0.005,
        y: -0.012,
        z: -0.004,
        duration: 0.24,
        ease: "power2.inOut",
      }, 1.68);

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
    curve: { current: null } as MutableRefObject<THREE.Mesh | null>,
    nozzle: { current: null } as MutableRefObject<THREE.Group | null>,
    glow: { current: null } as MutableRefObject<THREE.Mesh | null>,
    drop: { current: null } as MutableRefObject<THREE.Mesh | null>,
  }), []);

  return (
    <>
      <CameraController timelineStarted={timelineStarted} refs={refs} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 4, 6]} intensity={2.4} />
      <pointLight color="#a855f7" position={[-4, 1, 4]} intensity={8} distance={14} />
      <group ref={refs.stage}>
        <LogoLayer clip="cube" opacity={0} groupRef={refs.cube} materialRef={refs.cubeMaterial} position={[3.15, -0.02, 0.16]} z={4} />
        <LogoLayer clip="word" opacity={0} groupRef={refs.word} materialRef={refs.wordMaterial} position={[0, 0, 0]} z={3} />
        <LogoLayer clip="threeD" opacity={0} groupRef={refs.threeD} materialRef={refs.threeDMaterial} position={[0, 0, -0.16]} z={2} />
        <PouringLine
          lineRef={refs.line}
          curveRef={refs.curve}
          nozzleRef={refs.nozzle}
          glowRef={refs.glow}
          dropRef={refs.drop}
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
    }, reduced ? 500 : 1980);

    return () => window.clearTimeout(finish);
  }, []);

  if (!show) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[300] overflow-hidden bg-[#050507]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(100,84,162,0.18),transparent_52%)]" />

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
