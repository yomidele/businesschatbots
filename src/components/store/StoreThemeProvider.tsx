import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface StoreTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  cardColor: string;
  fontFamily: string;
}

const DEFAULT_THEME: StoreTheme = {
  primaryColor: "#d97706",
  secondaryColor: "#92400e",
  accentColor: "#f59e0b",
  backgroundColor: "#fefce8",
  textColor: "#1c1917",
  cardColor: "#ffffff",
  fontFamily: "'Inter', system-ui, sans-serif",
};

interface StoreThemeContextValue {
  theme: StoreTheme;
  setTheme: (t: StoreTheme) => void;
  applyTheme: (t: Partial<StoreTheme>) => void;
}

const StoreThemeContext = createContext<StoreThemeContextValue | null>(null);

export const useStoreTheme = () => {
  const ctx = useContext(StoreThemeContext);
  if (!ctx) throw new Error("useStoreTheme must be used within StoreThemeProvider");
  return ctx;
};

function applyCSS(theme: StoreTheme) {
  const root = document.documentElement;
  root.style.setProperty("--store-primary", theme.primaryColor);
  root.style.setProperty("--store-secondary", theme.secondaryColor);
  root.style.setProperty("--store-accent", theme.accentColor);
  root.style.setProperty("--store-bg", theme.backgroundColor);
  root.style.setProperty("--store-text", theme.textColor);
  root.style.setProperty("--store-card", theme.cardColor);
  root.style.setProperty("--store-font", theme.fontFamily);
}

export function StoreThemeProvider({ siteId, dbTheme, children }: { siteId: string; dbTheme?: Partial<StoreTheme>; children: ReactNode }) {
  const storageKey = `store_theme_${siteId}`;

  const [theme, setThemeState] = useState<StoreTheme>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return { ...DEFAULT_THEME, ...JSON.parse(saved) };
    } catch {}
    return { ...DEFAULT_THEME, ...dbTheme };
  });

  useEffect(() => {
    applyCSS(theme);
  }, [theme]);

  const setTheme = (t: StoreTheme) => {
    setThemeState(t);
    try { localStorage.setItem(storageKey, JSON.stringify(t)); } catch {}
  };

  const applyTheme = (partial: Partial<StoreTheme>) => {
    setTheme({ ...theme, ...partial });
  };

  return (
    <StoreThemeContext.Provider value={{ theme, setTheme, applyTheme }}>
      {children}
    </StoreThemeContext.Provider>
  );
}
