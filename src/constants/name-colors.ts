import type { NameColorOption } from "@/types/models";

export const NAME_COLOR_OPTIONS: NameColorOption[] = [
  {
    id: "default",
    name: "Default Glow",
    color: "var(--text)",
    price: 0,
    rarity: "common",
    description: "Keeps your display name aligned with the active theme.",
  },
  {
    id: "ember",
    name: "Ember Signal",
    color: "#ff7a59",
    price: 35,
    rarity: "common",
    description: "A warm coral accent that fits the PulseArc palette.",
  },
  {
    id: "mint",
    name: "Mint Pulse",
    color: "#4dd7b0",
    price: 55,
    rarity: "uncommon",
    description: "Fresh neon mint for bright, gamey profiles.",
  },
  {
    id: "gold",
    name: "Gold Rush",
    color: "#f6c453",
    price: 90,
    rarity: "rare",
    description: "A rich gold nameplate for leaderboard energy.",
  },
  {
    id: "nova",
    name: "Nova Pop",
    color: "#8cb8ff",
    price: 120,
    rarity: "epic",
    description: "Electric blue with a sharper premium feel.",
  },
];

export function getNameColorValue(equippedNameColorId: string | null | undefined) {
  return NAME_COLOR_OPTIONS.find((option) => option.id === equippedNameColorId)?.color ?? "var(--text)";
}
