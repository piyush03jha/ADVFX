"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

export function CustomStudioPreview() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.1, 4.4], fov: 32 }}
        dpr={[1, 1.25]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={1.6} />
        <directionalLight position={[3, 4, 4]} intensity={2.2} />
        <pointLight position={[-2, 1, 2]} intensity={1.2} color="#8b5cf6" />
        <Environment preset="studio" environmentIntensity={0.45} />
        <PreviewObject />
      </Canvas>
    </div>
  );
}

function PreviewObject() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.28;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.65) * 0.035;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.75) * 0.035;
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <icosahedronGeometry args={[0.92, 2]} />
        <meshStandardMaterial
          metalness={0.7}
          roughness={0.22}
          color="#c4b5fd"
          emissive="#6d28d9"
          emissiveIntensity={0.16}
        />
      </mesh>
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.7, 0.58, 0.12, 48]} />
        <meshStandardMaterial metalness={0.55} roughness={0.3} color="#343434" />
      </mesh>
      <mesh position={[0, -0.95, 0]} scale={0.78}>
        <torusGeometry args={[0.9, 0.025, 16, 80]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}
