"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "recruto_theme";

const light = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  accent: "#7c3aed",
  accentSoft: "rgba(124, 58, 237, 0.12)",
};

const dark = {
  bg: "#0f172a",
  card: "#1e293b",
  text: "#f1f5f9",
  muted: "#94a3b8",
  border: "#334155",
  accent: "#38bdf8",
  accentSoft: "rgba(56, 189, 248, 0.15)",
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t) => {
    setThemeState(t === "dark" ? "dark" : "light");
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const isDark = theme === "dark";
  const colors = useMemo(() => (isDark ? dark : light), [isDark]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isDark, colors }),
    [theme, setTheme, toggleTheme, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "light",
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: false,
      colors: light,
    };
  }
  return ctx;
}
