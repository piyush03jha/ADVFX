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
  nozzleRef,
  glowRef,
  dropRef,
}: {
  lineRef: MutableRefObject<THREE.Group | null>;
  nozzleRef: MutableRefObject<THREE.Group | null>;
  glowRef: MutableRefObject<THREE.Mesh | null>;
  dropRef: MutableRefObject<THREE.Mesh | null>;
}) {
  return (
    <group>
      <group ref={lineRef} position={[-4.18, -0.96, 0.05]} scale={[0.001, 1, 1]}>
        <mesh>
          <planeGeometry args={[8.38, 0.045]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.98} />
        </mesh>
        <mesh position={[0, 0, -0.01]} scale={[1, 3.8, 1]}>
          <planeGeometry args={[8.38, 0.045]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.11} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      <group ref={nozzleRef} position={[5.75, -0.96, 0.24]} rotation={[0, 0, Math.PI]}>
        <mesh position={[0.12, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.16, 0.62, 18]} />
          <meshBasicMaterial color="#f7f7ff" />
        </mesh>
        <mesh position={[-0.26, 0, 0]}>
          <coneGeometry args={[0.16, 0.28, 18]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.43, 0, 0]}>
          <sphereGeometry args={[0.055, 16, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.44, 0, -0.01]}>
          <planeGeometry args={[0.16, 0.16]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      <mesh ref={glowRef} position={[5.31, -0.96, 0.16]} scale={[1.8, 1.8, 1.8]}>
        <circleGeometry args={[0.11, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={dropRef} position={[5.27, -1.16, 0.16]} scale={[0.001, 0.001, 0.001]}>
        <sphereGeometry args={[0.045, 12, 8]} />
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
      !nozzle.current ||
      !glow.current ||
      !drop.current
    ) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.set(camera.position, { x: 0.42, y: 0.12, z: 13.9 });
    gsap.set(camera.rotation, { x: -0.045, y: 0.075, z: 0.006 });

    gsap.set(stage.current.scale, { x: 0.9, y: 0.9, z: 0.9 });

    gsap.set(cubeMaterial.current.uniforms.uOpacity, { value: 0 });
    gsap.set(wordMaterial.current.uniforms.uOpacity, { value: 0 });
    gsap.set(threeDMaterial.current.uniforms.uOpacity, { value: 0 });

    gsap.set(cube.current, {
      scale: 0.72,
      rotation: { x: 0.18, y: -0.42, z: -0.08 },
    });

    gsap.set(word.current, {
      scale: 0.82,
      position: { x: 0.25, y: 0.08, z: -0.04 },
    });

    gsap.set(threeD.current, {
      scale: 0.68,
      position: { x: 0.45, y: 0.06, z: -0.08 },
    });

    gsap.set(line.current.scale, { x: 0.001, y: 1, z: 1 });
    gsap.set(line.current.position, { x: -4.18, y: -0.96, z: 0.05 });

    gsap.set(nozzle.current.position, { x: 5.75, y: -0.96, z: 0.24 });
    gsap.set(nozzle.current.rotation, { z: Math.PI });
    gsap.set(nozzle.current.scale, { x: 0.82, y: 0.82, z: 0.82 });

    gsap.set(glow.current.material, { opacity: 0 });
    gsap.set(drop.current.scale, { x: 0.001, y: 0.001, z: 0.001 });

    if (reduced) {
      gsap.set(cubeMaterial.current.uniforms.uOpacity, { value: 1 });
      gsap.set(wordMaterial.current.uniforms.uOpacity, { value: 1 });
      gsap.set(threeDMaterial.current.uniforms.uOpacity, { value: 1 });
      gsap.set([cube.current, word.current, threeD.current], { clearProps: "transform" });
      gsap.set(line.current.scale, { x: 1, y: 1, z: 1 });
      gsap.set(nozzle.current.position, { x: 4.18, y: -0.96, z: 0.24 });
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

    // 0.10–1.05: nozzle sweeps right → left while the white line pours behind it.
    tl.to(cubeMaterial.current.uniforms.uOpacity, { value: 1, duration: 0.34, ease: "power2.out" }, 1.27)
      .to(nozzle.current.position, {
      x: -4.18,
      duration: 0.82,
      ease: "power2.inOut",
    }, 0.16)
      .to(line.current.scale, {
        x: 1,
        duration: 0.82,
        ease: "power2.inOut",
      }, 0.16)
      .to(glow.current.material, {
        opacity: 0.78,
        duration: 0.12,
        ease: "power2.out",
      }, 0.16)
      .to(drop.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.12,
        ease: "back.out(2)",
      }, 0.36)
      .to(drop.current.position, {
        x: 1.1,
        duration: 0.46,
        ease: "none",
      }, 0.36)
      .to(drop.current.scale, {
        x: 0.001,
        y: 0.001,
        z: 0.001,
        duration: 0.18,
        ease: "power2.in",
      }, 0.78);

    // 1.05–1.32: nozzle returns to its final right-side seat and settles.
    tl.to(nozzle.current.position, {
      x: 4.18,
      duration: 0.27,
      ease: "power3.out",
    }, 1.03)
      .to(nozzle.current.rotation, {
        z: Math.PI + 0.045,
        duration: 0.18,
        ease: "power2.out",
      }, 1.03)
      .to(nozzle.current.rotation, {
        z: Math.PI,
        duration: 0.16,
        ease: "back.out(2)",
      }, 1.21)
      .to(glow.current.material, {
        opacity: 0.28,
        duration: 0.18,
        ease: "sine.out",
      }, 1.06);

    // 1.27–1.82: once the line is settled, the actual logo is born.
    tl.to(cube.current, {
      scale: 1,
      rotation: { x: 0, y: 0, z: 0 },
      duration: 0.34,
      ease: "back.out(1.7)",
    }, 1.27)
      .to(wordMaterial.current.uniforms.uOpacity, {
        value: 1,
        duration: 0.42,
        ease: "power2.out",
      }, 1.39)
      .to(word.current, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.42,
        ease: "power3.out",
      }, 1.39)
      .to(threeDMaterial.current.uniforms.uOpacity, {
        value: 1,
        duration: 0.34,
        ease: "power2.out",
      }, 1.51)
      .to(threeD.current, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.34,
        ease: "back.out(1.5)",
      }, 1.51)
      .to(camera.position, {
        x: -0.14,
        y: 0.035,
        z: 12.82,
        duration: 0.38,
        ease: "power2.inOut",
      }, 1.55)
      .to(camera.rotation, {
        x: 0.005,
        y: -0.012,
        z: -0.004,
        duration: 0.38,
        ease: "power2.inOut",
      }, 1.55);

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
