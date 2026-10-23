"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ModelErrorBoundary } from "@/components/3d/ModelErrorBoundary";
import { useModelUrl } from "@/lib/useModelUrl";

interface Product3DStageProps {
  model: string;
  theme?: "light" | "dark";
}

type ModelTone = "dark" | "light" | "mid";

// Linear-space luminance thresholds (roughly sRGB 0.22 and 0.80).
const DARK_LUMINANCE = 0.04;
const LIGHT_LUMINANCE = 0.6;

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

/**
 * Works out whether a model is mostly black or mostly white from its material colors,
 * and gives the cloned materials a little help so surface detail stays readable:
 *  - near-black prints get a slightly lifted base color and glossier highlights, so
 *    they pick up shading and reflections instead of rendering as a flat silhouette;
 *  - near-white prints are toned down a touch so highlights do not blow out.
 * Materials are cloned first because useGLTF caches the original scene by URL.
 */
function prepareModelMaterials(model: THREE.Object3D): ModelTone {
  const standard: THREE.MeshStandardMaterial[] = [];

  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;

    const cloned = Array.isArray(mesh.material)
      ? mesh.material.map((material) => material.clone())
      : mesh.material.clone();
    mesh.material = cloned;

    for (const material of materialsOf(mesh)) {
      if ((material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        standard.push(material as THREE.MeshStandardMaterial);
      }
    }
  });

  // Textured materials keep their own look; only judge flat-colored ones.
  const flat = standard.filter((material) => !material.map);
  if (!flat.length) return "mid";

  const luminance =
    flat.reduce((sum, material) => {
      const { r, g, b } = material.color;
      return sum + (0.2126 * r + 0.7152 * g + 0.0722 * b);
    }, 0) / flat.length;

  const tone: ModelTone =
    luminance < DARK_LUMINANCE ? "dark" : luminance > LIGHT_LUMINANCE ? "light" : "mid";

  for (const material of flat) {
    if (tone === "dark") {
      material.color.lerp(new THREE.Color(0.06, 0.06, 0.07), 0.55);
      material.roughness = Math.min(material.roughness, 0.42);
      material.envMapIntensity = 2.2;
    } else if (tone === "light") {
      material.color.multiplyScalar(0.9);
      material.roughness = Math.max(material.roughness, 0.55);
      material.envMapIntensity = 0.65;
    } else {
      material.envMapIntensity = 1.1;
    }
    material.needsUpdate = true;
  }

  return tone;
}

function LoadedProductModel({
  blobUrl,
  onTone,
}: {
  blobUrl: string;
  onTone: (tone: ModelTone) => void;
}) {
  const { scene } = useGLTF(blobUrl, true, true);

  // Do not render the cached GLTF scene directly. drei/useGLTF caches scenes by
  // URL, so a viewer that changes the root transform can affect other viewers
  // using the same model. Clone it, center its bounds, and normalize its size
  // to the product viewer's camera instead.
  const { normalizedScene, tone } = useMemo(() => {
    const model = scene.clone(true);
    const modelTone = prepareModelMaterials(model);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
      return { normalizedScene: model as THREE.Object3D, tone: modelTone };
    }

    model.position.sub(center);

    const wrapper = new THREE.Group();
    wrapper.add(model);
    wrapper.scale.setScalar(2.4 / maxDimension);

    return { normalizedScene: wrapper as THREE.Object3D, tone: modelTone };
  }, [scene]);

  useEffect(() => {
    onTone(tone);
  }, [tone, onTone]);

  return <primitive object={normalizedScene} dispose={null} />;
}

function ProductModel({ model, onTone }: { model: string; onTone: (tone: ModelTone) => void }) {
  const { blobUrl } = useModelUrl(model);

  // Keep the URL-loading state in its own component. Once the URL is ready,
  // LoadedProductModel mounts and runs its GLTF and memo hooks consistently.
  if (!blobUrl) return null;

  return <LoadedProductModel blobUrl={blobUrl} onTone={onTone} />;
}

