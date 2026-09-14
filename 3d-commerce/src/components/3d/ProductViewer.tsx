"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

import { HERO_MODEL_ROTATION_MS } from "@/config/hero-motion";
import type { HeroProduct } from "@/config/hero-products";

const ENTER_DURATION = 0.85;
const EXIT_DURATION = 0.7;
const TOTAL_CYCLE = HERO_MODEL_ROTATION_MS / 1000;
const ROTATION_DURATION = Math.max(TOTAL_CYCLE - ENTER_DURATION, 4);

const MODEL_SIZE = 3.15;
const ENTER_START_X = 3.8;
const EXIT_END_X = -3.8;
const ROTATION_RADIANS = Math.PI * 2;
const DRAG_ROTATION_SPEED = 0.009;
const DRAG_TILT_SPEED = 0.006;
const AUTO_ROTATION_SPEED = ROTATION_RADIANS / ROTATION_DURATION;
const MAX_TILT = THREE.MathUtils.degToRad(78);

type ModelMode = "enter" | "exit";

interface InteractionState {
  active: boolean;
  lastX: number;
  lastY: number;
  rotationY: number;
  rotationX: number;
}

interface HeroModelProps {
  path: string;
  mode: ModelMode;
  interactionRef: React.MutableRefObject<InteractionState>;
  isInteractionPaused?: boolean;
  onLoaded?: () => void;
}

function HeroModel({
  path,
  mode,
  interactionRef,
  isInteractionPaused = false,
  onLoaded,
}: HeroModelProps) {
  const { scene } = useLoader(GLTFLoader, path);
  const groupRef = useRef<THREE.Group>(null);
  const rotationRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);

  const preparedModel = useMemo(() => {
    const model = scene.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;

    model.position.sub(center);
    model.scale.setScalar(MODEL_SIZE / maxDimension);

    const materials: THREE.Material[] = [];

    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = true;

      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) => {
          const cloned = material.clone();
          cloned.transparent = true;
          materials.push(cloned);
          return cloned;
        });
        return;
      }

      const cloned = object.material.clone();
      cloned.transparent = true;
      object.material = cloned;
      materials.push(cloned);
    });

    return { model, materials };
  }, [scene]);

  useEffect(() => {
    elapsedRef.current = 0;

    if (groupRef.current) {
      groupRef.current.position.set(
        mode === "enter" ? ENTER_START_X : 0,
        -0.75,
        0,
      );
      groupRef.current.scale.setScalar(mode === "enter" ? 0.92 : 1);
    }

    if (rotationRef.current) {
      rotationRef.current.rotation.set(
        interactionRef.current.rotationX,
        interactionRef.current.rotationY,
        0,
      );
    }

    preparedModel.materials.forEach((material) => {
      material.opacity = mode === "enter" ? 0 : 1;
    });

    if (mode === "enter") {
      const frame = window.requestAnimationFrame(() => {
        onLoaded?.();
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [mode, onLoaded, preparedModel, interactionRef]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const rotation = rotationRef.current;

    if (!group || !rotation) return;

    if (mode === "enter") {
      if (!isInteractionPaused) elapsedRef.current += delta;

      const elapsed = elapsedRef.current;
      const enterProgress = Math.min(elapsed / ENTER_DURATION, 1);
      const eased = THREE.MathUtils.smootherstep(enterProgress, 0, 1);

      group.position.x = THREE.MathUtils.lerp(ENTER_START_X, 0, eased);
      group.scale.setScalar(THREE.MathUtils.lerp(0.92, 1, eased));

      preparedModel.materials.forEach((material) => {
        material.opacity = eased;
      });

      if (elapsed > ENTER_DURATION) {
        if (interactionRef.current.active || isInteractionPaused) {
          rotation.rotation.y = interactionRef.current.rotationY;
          rotation.rotation.x = interactionRef.current.rotationX;
        } else {
          rotation.rotation.y += AUTO_ROTATION_SPEED * delta;
          rotation.rotation.x = THREE.MathUtils.damp(rotation.rotation.x, 0, 5, delta);
          interactionRef.current.rotationY = rotation.rotation.y;
          interactionRef.current.rotationX = rotation.rotation.x;
        }
      }

      return;
    }

    const elapsed = elapsedRef.current;
    const exitProgress = Math.min(elapsed / EXIT_DURATION, 1);
    const exitEase = THREE.MathUtils.smootherstep(exitProgress, 0, 1);

    group.position.x = THREE.MathUtils.lerp(0, EXIT_END_X, exitEase);
    group.scale.setScalar(THREE.MathUtils.lerp(1, 0.86, exitEase));

    const opacity = THREE.MathUtils.lerp(1, 0, exitEase);
    preparedModel.materials.forEach((material) => {
      material.opacity = opacity;
    });
  });

  return (
    <group ref={groupRef}>
      <group ref={rotationRef}>
        <primitive object={preparedModel.model} />
      </group>
    </group>
  );
}

function LoadingState() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-20 flex items-center justify-center"
    >
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary/70" />
    </div>
  );
}

