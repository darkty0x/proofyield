"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeId = "dark" | "dark-gold" | "light";

type ThemeCtx = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  cycle: () => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);
const ORDER: ThemeId[] = ["dark", "dark-gold", "light"];
const STORAGE_KEY = "proofyield-theme";

function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("dark");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    const initial = saved && ORDER.includes(saved) ? saved : "dark";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    applyTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  const cycle = useCallback(() => {
    setThemeState((prev) => {
      const next = ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length];
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export const THEME_META: Record<
  ThemeId,
  { label: string; logo: "l01" | "l11" | "w01"; mark: "tile" | "ghost" }
> = {
  dark: { label: "Dark", logo: "l01", mark: "tile" },
  "dark-gold": { label: "Gold", logo: "l11", mark: "ghost" },
  light: { label: "Light", logo: "w01", mark: "tile" },
};
