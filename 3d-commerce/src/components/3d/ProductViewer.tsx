"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Canvas,
  useFrame,
  useLoader,
} from "@react-three/fiber";

import { Environment } from "@react-three/drei";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import * as THREE from "three";

import { HERO_MODEL_ROTATION_MS } from "@/config/hero-motion";
import type { HeroProduct } from "@/config/hero-products";

/* =========================================================
   CONFIG
========================================================= */

const ENTER_DURATION = 0.85;
const EXIT_DURATION = 0.65;

const TOTAL_CYCLE =
  HERO_MODEL_ROTATION_MS / 1000;

/*
 * The model spends the first 0.85s entering.
 * The remaining time is used for the full 360° turn.
 */
const ROTATION_DURATION = Math.max(
  TOTAL_CYCLE - ENTER_DURATION,
  3,
);

const MODEL_SIZE = 3.15;

const ENTER_START_X = 3.8;
const EXIT_END_X = -3.8;

/* =========================================================
   TYPES
========================================================= */

type ModelMode = "enter" | "exit";

interface HeroModelProps {
  path: string;
  mode: ModelMode;
}

/* =========================================================
   MODEL
========================================================= */

function HeroModel({
  path,
  mode,
}: HeroModelProps) {
  const { scene } = useLoader(
    GLTFLoader,
    path,
  );

  const groupRef =
    useRef<THREE.Group>(null);

  const rotationRef =
    useRef<THREE.Group>(null);

  const elapsedRef = useRef(0);

  const preparedModel = useMemo(() => {
    const model = scene.clone(true);

    /* -----------------------------------------
       Normalize model
    ----------------------------------------- */

    const box =
      new THREE.Box3().setFromObject(model);

    const center =
      box.getCenter(
        new THREE.Vector3(),
      );

    const size =
      box.getSize(
        new THREE.Vector3(),
      );

    const maxDimension =
      Math.max(
        size.x,
        size.y,
        size.z,
      ) || 1;

    model.position.sub(center);

    model.scale.setScalar(
      MODEL_SIZE / maxDimension,
    );

    /* -----------------------------------------
       Materials
    ----------------------------------------- */

    const materials: THREE.Material[] =
      [];

    model.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh)
      ) {
        return;
      }

      object.castShadow = false;
      object.receiveShadow = false;

      if (
        Array.isArray(object.material)
      ) {
        object.material =
          object.material.map(
            (material) => {
              const cloned =
                material.clone();

              cloned.transparent = true;

              materials.push(cloned);

              return cloned;
            },
          );

        return;
      }

      const cloned =
        object.material.clone();

      cloned.transparent = true;

      object.material = cloned;

      materials.push(cloned);
    });

    return {
      model,
      materials,
    };
  }, [scene]);

  /* =====================================================
     RESET
  ====================================================== */

  useEffect(() => {
    elapsedRef.current = 0;

    if (groupRef.current) {
      groupRef.current.position.set(
        mode === "enter"
          ? ENTER_START_X
          : 0,
        -0.75,
        0,
      );

      groupRef.current.scale.setScalar(
        mode === "enter"
          ? 0.92
          : 1,
      );
    }

    if (rotationRef.current) {
      rotationRef.current.rotation.set(
        0,
        0,
        0,
      );
    }

    preparedModel.materials.forEach(
      (material) => {
        material.opacity =
          mode === "enter"
            ? 0
            : 1;
      },
    );
  }, [path, mode, preparedModel]);

  /* =====================================================
     ANIMATION
  ====================================================== */

  useFrame((_, delta) => {
    if (
      !groupRef.current ||
      !rotationRef.current
    ) {
      return;
    }

    elapsedRef.current += delta;

    const elapsed =
      elapsedRef.current;

    /* ===================================================
       ENTER
    ================================================= */

    if (mode === "enter") {
      const enterProgress =
        Math.min(
          elapsed / ENTER_DURATION,
          1,
        );

      const eased =
        THREE.MathUtils.smootherstep(
          enterProgress,
          0,
          1,
        );

      /*
       * RIGHT → CENTER
       */

      groupRef.current.position.x =
        THREE.MathUtils.lerp(
          ENTER_START_X,
          0,
          eased,
        );

      groupRef.current.scale.setScalar(
        THREE.MathUtils.lerp(
          0.92,
          1,
          eased,
        ),
      );

      /*
       * Fade in.
       */

      const opacity =
        THREE.MathUtils.lerp(
          0,
          1,
          eased,
        );

      preparedModel.materials.forEach(
        (material) => {
          material.opacity = opacity;
        },
      );

      /*
       * After entering, rotate exactly
       * one full turn over the remaining
       * hero cycle.
       */

      if (
        elapsed > ENTER_DURATION
      ) {
        const rotationElapsed =
          elapsed -
          ENTER_DURATION;

        const rotationProgress =
          Math.min(
            rotationElapsed /
              ROTATION_DURATION,
            1,
          );

        const rotationEase =
          THREE.MathUtils.smootherstep(
            rotationProgress,
            0,
            1,
          );

        rotationRef.current.rotation.y =
          rotationEase *
          Math.PI *
          2;
      }

      return;
    }

    /* ===================================================
       EXIT
    ================================================= */

    const exitProgress =
      Math.min(
        elapsed / EXIT_DURATION,
        1,
      );

    const exitEase =
      THREE.MathUtils.smootherstep(
        exitProgress,
        0,
        1,
      );

    /*
     * CENTER → LEFT
     */

    groupRef.current.position.x =
      THREE.MathUtils.lerp(
        0,
        EXIT_END_X,
        exitEase,
      );

    groupRef.current.scale.setScalar(
      THREE.MathUtils.lerp(
        1,
        0.86,
        exitEase,
      ),
    );

    /*
     * Fade out.
     */

    const opacity =
      THREE.MathUtils.lerp(
        1,
        0,
        exitEase,
      );

    preparedModel.materials.forEach(
      (material) => {
        material.opacity = opacity;
      },
    );
  });

  return (
    <group ref={groupRef}>
      <group ref={rotationRef}>
        <primitive
          object={preparedModel.model}
        />
      </group>
    </group>
  );
}

