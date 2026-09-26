"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Center, OrbitControls, useGLTF } from "@react-three/drei";

interface Product3DStageProps {
  model: string;
  name: string;
  theme?: "light" | "dark";
}

function ProductModel({ model }: { model: string }) {
  const { scene } = useGLTF(model);
  return (
    <Center precise disableZ>
      <primitive object={scene} dispose={null} />
    </Center>
  );
}

function ModelLoadingFallback() {
  return (
    <mesh rotation={[0.35, 0.45, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial transparent opacity={0.08} />
    </mesh>
  );
}

function WebGLContextMonitor({
  onLost,
  onRestored,
}: {
  onLost: () => void;
  onRestored: () => void;
}) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn("[3D Viewer] WebGL context lost.");
      onLost();
    };
    const handleContextRestored = () => {
      console.info("[3D Viewer] WebGL context restored.");
      onRestored();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost, false);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored, false);
    };
  }, [gl, onLost, onRestored]);

  return null;
}

export default function Product3DStage({
  model,
  name,
  theme = "light",
}: Product3DStageProps) {
  const isDark = theme === "dark";
  const [contextLost, setContextLost] = useState(false);

  return (
    <div className="absolute inset-0 min-h-0 touch-none">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 38, near: 0.01, far: 100 }}
        dpr={1}
        frameloop="demand"
        gl={{
          antialias: false,
          powerPreference: "low-power",
          alpha: true,
          preserveDrawingBuffer: false,
        }}
        performance={{ min: 0.25, max: 1, debounce: 200 }}
      >
        <WebGLContextMonitor
          onLost={() => setContextLost(true)}
          onRestored={() => setContextLost(false)}
        />

        <color attach="background" args={[isDark ? "#08080a" : "#f1f1f3"]} />
        <ambientLight intensity={isDark ? 1 : 1.2} />
        <directionalLight position={[4, 6, 5]} intensity={isDark ? 1.6 : 1.8} />
        <directionalLight position={[-4, 2, -3]} intensity={isDark ? 0.7 : 0.85} />

        <Suspense fallback={<ModelLoadingFallback />}>
          <ProductModel model={model} />
        </Suspense>

        <OrbitControls
          makeDefault
          enableRotate
          enableZoom
          enablePan={false}
          enableDamping
          dampingFactor={0.055}
          minDistance={2.5}
          maxDistance={5.5}
          minPolarAngle={0.12}
          maxPolarAngle={Math.PI - 0.12}
          target={[0, 0, 0]}
          touches={{ ONE: 1, TWO: 2 }}
          mouseButtons={{ LEFT: 0, MIDDLE: 1, RIGHT: 2 }}
        />
      </Canvas>

      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-inherit/90 px-6 text-center backdrop-blur-sm">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em]">
              3D viewer paused
            </p>
            <p className="mt-2 text-xs text-muted">
              Your browser temporarily lost the WebGL graphics context.
            </p>
          </div>
        </div>
      )}

      <span className="sr-only">
        Interactive 3D preview of {name}. Drag to rotate and pinch or scroll to zoom.
      </span>
    </div>
  );
}
