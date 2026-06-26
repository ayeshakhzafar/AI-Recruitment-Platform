"use client";

import { Html } from "@react-three/drei";
import { useRotationStore } from "./use-rotation-store";
import { useNavigate } from "react-router-dom";

export function ModuleCardAttached({ module }) {
  const { focusedModule, scale } = useRotationStore();
  const navigate = useNavigate();

  const isFocused = focusedModule && module.name === focusedModule.name;

  return (
    <Html
      position={[0, 0, 1.5]} // always in front of camera
      style={{
        opacity: isFocused ? 1 : 0,
        pointerEvents: isFocused ? "auto" : "none",
        cursor: isFocused ? "pointer" : "default",
        transition: "all 0.3s",
        transform: `scale(${isFocused ? 1 + (scale - 1) * 0.5 : 1})`,
        background: "rgba(79,70,229,0.85)",
        padding: "10px 18px",
        borderRadius: 8,
        color: "#fff",
        fontWeight: "bold",
        textAlign: "center",
      }}
      occlude
      onClick={() => isFocused && navigate(module.route)}
    >
      {module.name}
    </Html>
  );
}
