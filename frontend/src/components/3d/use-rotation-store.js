import { create } from "zustand";

export const useRotationStore = create((set) => ({
  rotation: [0, -(Math.PI * 2) / 13 / 2, 0], // Halfway between Module 13 and Module 1
  targetRotation: null,
  manualRotation: [0, 0, 0],
  scale: 1,
  focusedModule: null,
  isZoomed: false,
  rotationProgress: 0,
  isNavigating: false,

  setRotation: (rotation) => set({ rotation }),
  setManualRotation: (rotation) => set({ manualRotation: rotation }),
  setTargetRotation: (angle) => set({ targetRotation: angle }),
  setScale: (scale) => set({ scale }),
  setFocusedModule: (module) => set({ focusedModule: module }),
  setZoom: (state) => set({ isZoomed: state }),
  setRotationProgress: (progress) => set({ rotationProgress: progress }),
  setIsNavigating: (state) => set({ isNavigating: state }),
}));