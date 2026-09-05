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

interface ProductListThumbnailProps {
  model: string;
}

function Model({
  model,
}: ProductListThumbnailProps) {
  const { scene } = useGLTF(model);

  const clonedModel = useMemo(() => {
    const clone = scene.clone(true);

    const box = new THREE.Box3().setFromObject(
      clone,
    );

    const center = box.getCenter(
      new THREE.Vector3(),
    );

    const size = box.getSize(
      new THREE.Vector3(),
    );

    const maxSize =
      Math.max(
        size.x,
        size.y,
        size.z,
      ) || 1;

    clone.position.sub(center);

    clone.scale.setScalar(
      1.7 / maxSize,
    );

    clone.rotation.y = -0.35;

    return clone;
  }, [scene]);

  return (
    <primitive
      object={clonedModel}
    />
  );
}

function Loading() {
  return (
    <mesh>
      <sphereGeometry
        args={[0.35, 16, 16]}
      />

      <meshStandardMaterial
        color="#262626"
      />
    </mesh>
  );
}

export function ProductListThumbnail({
  model,
}: ProductListThumbnailProps) {
  if (!model) {
    return (
      <div
        className="
          flex
          h-[72px]
          w-[72px]
          shrink-0
          items-center
          justify-center
          bg-surface-elevated
          text-[9px]
          text-muted
        "
      >
        —
      </div>
    );
  }

  return (
    <div
      className="
        h-[72px]
        w-[72px]
        shrink-0
        overflow-hidden
        rounded-xl
        bg-[#0b0b0b]
      "
    >
      <Canvas
        camera={{
          position: [0, 0, 5],
          fov: 32,
        }}
        dpr={[1, 1.1]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference:
            "high-performance",
        }}
      >
        <ambientLight intensity={1.3} />

        <directionalLight
          position={[3, 4, 4]}
          intensity={1.8}
        />

        <Environment preset="studio" />

        <Suspense fallback={<Loading />}>
          <Model model={model} />
        </Suspense>
      </Canvas>
    </div>
  );
}