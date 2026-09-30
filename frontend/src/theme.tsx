import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "de-erp-theme";

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* localStorage no disponible */
  }
  return "dark";
}

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggle: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0f1c15" : "#f4f7f0");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    // ya se aplico el tema nuevo, deja las transiciones normales otra vez
    const id = requestAnimationFrame(() => root.classList.remove("theme-changing"));
    return () => cancelAnimationFrame(id);
  }, [theme]);

  // mientras cambia el tema, congela las transiciones para que cambie todo junto
  const change = useCallback((next: (t: Theme) => Theme) => {
    document.documentElement.classList.add("theme-changing");
    setThemeState(next);
  }, []);

  const setTheme = useCallback((t: Theme) => change(() => t), [change]);
  const toggle = useCallback(
    () => change((t) => (t === "dark" ? "light" : "dark")),
    [change],
  );

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext);
}

// saca los colores de la grafica segun el tema que este activo
// eslint-disable-next-line react-refresh/only-export-components
export function readChartColors() {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fb: string) => s.getPropertyValue(name).trim() || fb;
  return {
    line: v("--chart-line", "#c4ef4a"),
    axis: v("--chart-axis", "#7c8c7d"),
    grid: v("--chart-grid", "rgba(255,255,255,0.06)"),
    cursor: v("--chart-cursor", "rgba(255,255,255,0.16)"),
    surface: `rgb(${v("--c-surface-1", "21 35 27")})`,
  };
}
