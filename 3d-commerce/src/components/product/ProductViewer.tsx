"use client";

import { Suspense, useState } from "react";

import {
  Canvas,
  useThree,
} from "@react-three/fiber";

import {
  Center,
  Environment,
  Html,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

import {
  IconMaximize,
  IconRefresh,
  IconRotate,
} from "@tabler/icons-react";

import { IconButton } from "@/components/ui/IconButton";

interface ProductViewerProps {
  model: string;
  name: string;
}

function ProductModel({
  model,
}: {
  model: string;
}) {
  const { scene } = useGLTF(model);

  return (
    <Center>
      <primitive
        object={scene}
        scale={1}
      />
    </Center>
  );
}

function ViewerLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div
          className="
            h-8
            w-8
            animate-spin
            rounded-full
            border-2
            border-primary/20
            border-t-primary
          "
        />

        <span
          className="
            text-[10px]
            uppercase
            tracking-[0.18em]
            text-muted
          "
        >
          Loading model
        </span>
      </div>
    </Html>
  );
}

function CameraReset({
  resetKey,
}: {
  resetKey: number;
}) {
  const { camera } = useThree();

  if (resetKey >= 0) {
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);
  }

  return null;
}

export function ProductViewer({
  model,
  name,
}: ProductViewerProps) {
  const [autoRotate, setAutoRotate] =
    useState(true);

  const [resetKey, setResetKey] =
    useState(0);

  const fullscreen = () => {
    const element =
      document.getElementById(
        "product-3d-viewer",
      );

    if (!element) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }

    element.requestFullscreen?.();
  };

  return (
    <div
      id="product-3d-viewer"
      className="
        group
        relative
        h-full
        min-h-[420px]
        overflow-hidden
        rounded-3xl
        border
        border-border
        bg-[#080808]
      "
    >
      {/* Purple atmosphere */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-1/2
          h-[65%]
          w-[65%]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-primary/[0.10]
          blur-[100px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_50%_45%,rgba(139,92,246,0.12),transparent_55%)]
        "
      />

      <Canvas
        camera={{
          position: [0, 0, 4],
          fov: 42,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <ambientLight intensity={1.2} />

        <directionalLight
          position={[4, 5, 4]}
          intensity={2}
        />

        <directionalLight
          position={[-4, 2, -2]}
          intensity={1}
        />

        <Suspense fallback={<ViewerLoader />}>
          <ProductModel model={model} />

          <Environment preset="studio" />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={1.6}
          maxDistance={7}
          target={[0, 0, 0]}
          autoRotate={autoRotate}
          autoRotateSpeed={1.5}
          enableDamping
          dampingFactor={0.06}
        />

        <CameraReset resetKey={resetKey} />
      </Canvas>

      {/* Viewer label */}

      <div
        className="
          absolute
          left-4
          top-4
          rounded-full
          border
          border-white/10
          bg-black/40
          px-3
          py-1.5
          text-[9px]
          uppercase
          tracking-[0.18em]
          text-white/60
          backdrop-blur-md
        "
      >
        Interactive 3D
      </div>

      {/* Controls */}

      <div
        className="
          absolute
          bottom-4
          left-1/2
          flex
          -translate-x-1/2
          items-center
          gap-2
          rounded-full
          border
          border-white/10
          bg-black/45
          p-1.5
          backdrop-blur-xl
        "
      >
        <IconButton
          label={
            autoRotate
              ? "Stop rotation"
              : "Start rotation"
          }
          size="sm"
          variant="default"
          onClick={() =>
            setAutoRotate(
              (current) => !current,
            )
          }
          className="border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white"
        >
          <IconRotate size={15} />
        </IconButton>

        <IconButton
          label="Reset model"
          size="sm"
          variant="default"
          onClick={() =>
            setResetKey(
              (current) => current + 1,
            )
          }
          className="border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white"
        >
          <IconRefresh size={15} />
        </IconButton>

        <IconButton
          label="Fullscreen"
          size="sm"
          variant="default"
          onClick={fullscreen}
          className="border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white"
        >
          <IconMaximize size={15} />
        </IconButton>
      </div>

      {/* Interaction hint */}

      <div
        className="
          pointer-events-none
          absolute
          bottom-5
          right-5
          hidden
          text-[9px]
          uppercase
          tracking-[0.15em]
          text-white/30
          sm:block
        "
      >
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
