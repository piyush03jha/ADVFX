"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ModelErrorBoundary } from "@/components/3d/ModelErrorBoundary";
import { useModelUrl } from "@/lib/useModelUrl";

interface Product3DStageProps {
  model: string;
  name: string;
  theme?: "light" | "dark";
}

function ProductModel({ model }: { model: string }) {
  const { blobUrl } = useModelUrl(model);

  if (!blobUrl) return null;

  const { scene } = useGLTF(blobUrl, true, true);

  // Do not render the cached GLTF scene directly. drei/useGLTF caches scenes by
  // URL, so a viewer that changes the root transform can affect other viewers
  // using the same model. Clone it, center its bounds, and normalize its size
  // to the product viewer's camera instead.
  const normalizedScene = useMemo(() => {
    const model = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
      return model;
    }

    model.position.sub(center);

    const wrapper = new THREE.Group();
    wrapper.add(model);
    wrapper.scale.setScalar(2.4 / maxDimension);

    return wrapper;
  }, [scene]);

  return <primitive object={normalizedScene} dispose={null} />;
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
    <div
      className={
        "absolute inset-0 min-h-0 touch-none overflow-hidden " +
        (isDark
          ? "bg-[#09070f]"
          : "bg-[#f4f0fb]")
      }
      style={{
        backgroundImage: isDark
          ? "radial-gradient(ellipse at 50% 45%, rgba(139, 92, 246, 0.28) 0%, rgba(88, 28, 135, 0.14) 32%, transparent 68%), radial-gradient(ellipse at 50% 50%, #17111f 0%, #09070f 76%)"
          : "radial-gradient(ellipse at 50% 45%, rgba(167, 139, 250, 0.34) 0%, rgba(221, 214, 254, 0.42) 30%, transparent 68%), radial-gradient(ellipse at 50% 50%, #ffffff 0%, #f0eafa 78%)",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 34, near: 0.01, far: 100 }}
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

        <ambientLight intensity={isDark ? 1 : 1.2} />
        <directionalLight position={[4, 6, 5]} intensity={isDark ? 1.6 : 1.8} />
        <directionalLight position={[-4, 2, -3]} intensity={isDark ? 0.7 : 0.85} />

        <ModelErrorBoundary
          fallback={
            <mesh>
              <planeGeometry args={[0, 0]} />
            </mesh>
          }
        >
          <Suspense fallback={<ModelLoadingFallback />}>
            <ProductModel model={model} />
          </Suspense>
        </ModelErrorBoundary>

        <OrbitControls
          makeDefault
          enableRotate
          enableZoom
          enablePan={false}
          enableDamping
          dampingFactor={0.055}
          minDistance={0.08}
          maxDistance={8}
          minPolarAngle={0.12}
          maxPolarAngle={Math.PI - 0.12}
          target={[0, 0, 0]}
          rotateSpeed={0.75}
          zoomSpeed={1.25}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
          reverseOrbit
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
