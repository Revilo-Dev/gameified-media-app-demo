import { create } from "zustand";
import type { ThemeMode, TimelineTab } from "@/types/models";

interface UiState {
  theme: ThemeMode;
  textScale: number;
  timelineTab: TimelineTab;
  setTheme: (theme: ThemeMode) => void;
  setTextScale: (textScale: number) => void;
  setTimelineTab: (tab: TimelineTab) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: "graphite",
  textScale: 1,
  timelineTab: "for-you",
  setTheme: (theme) => set({ theme }),
  setTextScale: (textScale) => set({ textScale }),
  setTimelineTab: (timelineTab) => set({ timelineTab }),
}));
