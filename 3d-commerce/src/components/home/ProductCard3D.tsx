"use client";

import {
  Suspense,
  useMemo,
} from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";

import type {
  MostPurchasedProduct,
} from "@/config/most-purchased-products";

interface ProductCard3DProps {
  product: MostPurchasedProduct;
}

function Model({
  path,
}: {
  path: string;
}) {
  const { scene } = useGLTF(path);

  const model = useMemo(() => {
    const cloned = scene.clone(true);

    const box = new THREE.Box3().setFromObject(
      cloned,
    );

    const center = box.getCenter(
      new THREE.Vector3(),
    );

    const size = box.getSize(
      new THREE.Vector3(),
    );

    const maxAxis =
      Math.max(
        size.x,
        size.y,
        size.z,
      ) || 1;

    cloned.position.sub(center);

    cloned.scale.setScalar(
      2.25 / maxAxis,
    );

    cloned.traverse((child) => {
      if (
        child instanceof THREE.Mesh
      ) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    return cloned;
  }, [scene]);

  return (
    <primitive
      object={model}
      rotation={[0, -0.35, 0]}
    />
  );
}

function LoadingModel() {
  return (
    <mesh>
      <icosahedronGeometry
        args={[0.35, 1]}
      />

      <meshStandardMaterial
        color="#8b5cf6"
        transparent
        opacity={0.3}
      />
    </mesh>
  );
}

export function ProductCard3D({
  product,
}: ProductCard3DProps) {
  if (!product.model) {
    return (
      <div
        className="
          flex
          aspect-[1/0.92]
          items-center
          justify-center
          bg-surface-elevated
          text-xs
          text-muted
        "
      >
        Preview unavailable
      </div>
    );
  }

  return (
    <div
      className="
        relative
        aspect-[1/0.92]
        w-full
        overflow-hidden
        bg-[#0c0c0c]
      "
    >
      {/* Purple ambient glow */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-1/2
          z-0
          h-2/3
          w-2/3
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-primary/[0.08]
          blur-[70px]
        "
      />

      <Canvas
        camera={{
          position: [0, 0.2, 6],
          fov: 32,
        }}
        dpr={[1, 1.2]}
        frameloop="always"
        gl={{
          antialias: false,
          alpha: true,
          powerPreference:
            "high-performance",
        }}
      >
        <ambientLight intensity={1.4} />

        <directionalLight
          position={[4, 5, 4]}
          intensity={2}
        />

        <directionalLight
          position={[-4, 2, -4]}
          intensity={0.6}
        />

        <Environment preset="studio" />

        <Suspense
          fallback={<LoadingModel />}
        >
          <Model path={product.model} />
        </Suspense>
      </Canvas>
    </div>
  );
}