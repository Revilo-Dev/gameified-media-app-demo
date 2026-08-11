import type { ProfileCardOption } from "@/types/models";

export const PROFILE_CARD_OPTIONS: ProfileCardOption[] = [
  { id: "card-default", name: "Default", price: 0, rarity: "common", description: "Uses the active site background and accent colors.", background: "linear-gradient(135deg, var(--background) 0%, var(--surface) 72%, color-mix(in srgb, var(--surface) 82%, var(--accent) 18%) 100%)", accent: "var(--accent)", text: "var(--text)", mutedText: "var(--text-muted)" },
  { id: "card-aurora", name: "Aurora Steel", price: 8000, rarity: "rare", description: "A cool cyan-blue panel with a polished finish.", background: "#122b3a", accent: "#67e8f9", text: "#ecfeff", mutedText: "#a5f3fc" },
  { id: "card-sunset", name: "Sunset Ember", price: 9500, rarity: "epic", description: "A warm coral panel with bold contrast.", background: "#3a1f24", accent: "#fb923c", text: "#fff7ed", mutedText: "#fed7aa" },
  { id: "card-verdant", name: "Verdant Circuit", price: 11000, rarity: "epic", description: "A deep green profile card with a crisp tech feel.", background: "#13281f", accent: "#4ade80", text: "#ecfdf5", mutedText: "#bbf7d0" },
  { id: "card-royal", name: "Royal Nebula", price: 13000, rarity: "legendary", description: "A rich violet card built for standout profiles.", background: "#231735", accent: "#c4b5fd", text: "#faf5ff", mutedText: "#ddd6fe" },
  { id: "card-obsidian", name: "Obsidian Pulse", price: 15500, rarity: "legendary", description: "A near-black card with electric blue clarity.", background: "#0e1520", accent: "#60a5fa", text: "#f8fafc", mutedText: "#bfdbfe" },
  { id: "card-ruby", name: "Ruby Signal", price: 17000, rarity: "epic", description: "A saturated red card with a sharp social feed feel.", background: "#38151c", accent: "#f87171", text: "#fff1f2", mutedText: "#fecdd3" },
  { id: "card-mint", name: "Mint Halo", price: 18000, rarity: "epic", description: "A fresh mint card that stays bright and readable.", background: "#123026", accent: "#5eead4", text: "#f0fdfa", mutedText: "#99f6e4" },
  { id: "card-indigo", name: "Indigo Night", price: 19500, rarity: "legendary", description: "A midnight indigo panel with a cool edge.", background: "#1c2140", accent: "#818cf8", text: "#eef2ff", mutedText: "#c7d2fe" },
  { id: "card-amber", name: "Amber Forge", price: 21000, rarity: "legendary", description: "A deep amber card with clean high-contrast text.", background: "#3a230f", accent: "#fbbf24", text: "#fffbeb", mutedText: "#fde68a" },
  { id: "card-neon", name: "Neon Harbor", price: 22500, rarity: "legendary", description: "A bright electric panel with a crisp futuristic read.", background: "#10263b", accent: "#22d3ee", text: "#ecfeff", mutedText: "#bae6fd", animated: true, effect: "pulse" },
  { id: "card-prism", name: "Prism Flow", price: 24000, rarity: "legendary", description: "A vivid color cycle that keeps the text clear.", background: "#1e1233", accent: "#f472b6", text: "#fdf2f8", mutedText: "#f9a8d4", animated: true, effect: "spin" },
  { id: "card-voltage", name: "Voltage Bloom", price: 25500, rarity: "legendary", description: "A high-energy panel with a steady glow effect.", background: "#141b2e", accent: "#a78bfa", text: "#f8fafc", mutedText: "#d8b4fe", animated: true, effect: "glow" },
  { id: "card-tidal", name: "Tidal Shift", price: 27000, rarity: "legendary", description: "A deep ocean card with a soft pulsing edge.", background: "#10283a", accent: "#38bdf8", text: "#e0f2fe", mutedText: "#7dd3fc", animated: true, effect: "pulse" },
];

export function getProfileCardStyle(cardId: string | null | undefined) {
  return PROFILE_CARD_OPTIONS.find((option) => option.id === cardId) ?? PROFILE_CARD_OPTIONS[0];
}
