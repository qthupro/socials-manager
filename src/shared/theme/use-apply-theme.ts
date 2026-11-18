import { useEffect } from "react";

import { useTheme } from "./theme-store";

/** Keeps <html> in sync with the chosen theme (`dark` class). */
export function useApplyTheme() {
  const theme = useTheme((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    // Accent presets were removed; drop the attribute left by older versions.
    delete document.documentElement.dataset.accent;
  }, [theme]);
}
