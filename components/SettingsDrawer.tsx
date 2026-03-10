"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "../lib/theme";
import {
  HiOutlineX,
  HiOutlineAdjustments,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineDesktopComputer,
} from "react-icons/hi";

export default function SettingsDrawer() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("system");
  const [palette, setPaletteState] = useState<PaletteKey>("indigo");
  const [font, setFontState] = useState<FontKey>("geist");

  useEffect(() => {
    setMode(getStoredTheme());
    setPaletteState(getStoredPalette());
    setFontState(getStoredFont());
  }, []);

  const paletteOptions = useMemo(
    () => Object.entries(PALETTES) as Array<[PaletteKey, (typeof PALETTES)[PaletteKey]]>,
    [],
  );
  const fontOptions = useMemo(
    () => Object.entries(FONTS) as Array<[FontKey, (typeof FONTS)[FontKey]]>,
    [],
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-5 top-1/2 -translate-y-1/2 z-40 rounded-full bg-white text-gray-700 border border-gray-200 shadow-xl h-12 w-12 flex items-center justify-center hover:bg-gray-50"
        aria-label="Open settings"
      >
        <HiOutlineAdjustments className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-4 top-6 bottom-6 w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
                <p className="text-xs text-gray-500">Personalize your experience</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-100"
                aria-label="Close settings"
              >
                <HiOutlineX className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Color Mode</h4>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "light", label: "Light", icon: HiOutlineSun },
                    { value: "dark", label: "Dark", icon: HiOutlineMoon },
                    { value: "system", label: "System", icon: HiOutlineDesktopComputer },
                  ] as Array<{ value: ThemeMode; label: string; icon: typeof HiOutlineSun }>).map(
                    (item) => (
                      <button
                        key={item.value}
                        onClick={() => {
                          setMode(item.value);
                          setThemeMode(item.value);
                        }}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium flex flex-col items-center gap-1 ${
                          mode === item.value
                            ? "border-blue-600 text-blue-600 bg-blue-50"
                            : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Font</h4>
                <select
                  value={font}
                  onChange={(e) => {
                    const next = e.target.value as FontKey;
                    setFontState(next);
                    setFont(next);
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black"
                >
                  {fontOptions.map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Palette</h4>
                <div className="grid grid-cols-2 gap-2">
                  {paletteOptions.map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setPaletteState(key);
                        setPalette(key);
                      }}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-xs font-medium ${
                        palette === key
                          ? "border-blue-600 text-blue-600 bg-blue-50"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className="h-7 w-7 rounded-full border border-white/60 shadow-inner"
                        style={{ backgroundColor: meta.accent600 }}
                      />
                      {meta.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
