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
    applyTheme(getStoredTheme());
    applyPalette(getStoredPalette());
    applyFont(getStoredFont());

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(getStoredTheme());
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  return <>{children}</>;
}
