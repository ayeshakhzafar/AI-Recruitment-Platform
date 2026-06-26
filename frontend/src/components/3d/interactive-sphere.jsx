"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useRotationStore } from "./use-rotation-store";
import { MODULES } from "./module-data";
import * as THREE from "three";

/** Frame-rate independent smoothing (0–1 per second-ish). */
function dampAngle(current, target, lambda, delta) {
  let diff = target - current;
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  const t = 1 - Math.exp(-lambda * delta);
  return current + diff * t;
}

export function InteractiveSphere() {
  const meshRef = useRef();
  const carryAngleRef = useRef(0);

  const animationStartTime = useRef(0);
  const animationPhase = useRef("idle");
  const targetModuleIndex = useRef(null);
  const spinRotation = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const {
      rotation,
      targetRotation,
      setTargetRotation,
      manualRotation,
      scale,
      setScale,
      setFocusedModule,
      setZoom,
      setRotation,
      isNavigating,
      setIsNavigating,
    } = useRotationStore.getState();

    const d = Math.min(delta, 0.05);

    if (targetRotation !== null && isNavigating) {
      const elapsed = state.clock.elapsedTime - animationStartTime.current;
      const targetAngle = targetRotation;

      if (animationPhase.current === "idle") {
        animationPhase.current = "zooming-out";
        animationStartTime.current = state.clock.elapsedTime;
        spinRotation.current = 0;
      } else if (animationPhase.current === "zooming-out") {
        if (elapsed < 1.2) {
          const progress = elapsed / 1.2;
          setScale(3.5 - 2.5 * progress);

          spinRotation.current += d * 6.5;
          meshRef.current.rotation.y = rotation[1] + spinRotation.current;
          meshRef.current.rotation.x = Math.sin(spinRotation.current * 1.8) * 0.22;
        } else {
          setScale(1.0);
          setFocusedModule(null);
          setZoom(false);
          carryAngleRef.current = useRotationStore.getState().rotation[1];
          animationPhase.current = "rotating";
          animationStartTime.current = state.clock.elapsedTime;
          spinRotation.current = 0;
        }
      } else if (animationPhase.current === "rotating") {
        carryAngleRef.current = dampAngle(carryAngleRef.current, targetAngle, 2.2, d);

        let diff = targetAngle - carryAngleRef.current;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;

        spinRotation.current += d * 4.5;
        meshRef.current.rotation.y = carryAngleRef.current + spinRotation.current;
        meshRef.current.rotation.x = Math.sin(spinRotation.current * 1.2) * 0.14;
        meshRef.current.rotation.z = Math.cos(spinRotation.current * 0.9) * 0.06;

        if (Math.abs(diff) < 0.022) {
          setRotation([0, targetAngle, 0]);
          carryAngleRef.current = targetAngle;
          animationPhase.current = "zooming-in";
          animationStartTime.current = state.clock.elapsedTime;
          spinRotation.current = 0;

          MODULES.forEach((module, index) => {
            if (Math.abs(module.angle - targetAngle) < 0.1) {
              targetModuleIndex.current = index;
            }
          });
        }
      } else if (animationPhase.current === "zooming-in") {
        const zoomElapsed = state.clock.elapsedTime - animationStartTime.current;
        if (zoomElapsed < 1.35) {
          const progress = zoomElapsed / 1.35;
          setScale(1.0 + 2.5 * progress);

          const spinSpeed = 6.5 * (1 - progress);
          spinRotation.current += d * spinSpeed;
          meshRef.current.rotation.y = targetAngle + spinRotation.current;
          meshRef.current.rotation.x = Math.sin(spinRotation.current) * 0.14 * (1 - progress);
        } else {
          setScale(3.5);
          setRotation([0, targetAngle, 0]);
          meshRef.current.rotation.y = targetAngle;
          meshRef.current.rotation.x = 0;
          meshRef.current.rotation.z = 0;

          if (targetModuleIndex.current !== null) {
            setFocusedModule(targetModuleIndex.current);
            setZoom(true);
          }
          setTargetRotation(null);
          animationPhase.current = "idle";
          setIsNavigating(false);
          targetModuleIndex.current = null;
          spinRotation.current = 0;
        }
      }
    } else {
      meshRef.current.rotation.y = rotation[1];
      meshRef.current.rotation.x = manualRotation[0] * 0.05;
      meshRef.current.rotation.z = 0;
      carryAngleRef.current = rotation[1];
    }

    const targetScale = useRotationStore.getState().scale;
    const cur = meshRef.current.scale.x;
    const smoothed = THREE.MathUtils.damp(cur, targetScale, 10, d);
    meshRef.current.scale.set(smoothed, smoothed, smoothed);
  });

  return (
    <group scale={0.82}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 8]} />
        <meshStandardMaterial
          color="#0a1628"
          emissive="#030a18"
          emissiveIntensity={0.05}
          roughness={0.5}
          metalness={0.78}
          envMapIntensity={0.75}
        />
      </mesh>

      <mesh scale={1.05}>
        <icosahedronGeometry args={[1, 6]} />
        <meshBasicMaterial color="#1e3a8a" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}
