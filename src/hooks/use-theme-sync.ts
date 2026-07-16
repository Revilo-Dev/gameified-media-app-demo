import { useEffect } from "react";
import { useUiStore } from "@/store/use-ui-store";

const STORAGE_KEY = "pulsearc-theme";
const ACCENT_KEY = "pulsearc-accent";
const TEXT_SCALE_KEY = "pulsearc-text-scale";

export function useThemeSync() {
  const { theme, accentColor, textScale, setTheme, setAccentColor, setTextScale } = useUiStore();

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const storedAccent = window.localStorage.getItem(ACCENT_KEY);
    const storedTextScale = Number(window.localStorage.getItem(TEXT_SCALE_KEY));
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
    if (storedAccent) {
      setAccentColor(storedAccent);
    }
    if (Number.isFinite(storedTextScale) && storedTextScale >= 0.9 && storedTextScale <= 1.15) {
      setTextScale(storedTextScale);
    }
  }, [setAccentColor, setTextScale, setTheme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty("--accent", accentColor);
    document.documentElement.style.setProperty("--text-scale", `${textScale}`);
    window.localStorage.setItem(STORAGE_KEY, theme);
    window.localStorage.setItem(ACCENT_KEY, accentColor);
    window.localStorage.setItem(TEXT_SCALE_KEY, `${textScale}`);
  }, [accentColor, textScale, theme]);
}
