"use client";

import { useRef, useLayoutEffect, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, useTexture } from "@react-three/drei";
import * as THREE from "three";

const EARTH_DAY =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r158/examples/textures/planets/earth_atmos_2048.jpg";
const EARTH_CLOUDS =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r158/examples/textures/planets/earth_clouds_1024.png";

/**
 * Textured Earth with day map, faster-spinning clouds, soft atmosphere — reads clearly as our planet.
 */
function EarthMesh() {
  const earthRef = useRef();
  const cloudsRef = useRef();
  const [dayMap, cloudsMap] = useTexture([EARTH_DAY, EARTH_CLOUDS]);

  useLayoutEffect(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = 4;
    cloudsMap.colorSpace = THREE.SRGBColorSpace;
    cloudsMap.anisotropy = 2;
  }, [dayMap, cloudsMap]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    if (earthRef.current) {
      earthRef.current.rotation.y += d * 0.12;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += d * 0.17;
    }
  });

  return (
    <group rotation={[0.18, -0.35, 0.12]}>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={dayMap}
          roughness={0.65}
          metalness={0.05}
          emissive="#020617"
          emissiveIntensity={0.04}
        />
      </mesh>
      <mesh ref={cloudsRef} scale={1.012}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.42}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>
      {/* Thin atmospheric limb — ocean blue */}
      <mesh scale={1.045}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#4f8fd4"
          transparent
          opacity={0.22}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export function EarthGlobe() {
  return (
    <Float speed={0.55} rotationIntensity={0.04} floatIntensity={0.18}>
      <group position={[2.05, 0.08, -2.45]} scale={1.12}>
        <Suspense fallback={null}>
          <EarthMesh />
        </Suspense>
        <pointLight position={[3.5, 1.2, 2.5]} intensity={0.55} color="#fff5e6" distance={14} />
        <pointLight position={[-2, -1, 1]} intensity={0.12} color="#3b82f6" distance={12} />
      </group>
    </Float>
  );
}