/* =========================================================
   LOADING
========================================================= */

function LoadingModel() {
  return (
    <mesh position={[0, -0.75, 0]}>
      <icosahedronGeometry
        args={[0.22, 2]}
      />

      <meshStandardMaterial
        color="#8b5cf6"
        emissive="#6d28d9"
        emissiveIntensity={1.2}
        transparent
        opacity={0.5}
      />
    </mesh>
  );
}

/* =========================================================
   VIEWER
========================================================= */

interface ProductViewerProps {
  products: HeroProduct[];
  activeIndex: number;
}

export function ProductViewer({
  products,
  activeIndex,
}: ProductViewerProps) {
  const previousIndexRef =
    useRef<number | null>(null);

  const currentIndexRef =
    useRef(activeIndex);

  const [previousIndex, setPreviousIndex] =
    useState<number | null>(null);

  /* -----------------------------------------
     Detect product change
  ----------------------------------------- */

  useEffect(() => {
    if (
      activeIndex ===
      currentIndexRef.current
    ) {
      return;
    }

    setPreviousIndex(
      currentIndexRef.current,
    );

    currentIndexRef.current =
      activeIndex;

    const timeout =
      window.setTimeout(() => {
        setPreviousIndex(null);
      }, EXIT_DURATION * 1000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeIndex]);

  if (!products.length) {
    return null;
  }

  const activeProduct =
    products[activeIndex];

  const previousProduct =
    previousIndex !== null
      ? products[previousIndex]
      : null;

  return (
    <div className="relative h-full w-full">
      {/* =================================================
          PURPLE MODEL ATMOSPHERE
      ================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-[58%]
          top-1/2
          z-0
          h-[72%]
          w-[72%]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-[radial-gradient(circle,rgba(139,92,246,0.28)_0%,rgba(109,40,217,0.14)_34%,rgba(109,40,217,0.05)_58%,transparent_74%)]
          blur-[46px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-[60%]
          top-[58%]
          z-0
          h-[34%]
          w-[34%]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-primary/10
          blur-[70px]
        "
      />

      {/* =================================================
          CANVAS
      ================================================== */}

      <Canvas
        className="relative z-10"
        frameloop="always"
        camera={{
          position: [0, 0.05, 9.8],
          fov: 34,
        }}
        dpr={[1, 1.2]}
        gl={{
          alpha: true,
          antialias: false,
          powerPreference:
            "high-performance",
        }}
      >
        {/* Lighting */}

        <ambientLight intensity={1.6} />

        <directionalLight
          position={[5, 7, 5]}
          intensity={2.3}
        />

        <directionalLight
          position={[-4, 3, -3]}
          intensity={0.8}
        />

        <pointLight
          position={[-2, 1, 3]}
          intensity={1.5}
          distance={10}
          color="#8b5cf6"
        />

        <spotLight
          position={[2, 6, 4]}
          intensity={8}
          angle={0.45}
          penumbra={0.9}
          distance={20}
          color="#c4b5fd"
        />

        <Environment
          preset="studio"
          environmentIntensity={0.55}
        />

        {/* Old product → LEFT */}

        {previousProduct && (
          <Suspense fallback={null}>
            <HeroModel
              key={`previous-${previousProduct.id}`}
              path={previousProduct.model}
              mode="exit"
            />
          </Suspense>
        )}

        {/* New product ← RIGHT */}

        <Suspense fallback={<LoadingModel />}>
          <HeroModel
            key={`active-${activeProduct.id}`}
            path={activeProduct.model}
            mode="enter"
          />
        </Suspense>
      </Canvas>
    </div>
  );
}