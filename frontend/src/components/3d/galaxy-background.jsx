"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";

export function GalaxyBackground() {
  const meshRef = useRef();

  useFrame(({ clock, camera }) => {
    if (!meshRef.current) return;

    // Rotate slowly for perspective shift
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.02;
    meshRef.current.rotation.x = clock.getElapsedTime() * 0.01;
  });

  return (
    <Sphere args={[50, 64, 64]} scale={[-1, 1, 1]} ref={meshRef}>
      <meshBasicMaterial
        attach="material"
        side={2}
        map={null}
        color="#0f172a"
        transparent
      />
    </Sphere>
  );
}
