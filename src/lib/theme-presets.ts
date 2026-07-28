import type { ThemeMode } from "@/types/models";

export interface ThemeTokens {
  text: string;
  accent: string;
  secondary: string;
  error: string;
  info: string;
  background: string;
  onBackground: string;
  surface: string;
  surfaceAlt: string;
  textMuted: string;
  border: string;
}

export interface ThemeDefinition {
  label: string;
  description: string;
  tokens: ThemeTokens;
}

export const themePresets: Record<ThemeMode, ThemeDefinition> = {
  graphite: {
    label: "Graphite",
    description: "Solid dark gray with cool neutrals and bright accent contrast.",
    tokens: {
      text: "#f3f4f6",
      accent: "#ff6b57",
      secondary: "#9ca3af",
      error: "#f87171",
      info: "#38bdf8",
      background: "#1f1f22",
      onBackground: "#f3f4f6",
      surface: "#2a2b30",
      surfaceAlt: "#34353b",
      textMuted: "#b4b8c2",
      border: "rgba(243, 244, 246, 0.12)",
    },
  },
  mist: {
    label: "Mist",
    description: "Solid light gray with slightly darker panels for separation.",
    tokens: {
      text: "#1f2937",
      accent: "#2563eb",
      secondary: "#6b7280",
      error: "#dc2626",
      info: "#0284c7",
      background: "#e5e7eb",
      onBackground: "#111827",
      surface: "#f3f4f6",
      surfaceAlt: "#d1d5db",
      textMuted: "#4b5563",
      border: "rgba(17, 24, 39, 0.12)",
    },
  },
  oled: {
    label: "OLED Black",
    description: "Pure black surfaces with a vivid purple accents",
    tokens: {
      text: "#f5f3ff",
      accent: "#a855f7",
      secondary: "#c084fc",
      error: "#f87171",
      info: "#c084fc",
      background: "#000000",
      onBackground: "#f5f3ff",
      surface: "#050505",
      surfaceAlt: "#111111",
      textMuted: "#b7b0c8",
      border: "rgba(245, 243, 255, 0.1)",
    },
  },
  aurora: {
    label: "Aurora",
    description: "Jade dark panels with vibrant coral-red accents",
    tokens: {
      text: "#e8fff8",
      accent: "#ff5370",
      secondary: "#17c79a",
      error: "#ff5252",
      info: "#64b5f6",
      background: "#0a1915",
      onBackground: "#e8fff8",
      surface: "#102520",
      surfaceAlt: "#1a3831",
      textMuted: "#7ca89b",
      border: "rgba(23, 199, 154, 0.2)",
    },
  },
  nordic: {
    label: "Nordic Frost",
    description: "Arctic blues and slate panels accents",
    tokens: {
      text: "#eceff4",
      accent: "#88c0d0",
      secondary: "#81a1c1",
      error: "#bf616a",
      info: "#5e81ac",
      background: "#2e3440",
      onBackground: "#eceff4",
      surface: "#3b4252",
      surfaceAlt: "#434c5e",
      textMuted: "#d8dee9",
      border: "rgba(216, 222, 233, 0.15)",
    },
  },
  synthwave: {
    label: "Coffee",
    description: "Coffee theme with warm orange accents.",
    tokens: {
      text: "#fff1e6",
      accent: "#a5641a",
      secondary: "#b74609",
      error: "#f94144",
      info: "#ff5f43",
      background: "#1f0800",
      onBackground: "#fff1e6",
      surface: "#2c140b",
      surfaceAlt: "#3e1d11",
      textMuted: "#e09a50",
      border: "rgba(247, 37, 133, 0.25)",
    },
  },
  solarizedLight: {
    label: "Solarized",
    description: "Warm background with teal and terracotta accents.",
    tokens: {
      text: "#2e3440",
      accent: "#d97706",
      secondary: "#2563eb",
      error: "#dc2626",
      info: "#0284c7",
      background: "#fbf7ee",
      onBackground: "#2e3440",
      surface: "#f3ede0",
      surfaceAlt: "#e7dfcd",
      textMuted: "#6b7280",
      border: "rgba(46, 52, 64, 0.12)",
    },
  },
};