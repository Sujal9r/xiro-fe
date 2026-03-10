"use client";

import { useEffect, useState } from "react";
import { HiOutlineMoon, HiOutlineSun, HiOutlineDesktopComputer } from "react-icons/hi";
import {
  getStoredTheme,
  setThemeMode,
  ThemeMode,
} from "../lib/theme";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const initial = getStoredTheme();
    setTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    setThemeMode(next);
  };

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition ${
        compact ? "px-2" : ""
      }`}
      aria-label="Toggle theme"
      type="button"
    >
      {theme === "dark" ? (
        <>
          <HiOutlineSun className="h-4 w-4" />
          {!compact && "Light"}
        </>
      ) : theme === "light" ? (
        <>
          <HiOutlineMoon className="h-4 w-4" />
          {!compact && "Dark"}
        </>
      ) : (
        <>
          <HiOutlineDesktopComputer className="h-4 w-4" />
          {!compact && "System"}
        </>
      )}
    </button>
  );
}
