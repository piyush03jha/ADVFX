"use client";

import { Canvas } from "@react-three/fiber";
import {
  Bounds,
  Center,
  Environment,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

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

export default function Product3DStage({
  model,
  name,
  theme = "light",
}: Product3DStageProps) {
  const isDark = theme === "dark";

  return (
    <div className="absolute inset-0 min-h-0 touch-none">
      <Canvas
        frameloop="always"
        camera={{ position: [0, 0, 4], fov: 38 }}
        dpr={[1, 1.25]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: true,
        }}
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={[isDark ? "#08080a" : "#f1f1f3"]} />
        <ambientLight intensity={isDark ? 1.2 : 1.5} />
        <directionalLight position={[4, 6, 5]} intensity={isDark ? 2.2 : 2.5} />
        <directionalLight position={[-4, 2, -3]} intensity={isDark ? 1 : 1.25} />
        <Environment preset="studio" environmentIntensity={isDark ? 0.8 : 0.95} />
        <Bounds fit clip observe margin={1.1}>
          <ProductModel model={model} />
        </Bounds>
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
      <span className="sr-only">
        Interactive 3D preview of {name}. Drag to rotate and pinch or scroll to zoom.
      </span>
    </div>
  );
}