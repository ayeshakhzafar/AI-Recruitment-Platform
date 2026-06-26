"use client";

import { useRotationStore } from "./use-rotation-store";
import { MODULES } from "./module-data";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export function ModuleNavigator() {
  const { rotation, focusedModule, setTargetRotation, setScale, setIsNavigating } = useRotationStore();
  const [currentModuleIndex, setCurrentModuleIndex] = useState(-1);
  const clickQueue = useRef(0);
  const directionRef = useRef(null);
  const timerRef = useRef(null);

  // Update current module index based on rotation
  useEffect(() => {
    const currentAngle = ((rotation[1] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let closestModuleIndex = -1;
    let smallestDiff = Infinity;
    
    MODULES.forEach((module, index) => {
      const moduleAngle = ((module.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      let diff = Math.abs(currentAngle - moduleAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 0.15 && diff < smallestDiff) {
        smallestDiff = diff;
        closestModuleIndex = index;
      }
    });
    
    setCurrentModuleIndex(closestModuleIndex);
  }, [rotation]);

  const navigateToTarget = () => {
    if (clickQueue.current === 0 || !directionRef.current) return;

    let targetIndex;
    const clicks = clickQueue.current;
    
    if (directionRef.current === 'left') {
      if (currentModuleIndex === -1) {
        // At neutral position, go to the last module
        targetIndex = (MODULES.length - clicks) % MODULES.length;
      } else {
        // From a module, go left by clicks count
        targetIndex = (currentModuleIndex - clicks + MODULES.length) % MODULES.length;
      }
    } else { // 'right'
      if (currentModuleIndex === -1) {
        // At neutral position, go to the module at clicks position
        targetIndex = Math.min(clicks - 1, MODULES.length - 1);
      } else {
        // From a module, go right by clicks count
        targetIndex = (currentModuleIndex + clicks) % MODULES.length;
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
    
    // Reset queue
    clickQueue.current = 0;
    directionRef.current = null;
  };

  const handleArrowClick = (clickDirection) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // If direction changes, reset the queue
    if (directionRef.current && directionRef.current !== clickDirection) {
      clickQueue.current = 0;
    }
    
    // Set direction and increment click count
    directionRef.current = clickDirection;
    clickQueue.current += 1;
    
    // Set a timer to process the navigation after a short delay
    timerRef.current = setTimeout(() => {
      navigateToTarget();
    }, 50); // 50ms delay to capture multiple clicks
  };

  const navigateLeft = () => handleArrowClick('left');
  const navigateRight = () => handleArrowClick('right');

  // Direct navigation to a specific module (when clicking dots)
  const navigateToModuleIndex = (index) => {
    setIsNavigating(true);
    
    if (focusedModule !== null) {
      setScale(3.5);
    } else {
      setScale(1.0);
    }
    
    const targetAngle = MODULES[index].angle;
    setTargetRotation(targetAngle);
  };

  // Navigate to neutral position
  const navigateToNeutral = () => {
    setIsNavigating(true);
    setScale(1.0);
    setTargetRotation(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleArrowClick(e.key === 'ArrowLeft' ? 'left' : 'right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentModuleIndex]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "35px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        zIndex: 100,
      }}
    >
      {/* Left Arrow */}
      <button
        onClick={navigateLeft}
        style={{
          width: "46px",
          height: "46px",
          borderRadius: "12px",
          background: "rgba(15, 23, 42, 0.90)",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)";
          e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(15, 23, 42, 0.90)";
          e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.25)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <ChevronLeft size={24} color="#cbd5e1" strokeWidth={2} />
      </button>

      {/* Module Indicators - Bigger and more accessible */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          padding: "14px 24px",
          background: "rgba(15, 23, 42, 0.90)",
          borderRadius: "12px",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.2)",
          alignItems: "center",
        }}
      >
        {/* Neutral/Start Position - Larger */}
        <button
          onClick={navigateToNeutral}
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: currentModuleIndex === -1
              ? "linear-gradient(135deg, #6366f1, #818cf8)"
              : "rgba(148, 163, 184, 0.25)",
            boxShadow: currentModuleIndex === -1
              ? "0 0 12px rgba(99, 102, 241, 0.6)"
              : "none",
            transform: currentModuleIndex === -1 ? "scale(1.3)" : "scale(1)",
            transition: "all 0.3s ease",
            border: currentModuleIndex === -1 ? "1.5px solid rgba(255, 255, 255, 0.3)" : "none",
            cursor: "pointer",
            padding: 0,
            outline: "none",
            position: "relative",
            minWidth: "12px",
            minHeight: "12px",
          }}
          onMouseEnter={(e) => {
            if (currentModuleIndex !== -1) {
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.4)";
              e.currentTarget.style.transform = "scale(1.3)";
              e.currentTarget.style.boxShadow = "0 0 8px rgba(99, 102, 241, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (currentModuleIndex !== -1) {
              e.currentTarget.style.background = "rgba(148, 163, 184, 0.25)";
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
          title="Start Position"
        />
        
        {/* Module indicators - Larger and more prominent */}
        {MODULES.map((module, index) => (
          <button
            key={index}
            onClick={() => navigateToModuleIndex(index)}
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background:
                index === currentModuleIndex
                  ? "linear-gradient(135deg, #6366f1, #818cf8)"
                  : index === focusedModule
                  ? "linear-gradient(135deg, #60a5fa, #93c5fd)"
                  : "rgba(148, 163, 184, 0.25)",
              boxShadow:
                index === currentModuleIndex
                  ? "0 0 12px rgba(99, 102, 241, 0.6)"
                  : index === focusedModule
                  ? "0 0 8px rgba(96, 165, 250, 0.4)"
                  : "none",
              transform: index === currentModuleIndex ? "scale(1.3)" : "scale(1)",
              transition: "all 0.3s ease",
              border: index === currentModuleIndex ? "1.5px solid rgba(255, 255, 255, 0.3)" : "none",
              cursor: "pointer",
              padding: 0,
              outline: "none",
              position: "relative",
              minWidth: "12px",
              minHeight: "12px",
            }}
            onMouseEnter={(e) => {
              if (index !== currentModuleIndex && index !== focusedModule) {
                e.currentTarget.style.background = "rgba(99, 102, 241, 0.4)";
                e.currentTarget.style.transform = "scale(1.3)";
                e.currentTarget.style.boxShadow = "0 0 8px rgba(99, 102, 241, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              if (index !== currentModuleIndex && index !== focusedModule) {
                e.currentTarget.style.background = "rgba(148, 163, 184, 0.25)";
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
            title={`Module ${index + 1}: ${module.title}`}
          />
        ))}
      </div>

      {/* Right Arrow */}
      <button
        onClick={navigateRight}
        style={{
          width: "46px",
          height: "46px",
          borderRadius: "12px",
          background: "rgba(15, 23, 42, 0.90)",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)";
          e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(15, 23, 42, 0.90)";
          e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.25)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <ChevronRight size={24} color="#cbd5e1" strokeWidth={2} />
      </button>
    </div>
  );
}