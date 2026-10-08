"use client";

import { useEffect, useCallback } from "react";
import { useViewerStore } from "@/store/viewerStore";

export function useTheme() {
  const theme = useViewerStore((s) => s.theme);
  const toggleTheme = useViewerStore((s) => s.toggleTheme);
  const setTheme = useViewerStore((s) => s.setTheme);

  // Initialize theme from localStorage on initial client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("spherex_theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
      }
    } catch {
      // ignore
    }
  }, [setTheme]);

  // Synchronize document classes whenever theme state changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
      try {
        localStorage.setItem("spherex_theme", "light");
      } catch {
        // ignore
      }
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
      try {
        localStorage.setItem("spherex_theme", "dark");
      } catch {
        // ignore
      }
    }
  }, [theme]);

  const handleToggle = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  return { theme, toggleTheme: handleToggle, setTheme };
}
