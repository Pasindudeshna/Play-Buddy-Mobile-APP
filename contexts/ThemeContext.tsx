import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";

export type ThemeColors = {
  /** LinearGradient colors for full-page backgrounds. */
  background: [string, string];
  /** Card / panel surfaces. */
  surface: string;
  surfaceBorder: string;
  /** Text input backgrounds. */
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  /** Brand accent (buttons, highlights, active states). */
  accent: string;
  accentSoft: string;
  /** Text/icon color placed on top of an accent-colored background. */
  accentText: string;
  danger: string;
  dangerSoft: string;
  border: string;
  statusBar: "light" | "dark";
};

const DARK_COLORS: ThemeColors = {
  background: ["#080909", "rgba(5, 27, 31, 0.97)"],
  surface: "rgba(102, 211, 197, 0.08)",
  surfaceBorder: "rgba(69, 255, 179, 0.08)",
  inputBg: "#022424",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255, 255, 255, 0.55)",
  accent: "#45ffb3",
  accentSoft: "rgba(69, 255, 179, 0.12)",
  accentText: "#000000",
  danger: "#db2211",
  dangerSoft: "rgba(219, 34, 17, 0.08)",
  border: "rgba(255, 255, 255, 0.08)",
  statusBar: "light",
};

const LIGHT_COLORS: ThemeColors = {
  background: ["#eef8f5", "#dcefe9"],
  surface: "#ffffff",
  surfaceBorder: "rgba(11, 61, 53, 0.1)",
  inputBg: "#eef3f2",
  textPrimary: "#0b1a17",
  textSecondary: "rgba(11, 26, 23, 0.6)",
  accent: "#0f9d70",
  accentSoft: "rgba(15, 157, 112, 0.12)",
  accentText: "#ffffff",
  danger: "#c62817",
  dangerSoft: "rgba(198, 40, 23, 0.08)",
  border: "rgba(11, 26, 23, 0.08)",
  statusBar: "dark",
};

const STORAGE_KEY = "playbuddy.themeMode";

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") setModeState(saved);
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const toggleTheme = () => setMode(mode === "dark" ? "light" : "dark");

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: mode === "dark" ? DARK_COLORS : LIGHT_COLORS,
      isDark: mode === "dark",
      toggleTheme,
      setMode,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
