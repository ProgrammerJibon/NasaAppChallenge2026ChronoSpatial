"use client";

import { useEffect } from "react";
import { useViewerStore } from "@/store/viewerStore";

export function useTheme() {
  const theme = useViewerStore((s) => s.theme);
  const toggleTheme = useViewerStore((s) => s.toggleTheme);
  const setTheme = useViewerStore((s) => s.setTheme);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return { theme, toggleTheme, setTheme };
}
