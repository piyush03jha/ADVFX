"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import gsap from "gsap";

const LINE_START = new THREE.Vector3(-4.2, -1.0, 1);
const LINE_END = new THREE.Vector3(4.2, -1.0, 1);

function PouringLine({
  lineRef,
}: {
  lineRef: MutableRefObject<THREE.Group | null>;
}) {
  const length = LINE_END.x - LINE_START.x;

  return (
    <group
      ref={lineRef}
      position={[LINE_START.x, LINE_START.y, LINE_START.z]}
      scale={[0.001, 1, 1]}
    >
      <mesh position={[length / 2, 0, 0]} renderOrder={10}>
        <planeGeometry args={[length, 0.045]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={1}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      <mesh
        position={[length / 2, 0, -0.01]}
        scale={[1, 3, 1]}
        renderOrder={9}
      >
        <planeGeometry args={[length, 0.045]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function LineController({
  lineRef,
  timelineStarted,
}: {
  lineRef: MutableRefObject<THREE.Group | null>;
  timelineStarted: boolean;
}) {
  useEffect(() => {
    if (!timelineStarted || !lineRef.current) return;

    const line = lineRef.current;

    gsap.killTweensOf(line.scale);

    gsap.set(line.scale, {
      x: 0.001,
      y: 1,
      z: 1,
    });

    const timeline = gsap.timeline();

    timeline.to(line.scale, {
      x: 1,
      duration: 2,
      ease: "none",
    });

    return () => timeline.kill();
  }, [lineRef, timelineStarted]);

  return null;
}

function LogoScene({
  timelineStarted,
}: {
  timelineStarted: boolean;
}) {
  const lineRef = useRef<THREE.Group | null>(null);

  return (
    <>
      <LineController
        lineRef={lineRef}
        timelineStarted={timelineStarted}
      />

      <PouringLine lineRef={lineRef} />
    </>
  );
}

export function LogoIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(true);
  const [timelineStarted, setTimelineStarted] = useState(false);

  useEffect(() => {
    setTimelineStarted(true);

    const finish = window.setTimeout(() => {
      gsap.to(rootRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: "power3.inOut",
        onComplete: () => setShow(false),
      });
    }, 5000);

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
        camera={{
          position: [0, 0, 13.7],
          fov: 28,
          near: 0.1,
          far: 100,
        }}
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
