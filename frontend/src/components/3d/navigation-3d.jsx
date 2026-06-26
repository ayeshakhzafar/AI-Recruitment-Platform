"use client";

import RecrutoLogoMark from "../RecrutoLogoMark";

// Modern fixed overlay logo - stays in place always
export function Logo3D() {
  return null; // Remove 3D logo
}

export function Navigation3D() {
  return null;
}

/** Top-left brand: RT + Recruto with globe mark */
export function LogoOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        top: 28,
        left: 28,
        zIndex: 200,
        pointerEvents: "auto",
      }}
    >
      <RecrutoLogoMark />
    </div>
  );
}
