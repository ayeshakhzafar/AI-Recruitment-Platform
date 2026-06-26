"use client";

import { Suspense, useEffect, useLayoutEffect } from "react";
import { SceneCanvas } from "../components/3d/scene-canvas";
import { RotationControls } from "../components/3d/rotations-controls";
import { useRotationStore } from "../components/3d/use-rotation-store";
import { MODULES } from "../components/3d/module-data";
import LandingNav from "../components/LandingNav";
import LandingHeroCenter from "../components/LandingHeroCenter";
import LandingQuote from "../components/LandingQuote";
import LandingModulesSection from "../components/LandingModulesSection";

const INTRO_FROM_INDEX = 6;
const INTRO_TO_INDEX = 0;

export default function HomePage() {
  /** Stage rotation before paint, then run same zoom/spin sequence as module changes. */
  useLayoutEffect(() => {
    const s = useRotationStore.getState();
    s.setTargetRotation(null);
    s.setIsNavigating(false);
    s.setFocusedModule(null);
    s.setZoom(false);
    s.setScale(1);
    s.setRotation([0, MODULES[INTRO_FROM_INDEX].angle, 0]);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const s = useRotationStore.getState();
      s.setIsNavigating(true);
      s.setTargetRotation(MODULES[INTRO_TO_INDEX].angle);
    }, 720);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const { rotation, setTargetRotation, setScale, setIsNavigating, focusedModule } = useRotationStore.getState();

        const currentAngle = ((rotation[1] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        let currentModuleIndex = -1;
        let smallestDiff = Infinity;

        MODULES.forEach((module, index) => {
          const moduleAngle = ((module.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          let diff = Math.abs(currentAngle - moduleAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;

          if (diff < 0.15 && diff < smallestDiff) {
            smallestDiff = diff;
            currentModuleIndex = index;
          }
        });

        let targetIndex;
        if (e.key === "ArrowRight") {
          if (currentModuleIndex === -1) {
            targetIndex = 0;
          } else {
            targetIndex = (currentModuleIndex + 1) % MODULES.length;
          }
        } else {
          if (currentModuleIndex === -1) {
            targetIndex = MODULES.length - 1;
          } else {
            targetIndex = (currentModuleIndex - 1 + MODULES.length) % MODULES.length;
          }
        }

        setIsNavigating(true);

        if (focusedModule !== null) {
          setScale(3.5);
        } else {
          setScale(1.0);
        }

        const targetAngle = MODULES[targetIndex].angle;
        setTargetRotation(targetAngle);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        position: "relative",
        background: "#1e293b",
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "auto",
        }}
      >
        <Suspense
          fallback={
            <div
              style={{
                color: "#93c5fd",
                fontSize: 18,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                flexDirection: "column",
                gap: "16px",
                background: "#030712",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid rgba(59, 130, 246, 0.35)",
                  borderTopColor: "#60a5fa",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              Loading 3D Experience...
            </div>
          }
        >
          <SceneCanvas />
        </Suspense>
      </div>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background: `
            radial-gradient(ellipse 85% 60% at 50% 28%, rgba(59, 130, 246, 0.15) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 70% 40%, rgba(96, 165, 250, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at center, transparent 0%, rgba(30, 41, 59, 0.25) 100%)
          `,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(30,41,59,0.15) 0%, transparent 20%, transparent 60%, rgba(30,41,59,0.1) 75%, rgba(30,41,59,0.2) 85%, rgba(30,41,59,0.4) 95%, #1e293b 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <LandingNav />
        </div>

        <section
          style={{
            minHeight: "min(100vh, 900px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingTop: 88,
            paddingBottom: 48,
            boxSizing: "border-box",
          }}
        >
          <div
            className="landing-hero-row"
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: 28,
              maxWidth: 1180,
              margin: "0 auto",
              padding: "0 20px",
              width: "100%",
            }}
          >
            <div style={{ flex: "1 1 340px", minWidth: 260, maxWidth: 720, pointerEvents: "auto" }}>
              <LandingHeroCenter />
            </div>
            <div style={{ flex: "0 1 300px", pointerEvents: "none" }}>
              <LandingQuote />
            </div>
          </div>
        </section>

        <div style={{ pointerEvents: "auto" }}>
          <LandingModulesSection />
        </div>
      </div>

      <RotationControls />

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 900px) {
          .landing-hero-row {
            flex-direction: column !important;
          }
          .landing-hero-row > div:last-child {
            width: 100%;
            max-width: 360px;
          }
        }
      `}</style>
    </div>
  );
}
