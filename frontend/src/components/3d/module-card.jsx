"use client";

import { useRotationStore } from "./use-rotation-store";
import { MODULES } from "./module-data";
import { useNavigate } from "react-router-dom";

export function ModuleCard({ landing = false }) {
  const navigate = useNavigate();
  const { focusedModule, isZoomed } = useRotationStore();

  if (focusedModule === null) return null;

  const module = MODULES[focusedModule];

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${isZoomed ? 1 : 0.85})`,
        padding: "40px 48px",
        width: "420px",
        borderRadius: "2px",
        background: landing
          ? "linear-gradient(165deg, rgba(6, 78, 59, 0.35) 0%, rgba(3, 7, 18, 0.92) 45%, rgba(2, 6, 23, 0.96) 100%)"
          : "rgba(10, 14, 26, 0.95)",
        backdropFilter: "blur(20px)",
        color: "white",
        border: landing ? "1px solid rgba(94, 234, 212, 0.28)" : "1px solid rgba(156, 163, 175, 0.2)",
        boxShadow: landing
          ? "0 25px 50px -12px rgba(0, 0, 0, 0.55), 0 0 40px rgba(16, 185, 129, 0.12)"
          : "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        opacity: isZoomed ? 1 : 0,
        pointerEvents: isZoomed ? "auto" : "none",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 100,
      }}
    >
      {/* Module Number */}
      <div
        style={{
          fontSize: "13px",
          letterSpacing: "2px",
          marginBottom: "16px",
          color: landing ? "rgba(167, 243, 208, 0.75)" : "#9ca3af",
          fontWeight: "500",
          textTransform: "uppercase",
        }}
      >
        Module {(focusedModule + 1).toString().padStart(2, '0')}
      </div>

      {/* Title */}
      <h2
        style={{
          margin: "0 0 12px 0",
          fontSize: "28px",
          fontWeight: "600",
          color: "#f9fafb",
          lineHeight: "1.2",
          letterSpacing: "-0.02em",
        }}
      >
        {module.title}
      </h2>

      {/* Description */}
      <p
        style={{
          margin: landing ? "0 0 0 0" : "0 0 32px 0",
          fontSize: "15px",
          color: landing ? "rgba(226, 232, 240, 0.92)" : "#d1d5db",
          lineHeight: "1.6",
          fontWeight: "400",
        }}
      >
        {module.desc}
      </p>

      {!landing && (
        <button
          onClick={() => navigate(module.route)}
          style={{
            width: "100%",
            padding: "14px 24px",
            borderRadius: "2px",
            background: "#f9fafb",
            color: "#111827",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "15px",
            transition: "all 0.2s",
            letterSpacing: "0.02em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e5e7eb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f9fafb";
          }}
        >
          Enter Module →
        </button>
      )}

      <p
        style={{
          margin: landing ? "18px 0 0 0" : "20px 0 0 0",
          fontSize: "12px",
          color: landing ? "rgba(148, 163, 184, 0.85)" : "#6b7280",
          textAlign: "center",
          fontWeight: "400",
        }}
      >
        Continue rotating to explore other modules
      </p>
    </div>
  );
}