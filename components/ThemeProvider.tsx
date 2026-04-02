"use client";

import { useEffect } from "react";
import {
  applyFont,
  applyPalette,
  applyTheme,
  getStoredFont,
  getStoredPalette,
  getStoredTheme,
} from "../lib/theme";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mode = getStoredTheme();
    applyTheme(mode);
    applyPalette(getStoredPalette());
    applyFont(getStoredFont());

    if (mode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  return <>{children}</>;
}