interface ProductViewerProps {
  products: HeroProduct[];
  activeIndex: number;
  onHoldChange?: (held: boolean) => void;
}

export function ProductViewer({ products, activeIndex, onHoldChange }: ProductViewerProps) {
  const currentIndexRef = useRef(activeIndex);
  const interactionRef = useRef<InteractionState>({
    active: false,
    lastX: 0,
    lastY: 0,
    rotationY: 0,
    rotationX: 0,
  });

  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);

  const setInteraction = useCallback(
    (held: boolean) => {
      interactionRef.current.active = held;
      setIsInteracting(held);
      onHoldChange?.(held);
    },
    [onHoldChange],
  );

  useEffect(() => {
    if (activeIndex === currentIndexRef.current) return;

    const oldIndex = currentIndexRef.current;
    currentIndexRef.current = activeIndex;
    interactionRef.current.rotationX = 0;
    interactionRef.current.rotationY = 0;
    setPreviousIndex(oldIndex);
    setIsLoading(true);
    setInteraction(false);

    const timeout = window.setTimeout(() => {
      setPreviousIndex(null);
    }, EXIT_DURATION * 1000);

    return () => window.clearTimeout(timeout);
  }, [activeIndex, setInteraction]);

  const handleLoaded = useMemo(() => () => setIsLoading(false), []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      interactionRef.current.active = true;
      interactionRef.current.lastX = event.clientX;
      interactionRef.current.lastY = event.clientY;
      setIsInteracting(true);
      onHoldChange?.(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [onHoldChange],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactionRef.current.active) return;

    const deltaX = event.clientX - interactionRef.current.lastX;
    const deltaY = event.clientY - interactionRef.current.lastY;

    interactionRef.current.lastX = event.clientX;
    interactionRef.current.lastY = event.clientY;
    interactionRef.current.rotationY += deltaX * DRAG_ROTATION_SPEED;
    interactionRef.current.rotationX = THREE.MathUtils.clamp(
      interactionRef.current.rotationX - deltaY * DRAG_TILT_SPEED,
      -MAX_TILT,
      MAX_TILT,
    );
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      setInteraction(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [setInteraction],
  );

  const handlePointerCancel = useCallback(() => {
    setInteraction(false);
  }, [setInteraction]);

  if (!products.length) return null;

  const activeProduct = products[activeIndex];
  const previousProduct = previousIndex !== null ? products[previousIndex] : null;

  return (
    <div
      className={`relative h-full w-full ${isInteracting ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
    >
      <div aria-hidden="true" className="pointer-events-none absolute left-[58%] top-1/2 z-0 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.28)_0%,rgba(109,40,217,0.14)_34%,rgba(109,40,217,0.05)_58%,transparent_74%)] blur-[46px]" />
      <div aria-hidden="true" className="pointer-events-none absolute left-[60%] top-[58%] z-0 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[70px]" />
      {isLoading && <LoadingState />}

      <Canvas
        className="relative z-10"
        frameloop="always"
        camera={{ position: [0, 0.05, 9.8], fov: 34 }}
        dpr={[1, 1.1]}
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <ambientLight intensity={1.75} />
        <directionalLight position={[5, 7, 5]} intensity={2.1} />
        <directionalLight position={[-3, 2, -2]} intensity={0.55} />
        <pointLight position={[-2, 1, 3]} intensity={0.8} distance={8} color="#8b5cf6" />
        <Environment preset="studio" environmentIntensity={0.45} />

        {previousProduct && (
          <Suspense fallback={null}>
            <HeroModel
              key={`previous-${previousProduct.id}`}
              path={previousProduct.model}
              mode="exit"
              interactionRef={interactionRef}
              isInteractionPaused={isInteracting}
            />
          </Suspense>
        )}

        <Suspense fallback={null}>
          <HeroModel
            key={`active-${activeProduct.id}`}
            path={activeProduct.model}
            mode="enter"
            interactionRef={interactionRef}
            isInteractionPaused={isInteracting}
            onLoaded={handleLoaded}
          />
        </Suspense>
      </Canvas>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-foreground/10 bg-background/55 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted backdrop-blur-md transition-opacity"
        style={{ opacity: isInteracting ? 0 : 0.72 }}
      >
        Hold & drag to explore
      </div>
    </div>
  );
}
