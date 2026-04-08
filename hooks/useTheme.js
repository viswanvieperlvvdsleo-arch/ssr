'use client';

import { useEffect, useState, useCallback } from "react";

const THEME_KEY = "ssr-theme";
const DEFAULT_THEME = "dark";

export function useTheme() {
  const [theme, setThemeState] = useState(DEFAULT_THEME);

  const applyTheme = useCallback((mode) => {
    const next = mode === "light" ? "light" : "dark";
    setThemeState(next);
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light");
    root.classList.add(`theme-${next}`);
    localStorage.setItem(THEME_KEY, next);
  }, []);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
    applyTheme(saved || DEFAULT_THEME);
  }, [applyTheme]);

  return { theme, setTheme: applyTheme };
}
