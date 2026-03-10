export type ThemeMode = "light" | "dark" | "system";
export type PaletteKey =
  | "indigo"
  | "emerald"
  | "orange"
  | "rose"
  | "slate"
  | "violet";
export type FontKey = "geist" | "poppins" | "merriweather" | "space";

export const PALETTES: Record<
  PaletteKey,
  { name: string; accent500: string; accent600: string; accent700: string }
> = {
  indigo: { name: "Indigo", accent500: "#6366f1", accent600: "#4f46e5", accent700: "#4338ca" },
  emerald: { name: "Emerald", accent500: "#10b981", accent600: "#059669", accent700: "#047857" },
  orange: { name: "Orange", accent500: "#f97316", accent600: "#ea580c", accent700: "#c2410c" },
  rose: { name: "Rose", accent500: "#f43f5e", accent600: "#e11d48", accent700: "#be123c" },
  slate: { name: "Slate", accent500: "#64748b", accent600: "#475569", accent700: "#334155" },
  violet: { name: "Violet", accent500: "#8b5cf6", accent600: "#7c3aed", accent700: "#6d28d9" },
};

export const FONTS: Record<FontKey, { name: string; cssVar: string }> = {
  geist: { name: "Geist", cssVar: "--font-geist-sans" },
  poppins: { name: "Poppins", cssVar: "--font-poppins" },
  merriweather: { name: "Merriweather", cssVar: "--font-merriweather" },
  space: { name: "Space Grotesk", cssVar: "--font-space" },
};

const THEME_KEY = "theme_mode";
const PALETTE_KEY = "theme_palette";
const FONT_KEY = "theme_font";

export const getStoredTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  const value = localStorage.getItem(THEME_KEY) as ThemeMode | null;
  return value || "system";
};

export const getStoredPalette = (): PaletteKey => {
  if (typeof window === "undefined") return "indigo";
  const value = localStorage.getItem(PALETTE_KEY) as PaletteKey | null;
  return value || "indigo";
};

export const getStoredFont = (): FontKey => {
  if (typeof window === "undefined") return "geist";
  const value = localStorage.getItem(FONT_KEY) as FontKey | null;
  return value || "geist";
};

export const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldDark = mode === "dark" || (mode === "system" && prefersDark);
  if (shouldDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

export const applyPalette = (palette: PaletteKey) => {
  document.documentElement.setAttribute("data-palette", palette);
};

export const applyFont = (font: FontKey) => {
  document.documentElement.setAttribute("data-font", font);
};

export const setThemeMode = (mode: ThemeMode) => {
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
};

export const setPalette = (palette: PaletteKey) => {
  localStorage.setItem(PALETTE_KEY, palette);
  applyPalette(palette);
};

export const setFont = (font: FontKey) => {
  localStorage.setItem(FONT_KEY, font);
  applyFont(font);
};
