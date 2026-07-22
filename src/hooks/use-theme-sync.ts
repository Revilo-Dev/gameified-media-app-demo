import { useEffect } from "react";
import { useUiStore } from "@/store/use-ui-store";
import { themePresets } from "@/lib/theme-presets";

const STORAGE_KEY = "pulsearc-theme";
const TEXT_SCALE_KEY = "pulsearc-text-scale";

export function useThemeSync() {
  const { theme, textScale, setTheme, setTextScale } = useUiStore();

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const storedTextScale = Number(window.localStorage.getItem(TEXT_SCALE_KEY));
    if (storedTheme && storedTheme in themePresets) {
      setTheme(storedTheme as keyof typeof themePresets);
    }
    if (Number.isFinite(storedTextScale) && storedTextScale >= 0.9 && storedTextScale <= 1.15) {
      setTextScale(storedTextScale);
    }
  }, [setTextScale, setTheme]);

  useEffect(() => {
    const tokens = themePresets[theme].tokens;

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty("--accent", tokens.accent);
    document.documentElement.style.setProperty("--secondary", tokens.secondary);
    document.documentElement.style.setProperty("--error", tokens.error);
    document.documentElement.style.setProperty("--info", tokens.info);
    document.documentElement.style.setProperty("--background", tokens.background);
    document.documentElement.style.setProperty("--on-background", tokens.onBackground);
    document.documentElement.style.setProperty("--canvas", tokens.background);
    document.documentElement.style.setProperty("--surface", tokens.surface);
    document.documentElement.style.setProperty("--surface-alt", tokens.surfaceAlt);
    document.documentElement.style.setProperty("--text", tokens.text);
    document.documentElement.style.setProperty("--text-muted", tokens.textMuted);
    document.documentElement.style.setProperty("--border", tokens.border);
    document.documentElement.style.setProperty("--text-scale", `${textScale}`);
    window.localStorage.setItem(STORAGE_KEY, theme);
    window.localStorage.setItem(TEXT_SCALE_KEY, `${textScale}`);
  }, [textScale, theme]);
}
