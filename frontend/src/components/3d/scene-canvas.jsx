"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { InteractiveSphere } from "./interactive-sphere";
import { EarthGlobe } from "./EarthGlobe";
import { ParticleSystem } from "./particle-system";
import { Logo3D, Navigation3D } from "./navigation-3d";
import { useRotationStore } from "./use-rotation-store";
import { useRef, useMemo } from "react";
import * as THREE from "three";

// Star field background - tiny dots, completely random
// Star field background - visible tiny dots
function GalaxyBackground() {
  const starsRef = useRef();
  
  // Create realistic star field - visible tiny dots
  const starCount = 2200;
  
  const starGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);

    // Create COMPLETELY random star positions
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      
      // Random distribution in a large volume
      const range = 80;
      positions[i3] = (Math.random() - 0.5) * range; // X
      positions[i3 + 1] = (Math.random() - 0.5) * range; // Y
      positions[i3 + 2] = (Math.random() - 0.5) * range - 20; // Z (mostly behind)
      
      // Make stars visible but small
      const r = Math.random();
      if (r < 0.7) {
        sizes[i] = 0.05 + Math.random() * 0.03; // Small stars (70%)
      } else if (r < 0.95) {
        sizes[i] = 0.1 + Math.random() * 0.05; // Medium stars (25%)
      } else {
        sizes[i] = 0.2 + Math.random() * 0.1; // Large stars (5%)
      }
      
      // Brighter colors for visibility
      const intensity = 0.8 + Math.random() * 0.2; // Always bright
      colors[i3] = intensity; // R
      colors[i3 + 1] = intensity; // G
      colors[i3 + 2] = intensity; // B (pure white)
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, []);

  // Very slow movement
  useFrame(() => {
    if (starsRef.current) {
      // Extremely subtle movement - barely noticeable
      starsRef.current.rotation.y += 0.0001;
    }
  });

  return (
    <>
      {/* Procedural star field - VISIBLE dots */}
      <points ref={starsRef}>
        <primitive object={starGeometry} />
        <pointsMaterial
          size={0.65}
          sizeAttenuation={true}
          vertexColors={true}
          transparent={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Optional: Test with BRIGHT RED stars to debug */}
      {false && (
        <points position={[0, 0, -10]}>
          <sphereGeometry args={[5, 8, 8]} />
          <pointsMaterial
            size={0.5}
            color="#ff0000"
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* Deep black background */}
      <mesh>
        <sphereGeometry args={[200, 16, 16]} />
        <meshBasicMaterial
          color="#000000"
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
}
// Rotating light to create shifting glow on sphere
function RotatingLight() {
  const lightRef = useRef();
  const rotationSpeed = useRef(0.8);

  useFrame((state) => {
    if (!lightRef.current) return;
    const { isNavigating } = useRotationStore.getState();
    rotationSpeed.current = isNavigating ? 4.2 : 0.75;
    const angle = state.clock.elapsedTime * rotationSpeed.current;
    lightRef.current.position.x = Math.cos(angle) * 3;
    lightRef.current.position.y = Math.sin(angle * 0.65) * 1.85;
    lightRef.current.position.z = Math.sin(angle) * 3;
  });

  return <directionalLight ref={lightRef} intensity={1.02} color="#fff4e8" />;
}

// Camera controller
function CameraController() {
  const cameraRef = useRef();

  useFrame((state, delta) => {
    const cam = cameraRef.current;
    if (!cam) return;
    const { isZoomed, scale } = useRotationStore.getState();
    const d = Math.min(delta, 0.05);
    const targetZ = 5.05 - (scale - 1) * 0.6;
    cam.position.z = THREE.MathUtils.damp(cam.position.z, targetZ, 9, d);

    if (isZoomed) {
      const t = state.clock.elapsedTime;
      cam.position.x = THREE.MathUtils.damp(cam.position.x, Math.sin(t * 0.45) * 0.07, 4, d);
      cam.position.y = THREE.MathUtils.damp(cam.position.y, Math.cos(t * 0.28) * 0.045, 4, d);
    } else {
      cam.position.x = THREE.MathUtils.damp(cam.position.x, 0, 6, d);
      cam.position.y = THREE.MathUtils.damp(cam.position.y, 0, 6, d);
    }
    cam.lookAt(0, 0, 0);
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 5.05]} fov={50} />;
}

export function SceneCanvas() {
  const controlsRef = useRef();
  const setManualRotation = useRotationStore((s) => s.setManualRotation);
  const isNavigating = useRotationStore((s) => s.isNavigating);

  const handleControlsChange = () => {
    if (controlsRef.current && !isNavigating) {
      const polar = controlsRef.current.getPolarAngle();
      const azimuthal = controlsRef.current.getAzimuthalAngle();
      setManualRotation([polar - Math.PI / 2, azimuthal, 0]);
    }
  };

  return (
    <Canvas
      dpr={[1, Math.min(window.devicePixelRatio || 1, 1.5)]}
      style={{ width: "100%", height: "100vh", background: "#000000" }}
      gl={{
        alpha: false,
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.02,
      }}
    >
      <CameraController />

      {/* Background - set to black */}
      <color attach="background" args={["#000000"]} />
      <GalaxyBackground />

      {/* Lighting with rotating highlight */}
      <ambientLight intensity={0.2} />
      <RotatingLight />
      <directionalLight position={[-5, -3, -4]} intensity={0.35} color="#94a3b8" />
      <pointLight position={[0, 0, 5]} intensity={0.22} color="#bfdbfe" />

      {/* Textured Earth globe (secondary hero) */}
      <EarthGlobe />

      {/* Interactive module sphere */}
      <InteractiveSphere />

      {/* Particles orbiting like people around globe */}
      <ParticleSystem count={48} />

      {/* 3D RECRUTO Logo */}
      <Logo3D />

      {/* 3D Navigation Menu */}
      <Navigation3D />

      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
        enableZoom={false}
        enablePan={false}
        onChange={handleControlsChange}
        rotateSpeed={0.22}
        enableDamping={true}
        dampingFactor={0.055}
        minPolarAngle={Math.PI / 2 - 0.2}
        maxPolarAngle={Math.PI / 2 + 0.2}
        minAzimuthalAngle={-0.3}
        maxAzimuthalAngle={0.3}
        enabled={!isNavigating}
      />
    </Canvas>
  );
}