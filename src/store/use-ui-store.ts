import { create } from "zustand";
import type { ThemeMode, TimelineTab } from "@/types/models";

interface UiState {
  theme: ThemeMode;
  accentColor: string;
  timelineTab: TimelineTab;
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (accent: string) => void;
  setTimelineTab: (tab: TimelineTab) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: "dark",
  accentColor: "#ff6b57",
  timelineTab: "for-you",
  setTheme: (theme) => set({ theme }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setTimelineTab: (timelineTab) => set({ timelineTab }),
}));
