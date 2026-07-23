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
    description: "Pure black surfaces with a vivid purple accent for high-contrast night sessions.",
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
    description: "Jade-led panels with crisp red highlights for a more energetic control-room look.",
    tokens: {
      text: "#e8fff8",
      accent: "#17c79a",
      secondary: "#7dd3c7",
      error: "#ef4444",
      info: "#17c79a",
      background: "#081411",
      onBackground: "#e8fff8",
      surface: "#10211d",
      surfaceAlt: "#17312b",
      textMuted: "#9ac3b6",
      border: "rgba(23, 199, 154, 0.18)",
    },
  },
};
