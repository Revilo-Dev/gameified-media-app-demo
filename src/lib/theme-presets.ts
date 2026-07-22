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
};
