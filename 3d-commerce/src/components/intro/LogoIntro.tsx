"use client";

import { Canvas } from "@react-three/fiber";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import gsap from "gsap";

const LINE_START = new THREE.Vector3(4.2, -1.0, 1);
const HORIZONTAL_END = new THREE.Vector3(-3.2, -1.0, 1);
const CURVE_CONTROL = new THREE.Vector3(-4.2, -1.0, 1);
const CURVE_END = new THREE.Vector3(-4.2, 0, 1);
const VERTICAL_END = new THREE.Vector3(-4.2, 2.2, 1);

const CURVE_SAMPLES = 96;

function createFilamentPoints() {
  const points: THREE.Vector3[] = [];

  // Straight horizontal section: right -> left.
  for (let i = 0; i <= 48; i += 1) {
    const t = i / 48;
    points.push(new THREE.Vector3().lerpVectors(LINE_START, HORIZONTAL_END, t));
  }

  // Smooth 90-degree transition:
  // horizontal tangent -> vertical tangent.
  const curve = new THREE.QuadraticBezierCurve3(
    HORIZONTAL_END,
    CURVE_CONTROL,
    CURVE_END,
  );

  points.push(...curve.getPoints(CURVE_SAMPLES).slice(1));

  // Straight vertical section after the turn.
  for (let i = 1; i <= 32; i += 1) {
    const t = i / 32;
    points.push(new THREE.Vector3().lerpVectors(CURVE_END, VERTICAL_END, t));
  }

  return points;
}

function Filament({
  lineRef,
  glowRef,
}: {
  lineRef: MutableRefObject<THREE.Line | null>;
  glowRef: MutableRefObject<THREE.Line | null>;
}) {
  const points = useMemo(() => createFilamentPoints(), []);

  const geometry = useMemo(() => {
    const nextGeometry = new THREE.BufferGeometry().setFromPoints(points);
    nextGeometry.setDrawRange(0, 1);
    return nextGeometry;
  }, [points]);

  const glowGeometry = useMemo(() => {
    const nextGeometry = new THREE.BufferGeometry().setFromPoints(points);
    nextGeometry.setDrawRange(0, 1);
    return nextGeometry;
  }, [points]);

  return (
    <>
      <line ref={lineRef} geometry={geometry} renderOrder={10}>
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={1}
          linewidth={2}
          depthTest={false}
          depthWrite={false}
        />
      </line>

      <line ref={glowRef} geometry={glowGeometry} renderOrder={9}>
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.16}
          linewidth={6}
          depthTest={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </line>
    </>
  );
}

function LineController({
  lineRef,
  glowRef,
  timelineStarted,
}: {
  lineRef: MutableRefObject<THREE.Line | null>;
  glowRef: MutableRefObject<THREE.Line | null>;
  timelineStarted: boolean;
}) {
  useEffect(() => {
    if (!timelineStarted || !lineRef.current || !glowRef.current) return;

    const line = lineRef.current;
    const glow = glowRef.current;

    const lineCount = line.geometry.attributes.position.count;
    const glowCount = glow.geometry.attributes.position.count;

    line.geometry.setDrawRange(0, 1);
    glow.geometry.setDrawRange(0, 1);

    const progress = { value: 1 };

    const timeline = gsap.timeline();

    // Reveal from the right, travel left, smoothly turn upward by 90 degrees,
    // then continue vertically.
    timeline.to(progress, {
      value: lineCount,
      duration: 2.8,
      ease: "power1.inOut",
      onUpdate: () => {
        const count = Math.max(1, Math.floor(progress.value));

        line.geometry.setDrawRange(0, count);
        glow.geometry.setDrawRange(0, Math.min(count, glowCount));
      },
    });

    return () => timeline.kill();
  }, [lineRef, glowRef, timelineStarted]);

  return null;
}

function LogoScene({
  timelineStarted,
}: {
  timelineStarted: boolean;
}) {
  const lineRef = useRef<THREE.Line | null>(null);
  const glowRef = useRef<THREE.Line | null>(null);

  return (
    <>
      <LineController
        lineRef={lineRef}
        glowRef={glowRef}
        timelineStarted={timelineStarted}
      />
      <Filament lineRef={lineRef} glowRef={glowRef} />
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