function ModelLoadingFallback() {
  return (
    <mesh rotation={[0.35, 0.45, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial transparent opacity={0.08} />
    </mesh>
  );
}

/**
 * Procedural studio lighting. Soft boxes give glossy and dark surfaces something to
 * reflect (that is what defines the shape of a black model), and nothing is
 * downloaded, unlike an HDR preset.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#14121c"]} />
      <Lightformer form="rect" intensity={3.2} position={[0, 5, 3]} scale={[9, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={2} position={[-5, 1.5, 2]} rotation-y={Math.PI / 2.4} scale={[6, 4, 1]} />
      <Lightformer form="rect" intensity={2} position={[5, 1.5, 2]} rotation-y={-Math.PI / 2.4} scale={[6, 4, 1]} />
      <Lightformer form="rect" intensity={2.6} position={[0, 2, -5]} scale={[10, 3, 1]} />
      <Lightformer form="ring" intensity={1.2} position={[0, -3, 3]} scale={5} />
    </Environment>
  );
}

function ExposureControl({ exposure }: { exposure: number }) {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    gl.toneMappingExposure = exposure;
    invalidate();
  }, [gl, invalidate, exposure]);

  return null;
}

function stageBackground(isDark: boolean, tone: ModelTone) {
  if (isDark) {
    // Black models vanish on a near-black stage, so lift it to a visible slate-violet.
    if (tone === "dark") {
      return {
        className: "bg-[#2b2540]",
        image:
          "radial-gradient(ellipse at 50% 42%, rgba(196, 181, 253, 0.34) 0%, rgba(124, 92, 214, 0.2) 34%, transparent 70%), radial-gradient(ellipse at 50% 50%, #3d3558 0%, #231d38 80%)",
      };
    }
    return {
      className: "bg-[#09070f]",
      image:
        "radial-gradient(ellipse at 50% 45%, rgba(139, 92, 246, 0.28) 0%, rgba(88, 28, 135, 0.14) 32%, transparent 68%), radial-gradient(ellipse at 50% 50%, #17111f 0%, #09070f 76%)",
    };
  }

  // White models wash out on a white stage, so deepen it to a soft mid-tone lavender.
  if (tone === "light") {
    return {
      className: "bg-[#b9b0d3]",
      image:
        "radial-gradient(ellipse at 50% 42%, rgba(255, 255, 255, 0.28) 0%, rgba(214, 205, 238, 0.3) 34%, transparent 70%), radial-gradient(ellipse at 50% 50%, #cfc7e6 0%, #a79ec6 82%)",
    };
  }
  return {
    className: "bg-[#f4f0fb]",
    image:
      "radial-gradient(ellipse at 50% 45%, rgba(167, 139, 250, 0.34) 0%, rgba(221, 214, 254, 0.42) 30%, transparent 68%), radial-gradient(ellipse at 50% 50%, #ffffff 0%, #f0eafa 78%)",
  };
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
  theme = "light",
}: Product3DStageProps) {
  const isDark = theme === "dark";
  const [contextLost, setContextLost] = useState(false);
  const [tone, setTone] = useState<ModelTone>("mid");
  const background = stageBackground(isDark, tone);

  return (
    <div
      className={
        "absolute inset-0 min-h-0 touch-none overflow-hidden transition-colors duration-300 " +
        background.className
      }
      style={{ backgroundImage: background.image }}
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

        <ExposureControl exposure={tone === "light" ? 0.85 : tone === "dark" ? 1.15 : 1} />
        <ambientLight intensity={tone === "light" ? 0.5 : 0.7} />
        <directionalLight position={[4, 6, 5]} intensity={tone === "light" ? 1.2 : 1.8} />
        <directionalLight position={[-4, 2, -3]} intensity={tone === "dark" ? 1.4 : 0.8} />
        <directionalLight position={[0, 3, -6]} intensity={tone === "dark" ? 1.6 : 0.5} />
        <StudioEnvironment />

        <ModelErrorBoundary
          fallback={
            <mesh>
              <planeGeometry args={[0, 0]} />
            </mesh>
          }
        >
          <Suspense fallback={<ModelLoadingFallback />}>
            <ProductModel model={model} onTone={setTone} />
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
        Interactive 3D product preview. Drag to rotate and pinch or scroll to zoom.
      </span>
    </div>
  );
}
