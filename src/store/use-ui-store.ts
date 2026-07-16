import { create } from "zustand";
import type { ThemeMode, TimelineTab } from "@/types/models";

interface UiState {
  theme: ThemeMode;
  accentColor: string;
  textScale: number;
  timelineTab: TimelineTab;
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (accent: string) => void;
  setTextScale: (textScale: number) => void;
  setTimelineTab: (tab: TimelineTab) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: "dark",
  accentColor: "#8b5cf6",
  textScale: 1,
  timelineTab: "for-you",
  setTheme: (theme) => set({ theme }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setTextScale: (textScale) => set({ textScale }),
  setTimelineTab: (timelineTab) => set({ timelineTab }),
}));
