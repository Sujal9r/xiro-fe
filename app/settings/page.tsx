"use client";

import { useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import {
  FONTS,
  PALETTES,
  PaletteKey,
  FontKey,
  ThemeMode,
  getStoredFont,
  getStoredPalette,
  getStoredTheme,
  setFont,
  setPalette,
  setThemeMode,
} from "../../lib/theme";

export default function SettingsPage() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());
  const [palette, setPaletteState] = useState<PaletteKey>(() => getStoredPalette());
  const [font, setFontState] = useState<FontKey>(() => getStoredFont());

  const fontOptions = useMemo(
    () => Object.entries(FONTS) as Array<[FontKey, (typeof FONTS)[FontKey]]>,
    [],
  );
  const paletteOptions = useMemo(
    () => Object.entries(PALETTES) as Array<[PaletteKey, (typeof PALETTES)[PaletteKey]]>,
    [],
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Font</h2>
          <select
            value={font}
            onChange={(e) => {
              const next = e.target.value as FontKey;
              setFontState(next);
              setFont(next);
            }}
            className="w-full md:w-80 rounded-lg border border-gray-200 p-3 text-black"
          >
            {fontOptions.map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.name}
              </option>
            ))}
          </select>
        </section>

        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Color Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(["light", "dark", "system"] as ThemeMode[]).map((value) => (
              <button
                key={value}
                onClick={() => {
                  setMode(value);
                  setThemeMode(value);
                }}
                className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                  mode === value
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Theme Palette</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paletteOptions.map(([key, meta]) => (
              <button
                key={key}
                onClick={() => {
                  setPaletteState(key);
                  setPalette(key);
                }}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
                  palette === key
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span
                  className="h-8 w-8 rounded-full border"
                  style={{ backgroundColor: meta.accent600 }}
                />
                {meta.name}
              </button>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
