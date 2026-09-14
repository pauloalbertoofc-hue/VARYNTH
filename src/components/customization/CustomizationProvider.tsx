"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ACCENT_COLORS, DEFAULT_PREFERENCES, parsePreferences, type PlatformPreferences } from "@/lib/customization/preferences";

const PreferencesContext = createContext<PlatformPreferences>(DEFAULT_PREFERENCES);
export function CustomizationProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  useEffect(() => {
    let active = true;
    const load = () => fetch("/api/platform/preferences", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((value) => { if (active && value) setPreferences(parsePreferences(value.preferences || value)); }).catch(() => undefined);
    void load();
    window.addEventListener("varynth-preferences-updated", load);
    return () => { active = false; window.removeEventListener("varynth-preferences-updated", load); };
  }, []);
  useEffect(() => {
    const accent = preferences.accentColor;
    const values = [
      `color-mix(in srgb, ${accent} 52%, white)`,
      `color-mix(in srgb, ${accent} 76%, white)`,
      accent,
      `color-mix(in srgb, ${accent} 82%, black)`,
      `color-mix(in srgb, ${accent} 64%, black)`,
    ];
    const root = document.documentElement;
    [400, 500, 600, 700, 800].forEach((shade, index) => root.style.setProperty(`--color-violet-${shade}`, values[index]));
    root.style.setProperty("--color-violet-300", values[0]);
    root.style.setProperty("--color-varynth-accent", values[2]);
    root.style.setProperty("--color-varynth-accent-light", values[0]);
    const rgb = accent.slice(1).match(/[\da-f]{2}/gi)?.map((part) => parseInt(part, 16)) || [124, 58, 237];
    root.style.setProperty("--color-varynth-accent-glow", `rgba(${rgb.join(", ")}, 0.3)`);
    document.title = document.title.replace(/^.*?(?= \| )/, preferences.appName);
  }, [preferences]);
  return <PreferencesContext.Provider value={preferences}>{children}</PreferencesContext.Provider>;
}
export function usePlatformPreferences() { return useContext(PreferencesContext); }
