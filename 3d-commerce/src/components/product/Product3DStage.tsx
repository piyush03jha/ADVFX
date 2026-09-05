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
}

function ProductModel({
  model,
}: {
  model: string;
}) {
  const { scene } = useGLTF(model);

  return (
    <Center
      precise
      disableZ
    >
      <primitive
        object={scene}
        dispose={null}
      />
    </Center>
  );
}

export default function Product3DStage({
  model,
  name,
}: Product3DStageProps) {
  return (
    <div
      className="
        absolute
        inset-0
        min-h-0
        touch-none
      "
    >
      <Canvas
        frameloop="always"
        camera={{
          position: [0, 0, 4],
          fov: 38,
        }}
        dpr={[1, 1.25]}
        gl={{
          antialias: true,
          powerPreference:
            "high-performance",
          alpha: true,
        }}
        performance={{
          min: 0.5,
        }}
      >
        <color
          attach="background"
          args={["#08080a"]}
        />

        <ambientLight intensity={1.2} />

        <directionalLight
          position={[4, 6, 5]}
          intensity={2.2}
        />

        <directionalLight
          position={[-4, 2, -3]}
          intensity={1}
        />

        <Environment
          preset="studio"
          environmentIntensity={0.8}
        />

        <Bounds
          fit
          clip
          observe
          margin={1.1}
        >
          <ProductModel model={model} />
        </Bounds>

        <OrbitControls
          makeDefault

          /* Rotation */
          enableRotate

          /* Zoom */
          enableZoom

          /* No panning */
          enablePan={false}

          /* Smooth movement */
          enableDamping
          dampingFactor={0.055}

          /* Zoom range */
          minDistance={2.5}
          maxDistance={5.5}

          /* Prevent extreme camera angles */
          minPolarAngle={0.12}
          maxPolarAngle={Math.PI - 0.12}

          /*
           * Keep the model centered.
           * This is important for preventing
           * zoom from moving the product into
           * the upper half of the viewer.
           */
          target={[0, 0, 0]}

          /*
           * Mobile touch:
           * one finger = rotate
           * two fingers = zoom
           */
          touches={{
            ONE: 1,
            TWO: 2,
          }}

          /* Mouse:
           * left = rotate
           * wheel = zoom
           */
          mouseButtons={{
            LEFT: 0,
            MIDDLE: 1,
            RIGHT: 2,
          }}
        />
      </Canvas>

      <span className="sr-only">
        Interactive 3D preview of {name}.
        Drag to rotate and pinch or scroll
        to zoom.
      </span>
    </div>
  );
}