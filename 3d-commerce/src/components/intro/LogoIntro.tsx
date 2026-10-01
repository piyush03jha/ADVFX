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
  const straightStart = new THREE.Vector3(3.813, -1.034, 0);
  const straightEnd = new THREE.Vector3(-4.62, -1.034, 0);

  const curveGeometry = useMemo(() => {
    // A smooth quarter-turn: horizontal travel → upward turn into the icon.
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-4.62, -1.034, 0),
      new THREE.Vector3(-4.98, -1.034, 0),
      new THREE.Vector3(-5.22, -0.80, 0),
      new THREE.Vector3(-5.22, -0.43, 0),
    );

    const geometry = new THREE.TubeGeometry(curve, 32, 0.019, 8, false);
    geometry.setDrawRange(0, 0);
    return geometry;
  }, []);

  useEffect(() => {
    return () => curveGeometry.dispose();
  }, [curveGeometry]);

  const straightLength = straightStart.distanceTo(straightEnd);
  const curveEnd = new THREE.Vector3(-5.22, -0.43, 0);

  return (
    <group>
      {/* Straight stroke: clean right → left. */}
      <group ref={lineRef} position={[straightStart.x, straightStart.y, 0.05]}>
        <mesh position={[-straightLength / 2, 0, 0]}>
          <planeGeometry args={[straightLength, 0.038]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.98} />
        </mesh>
        <mesh position={[-straightLength / 2, 0, -0.01]} scale={[1, 3.2, 1]}>
          <planeGeometry args={[straightLength, 0.038]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* The 90° turn is a real curve, revealed progressively with BufferGeometry.drawRange. */}
      <mesh ref={curveRef} geometry={curveGeometry} position={[0, 0, 0.05]}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.98} />
      </mesh>

      <group
        ref={nozzleRef}
        position={[5.55, straightStart.y, 0.24]}
        rotation={[0, 0, -Math.PI / 2]}
      >
        <mesh position={[0.18, 0, 0]}>
          <capsuleGeometry args={[0.105, 0.38, 8, 16]} />
          <meshBasicMaterial color="#f5f5fa" />
        </mesh>
        <mesh position={[-0.12, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.09, 0.24, 20]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.27, 0, 0]}>
          <cylinderGeometry args={[0.052, 0.052, 0.045, 20]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.295, 0, 0]}>
          <circleGeometry args={[0.045, 24]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      <mesh
        ref={glowRef}
        position={[5.3, straightStart.y, 0.16]}
        scale={[1.25, 1.25, 1.25]}
      >
        <circleGeometry args={[0.075, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh
        ref={dropRef}
        position={[5.27, straightStart.y, 0.16]}
        scale={[0.001, 0.001, 0.001]}
      >
        <sphereGeometry args={[0.035, 12, 8]} />
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
    gsap.set(word.current.position, { x: 0.25, y: 0.08, z: -0.04 });

    gsap.set(threeD.current.scale, { x: 0.68, y: 0.68, z: 0.68 });
    gsap.set(threeD.current.position, { x: 0.45, y: 0.06, z: -0.08 });

    gsap.set(line.current.scale, { x: 0.001, y: 1, z: 1 });
    gsap.set(line.current.position, { x: 3.813, y: -1.034, z: 0.05 });
    curve.current.geometry.setDrawRange(0, 0);

    gsap.set(nozzle.current.position, { x: 5.55, y: -1.034, z: 0.24 });
    gsap.set(nozzle.current.rotation, { z: -Math.PI / 2 });
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
      gsap.set(nozzle.current.position, { x: -5.22, y: -0.43, z: 0.24 });
      gsap.set(nozzle.current.rotation, { z: 0 });
      return;
    }

    const tl = gsap.timeline();

    // 0.00–0.30: camera gently enters the scene while the nozzle arrives.
    tl.to(camera.position, {
      x: 0.05,
      y: 0.02,
      z: 12.7,
      duration: 0.52,
      ease: "power3.out",
    }, 0)
      .to(camera.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.62,
        ease: "power3.inOut",
      }, 0)
      .to(stage.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.48,
        ease: "power3.out",
      }, 0);

    // 0.08–1.25: straight pour from right → left, then a smooth 90° upward turn.
    const curveIndexCount = curve.current.geometry.index?.count ?? 0;
    const curveProgress = { count: 0 };

    tl.to(cubeMaterial.current.uniforms.uOpacity, { value: 1, duration: 0.28, ease: "power2.out" }, 1.50)
      .to(nozzle.current.position, {
        x: 3.813,
        y: -1.034,
        duration: 0.22,
        ease: "power3.out",
      }, 0.08)
      .to(nozzle.current.position, {
        x: -4.62,
        y: -1.034,
        duration: 0.86,
        ease: "none",
      }, 0.30)
      .to(line.current.scale, {
        x: 1,
        duration: 0.86,
        ease: "none",
      }, 0.30)
      .to(glowMaterial, {
        opacity: 0.58,
        duration: 0.12,
        ease: "power2.out",
      }, 0.28)
      .to(drop.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.1,
        ease: "back.out(2)",
      }, 0.38)
      .to(drop.current.position, {
        x: -4.62,
        y: -1.034,
        duration: 0.86,
        ease: "none",
      }, 0.38)
      .to(curveProgress, {
        count: curveIndexCount,
        duration: 0.34,
        ease: "power2.inOut",
        onUpdate: () => curve.current?.geometry.setDrawRange(0, Math.floor(curveProgress.count)),
      }, 1.16)
      .to(nozzle.current.position, {
        x: -5.22,
        y: -0.43,
        duration: 0.34,
        ease: "power2.inOut",
      }, 1.16)
      .to(nozzle.current.rotation, {
        z: 0,
        duration: 0.34,
        ease: "power2.inOut",
      }, 1.16)
      .to(drop.current.position, {
        x: -5.22,
        y: -0.43,
        duration: 0.34,
        ease: "none",
      }, 1.16)
      .to(drop.current.scale, {
        x: 0.001,
        y: 0.001,
        z: 0.001,
        duration: 0.1,
        ease: "power2.in",
      }, 1.42);

    // 1.50–1.80: the applicator disappears into the icon, then the logo resolves.
    tl.to(nozzle.current.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 0.16,
      ease: "power2.in",
    }, 1.48)
      .to(glowMaterial, {
        opacity: 0,
        duration: 0.16,
        ease: "power2.out",
      }, 1.48);

    // 1.50–1.95: the icon appears after the bend, then VOXEL and 3D resolve.
    tl.to(cube.current, {
      scale: 1,
      rotation: { x: 0, y: 0, z: 0 },
      duration: 0.28,
      ease: "back.out(1.7)",
    }, 1.50)
      .to(wordMaterial.current.uniforms.uOpacity, {
        value: 1,
        duration: 0.30,
        ease: "power2.out",
      }, 1.62)
      .to(word.current.position, {
        x: 0,
        y: 0,
        duration: 0.30,
        ease: "power3.out",
      }, 1.62)
      .to(threeDMaterial.current.uniforms.uOpacity, {
        value: 1,
        duration: 0.28,
        ease: "power2.out",
      }, 1.76)
      .to(threeD.current.position, {
        x: 0,
        y: 0,
        duration: 0.28,
        ease: "back.out(1.5)",
      }, 1.76)
      .to(camera.position, {
        x: -0.14,
        y: 0.035,
        z: 12.82,
        duration: 0.32,
        ease: "power2.inOut",
      }, 1.76)
      .to(camera.rotation, {
        x: 0.005,
        y: -0.012,
        z: -0.004,
        duration: 0.32,
        ease: "power2.inOut",
      }, 1.76);

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
      <group ref={refs.stage}>
        <LogoLayer clip="cube" opacity={0} groupRef={refs.cube} materialRef={refs.cubeMaterial} position={[0, 0, 0.16]} z={4} />
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
        duration: reduced ? 0.05 : 0.26,
        ease: "power3.inOut",
        onComplete: () => setShow(false),
      });
    }, reduced ? 500 : 2150);

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
