import { useEffect } from "react";
import { useUiStore } from "@/store/use-ui-store";

const STORAGE_KEY = "pulsearc-theme";
const ACCENT_KEY = "pulsearc-accent";

export function useThemeSync() {
  const { theme, accentColor, setTheme, setAccentColor } = useUiStore();

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const storedAccent = window.localStorage.getItem(ACCENT_KEY);
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "oled") {
      setTheme(storedTheme);
    }
    if (storedAccent) {
      setAccentColor(storedAccent);
    }
  }, [setAccentColor, setTheme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty("--accent", accentColor);
    window.localStorage.setItem(STORAGE_KEY, theme);
    window.localStorage.setItem(ACCENT_KEY, accentColor);
  }, [accentColor, theme]);
}
