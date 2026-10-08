import { create } from "zustand";
import type { Observation, SkyRegion } from "@/lib/types";

interface ViewerState {
  zoom: number;
  panX: number;
  panY: number;
  crosshairEnabled: boolean;
  crosshairPos: { x: number; y: number; ra?: number; dec?: number } | null;
  selectedObservation: Observation | null;
  selectedRegion: SkyRegion | null;
  theme: "dark" | "light";

  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  setCrosshairEnabled: (enabled: boolean) => void;
  setCrosshairPos: (pos: { x: number; y: number; ra?: number; dec?: number } | null) => void;
  setSelectedObservation: (obs: Observation | null) => void;
  setSelectedRegion: (region: SkyRegion | null) => void;
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light") => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  crosshairEnabled: true,
  crosshairPos: null,
  selectedObservation: null,
  selectedRegion: null,
  theme: "dark",

  setZoom: (zoom) =>
    set((state) => ({
      zoom: typeof zoom === "function" ? Math.min(10, Math.max(0.5, zoom(state.zoom))) : Math.min(10, Math.max(0.5, zoom)),
    })),

  setPan: (panX, panY) => set({ panX, panY }),

  resetView: () => set({ zoom: 1, panX: 0, panY: 0, crosshairPos: null }),

  setCrosshairEnabled: (crosshairEnabled) => set({ crosshairEnabled }),

  setCrosshairPos: (crosshairPos) => set({ crosshairPos }),

  setSelectedObservation: (selectedObservation) => set({ selectedObservation }),

  setSelectedRegion: (selectedRegion) => set({ selectedRegion }),

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

  setTheme: (theme) => set({ theme }),
}));
