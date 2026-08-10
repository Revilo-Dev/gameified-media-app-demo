import type { ProfileCardOption } from "@/types/models";

export const PROFILE_CARD_OPTIONS: ProfileCardOption[] = [
  { id: "card-default", name: "Default", price: 0, rarity: "common", description: "Keeps profile surfaces aligned to the active theme.", background: "var(--surface)", accent: "var(--accent)" },
  { id: "card-aurora", name: "Aurora Glass", price: 8000, rarity: "rare", description: "A cool aqua and violet glow for profile previews.", background: "linear-gradient(135deg, rgba(34,211,238,.22), rgba(129,140,248,.18), var(--surface))", accent: "#67e8f9" },
  { id: "card-sunset", name: "Sunset Signal", price: 9500, rarity: "epic", description: "A warm ember card with coral edge lighting.", background: "linear-gradient(135deg, rgba(251,146,60,.24), rgba(244,63,94,.16), var(--surface))", accent: "#fb923c" },
  { id: "card-verdant", name: "Verdant Circuit", price: 11000, rarity: "epic", description: "Luminous green circuitry for profile summaries.", background: "linear-gradient(135deg, rgba(74,222,128,.22), rgba(20,184,166,.14), var(--surface))", accent: "#4ade80" },
  { id: "card-royal", name: "Royal Nebula", price: 13000, rarity: "legendary", description: "A deep violet card with a premium cosmic sheen.", background: "linear-gradient(135deg, rgba(167,139,250,.28), rgba(236,72,153,.14), var(--surface))", accent: "#c4b5fd" },
  { id: "card-obsidian", name: "Obsidian Pulse", price: 15500, rarity: "legendary", description: "Dark glass with sharp electric-blue highlights.", background: "linear-gradient(135deg, rgba(15,23,42,.9), rgba(30,58,138,.28), var(--surface))", accent: "#60a5fa" },
];

export function getProfileCardStyle(cardId: string | null | undefined) {
  return PROFILE_CARD_OPTIONS.find((option) => option.id === cardId) ?? PROFILE_CARD_OPTIONS[0];
}
