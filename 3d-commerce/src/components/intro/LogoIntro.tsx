"use client";

import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
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
const HORIZONTAL_END = new THREE.Vector3(-3.4, -1.0, 1);

// Exact quarter-circle bend.
// The circle is tangent to the horizontal segment at the start
// and tangent to the vertical segment at the end, so there is
// no visible kink in either direction.
const CURVE_RADIUS = 0.42;
const CURVE_CENTER = new THREE.Vector3(
  HORIZONTAL_END.x,
  HORIZONTAL_END.y + CURVE_RADIUS,
  1,
);

const CURVE_END = new THREE.Vector3(
  CURVE_CENTER.x - CURVE_RADIUS,
  CURVE_CENTER.y,
  1,
);

// Very small vertical continuation, matching the supplied reference.
const VERTICAL_END = new THREE.Vector3(
  CURVE_END.x,
  CURVE_END.y + 0.28,
  1,
);

const CURVE_SAMPLES = 48;

function createFilamentPoints() {
  const points: THREE.Vector3[] = [];

  // Long horizontal section: right -> left.
  for (let i = 0; i <= 96; i += 1) {
    const t = i / 96;
    points.push(new THREE.Vector3().lerpVectors(LINE_START, HORIZONTAL_END, t));
  }

  // True 90-degree circular arc.
  // Start angle = -90° (moving left).
  // End angle = -180° (moving upward).
  for (let i = 1; i <= CURVE_SAMPLES; i += 1) {
    const t = i / CURVE_SAMPLES;
    const angle = -Math.PI / 2 - t * (Math.PI / 2);

    points.push(
      new THREE.Vector3(
        CURVE_CENTER.x + CURVE_RADIUS * Math.cos(angle),
        CURVE_CENTER.y + CURVE_RADIUS * Math.sin(angle),
        1,
      ),
    );
  }

  // Short vertical section after the bend.
  for (let i = 1; i <= 16; i += 1) {
    const t = i / 16;
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
  iconRef,
  letterRef,
  timelineStarted,
}: {
  lineRef: MutableRefObject<THREE.Line | null>;
  glowRef: MutableRefObject<THREE.Line | null>;
  iconRef: MutableRefObject<HTMLDivElement | null>;
  letterRef: MutableRefObject<HTMLDivElement | null>;
  timelineStarted: boolean;
}) {
  useEffect(() => {
    if (
      !timelineStarted ||
      !lineRef.current ||
      !glowRef.current ||
      !iconRef.current ||
      !letterRef.current
    ) {
      return;
    }

    const line = lineRef.current;
    const glow = glowRef.current;

    const lineCount = line.geometry.attributes.position.count;
    const glowCount = glow.geometry.attributes.position.count;

    line.geometry.setDrawRange(0, 1);
    glow.geometry.setDrawRange(0, 1);

    // Explicit initial state. Both logo assets remain invisible while
    // the filament is being drawn.
    gsap.set(iconRef.current, {
      opacity: 0,
      visibility: "hidden",
    });

    gsap.set(letterRef.current, {
      opacity: 0,
      visibility: "hidden",
      x: -14,
    });

    const progress = { value: 1 };
    const timeline = gsap.timeline();

    // 1. Draw the complete white line first.
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

    // 2. Only after the entire line is complete, show the icon.
    timeline.to(
      iconRef.current,
      {
        opacity: 1,
        visibility: "visible",
        duration: 0.45,
        ease: "power2.out",
      },
      "+=0.08",
    );

    // 3. Only after the icon has finished appearing, show the letter.
    timeline.to(
      letterRef.current,
      {
        opacity: 1,
        visibility: "visible",
        x: 0,
        duration: 0.5,
        ease: "power3.out",
      },
      "+=0.12",
    );

    return () => timeline.kill();
  }, [lineRef, glowRef, iconRef, letterRef, timelineStarted]);

  return null;
}

function LogoIcon({
  iconRef,
}: {
  iconRef: MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <Html
      position={[0, 0.35, 1.15]}
      center
      transform
      sprite
      zIndexRange={[20, 0]}
    >
      <div
        ref={iconRef}
        style={{
          display: "block",
          opacity: 0,
          visibility: "hidden",
        }}
      >
        <svg
          viewBox="65 20 205 185"
          width="112"
          height="102"
          aria-hidden="true"
          style={{
            display: "block",
            overflow: "visible",
          }}
        >
          <image
            href="/logo/voxel_icon.png"
            x="-168"
            y="85"
            width="120"
            height="70"
            preserveAspectRatio="none"
          />
        </svg>
      </div>
    </Html>
  );
}

function LogoLetter({
  letterRef,
}: {
  letterRef: MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <Html
      position={[1.05, 0.35, 1.14]}
      center
      transform
      sprite
      zIndexRange={[19, 0]}
    >
      <div
        ref={letterRef}
        style={{
          display: "block",
          opacity: 0,
          visibility: "hidden",
          transform: "translateX(-14px)",
        }}
      >
        <img
          src="/logo/voxel_letter.png"
          alt=""
          width={230}
          height={72}
          draggable={false}
          style={{
            display: "block",
            width: "230px",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>
    </Html>
  );
}

function LogoScene({ timelineStarted }: { timelineStarted: boolean }) {
  const lineRef = useRef<THREE.Line | null>(null);
  const glowRef = useRef<THREE.Line | null>(null);
  const iconRef = useRef<HTMLDivElement | null>(null);
  const letterRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <LineController
        lineRef={lineRef}
        glowRef={glowRef}
        iconRef={iconRef}
        letterRef={letterRef}
        timelineStarted={timelineStarted}
      />
      <Filament lineRef={lineRef} glowRef={glowRef} />
      <LogoIcon iconRef={iconRef} />
      <LogoLetter letterRef={letterRef} />
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
