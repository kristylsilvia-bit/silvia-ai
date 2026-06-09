import { useCallback, useEffect, useState } from "react";

import type { Theme } from "../types";
import { loadTheme, saveTheme } from "../lib/storage";

/** Theme state synced to <html data-theme> and localStorage. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => loadTheme("dark"));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return [theme, toggleTheme];
}
