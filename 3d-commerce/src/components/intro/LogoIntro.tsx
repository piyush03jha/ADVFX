"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import gsap from "gsap";

const LINE_START = new THREE.Vector3(-4.2, -1.0, 1);
const LINE_END = new THREE.Vector3(4.2, -1.0, 1);

function Nozzle({
  nozzleRef,
}: {
  nozzleRef: MutableRefObject<THREE.Group | null>;
}) {
  return (
    <group
      ref={nozzleRef}
      position={[LINE_END.x, LINE_END.y, LINE_END.z + 0.08]}
    >
      {/* The group origin is the exact filament/nozzle tip.
          The nozzle body extends to the right, away from the filament. */}
      <mesh
        rotation={[0, 0, Math.PI / 2]}
        position={[0.55, 0, 0]}
      >
        <cylinderGeometry args={[0.16, 0.11, 0.8, 32]} />
        <meshStandardMaterial
          color="#d8d8dc"
          metalness={0.82}
          roughness={0.24}
        />
      </mesh>

      {/* Cone tip ends exactly at the group origin. */}
      <mesh
        rotation={[0, 0, Math.PI / 2]}
        position={[0.15, 0, 0]}
      >
        <coneGeometry args={[0.11, 0.3, 32]} />
        <meshStandardMaterial
          color="#bfc0c6"
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

function PouringLine({
  lineRef,
}: {
  lineRef: MutableRefObject<THREE.Group | null>;
}) {
  const length = LINE_END.x - LINE_START.x;

  return (
    <group
      ref={lineRef}
      position={[LINE_END.x, LINE_END.y, LINE_END.z]}
      scale={[-0.001, 1, 1]}
    >
      {/* Local geometry starts at x=0.
          Negative scale therefore reveals it from RIGHT -> LEFT. */}
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
  nozzleRef,
  timelineStarted,
}: {
  lineRef: MutableRefObject<THREE.Group | null>;
  nozzleRef: MutableRefObject<THREE.Group | null>;
  timelineStarted: boolean;
}) {
  useEffect(() => {
    if (!timelineStarted || !lineRef.current || !nozzleRef.current) return;

    const line = lineRef.current;
    const nozzle = nozzleRef.current;

    gsap.killTweensOf([line.scale, nozzle.position]);

    gsap.set(line.scale, {
      x: -0.001,
      y: 1,
      z: 1,
    });

    gsap.set(nozzle.position, {
      x: LINE_END.x,
      y: LINE_END.y,
      z: LINE_END.z + 0.08,
    });

    const timeline = gsap.timeline();

    // The filament begins exactly at the nozzle tip on the right
    // and reveals horizontally toward the left.
    timeline.to(
      line.scale,
      {
        x: -1,
        duration: 2,
        ease: "none",
      },
      0,
    );

    // Nozzle remains fixed for this isolated animation stage.
    return () => timeline.kill();
  }, [lineRef, nozzleRef, timelineStarted]);

  return null;
}

function LogoScene({
  timelineStarted,
}: {
  timelineStarted: boolean;
}) {
  const lineRef = useRef<THREE.Group | null>(null);
  const nozzleRef = useRef<THREE.Group | null>(null);

  return (
    <>
      <LineController
        lineRef={lineRef}
        nozzleRef={nozzleRef}
        timelineStarted={timelineStarted}
      />

      <PouringLine lineRef={lineRef} />
      <Nozzle nozzleRef={nozzleRef} />
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
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 4, 6]} intensity={2.4} />
        <pointLight
          color="#a855f7"
          position={[2, 1, 4]}
          intensity={7}
          distance={14}
        />
        <LogoScene timelineStarted={timelineStarted} />
      </Canvas>
    </div>
  );
}
