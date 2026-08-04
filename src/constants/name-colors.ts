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
    price: 350,
    rarity: "common",
    description: "A warm coral accent that fits the PulseArc palette.",
  },
  {
    id: "mint",
    name: "Mint Pulse",
    color: "#4dd7b0",
    price: 550,
    rarity: "uncommon",
    description: "Fresh neon mint for bright, gamey profiles.",
  },
  {
    id: "gold",
    name: "Gold Rush",
    color: "#f6c453",
    price: 900,
    rarity: "rare",
    description: "A rich gold nameplate for leaderboard energy.",
  },
  {
    id: "nova",
    name: "Nova Pop",
    color: "#8cb8ff",
    price: 1200,
    rarity: "epic",
    description: "Electric blue with a sharper premium feel.",
  },
  {
    id: "flux",
    name: "Flux Drive",
    color: "#ff9a62",
    gradient: "linear-gradient(90deg, #ff9a62, #ffd166, #ff9a62)",
    price: 1400,
    rarity: "rare",
    description: "Animated ember-orange shimmer for names that need motion.",
    animated: true,
  },
  {
    id: "auroraShift",
    name: "Aurora Shift",
    color: "#91f7d0",
    gradient: "linear-gradient(90deg, #91f7d0, #7dd3fc, #c4b5fd, #91f7d0)",
    price: 1800,
    rarity: "epic",
    description: "A cool-spectrum sweep that rolls across your nameplate.",
    animated: true,
  },
  {
    id: "solarFlare",
    name: "Solar Flare",
    color: "#facc15",
    gradient: "linear-gradient(90deg, #facc15, #fb7185, #facc15)",
    price: 2200,
    rarity: "legendary",
    description: "A hot gold-to-rose animation with leaderboard energy.",
    animated: true,
  },
  {
    id: "voidWave",
    name: "Void Wave",
    color: "#a78bfa",
    gradient: "linear-gradient(90deg, #a78bfa, #22d3ee, #a78bfa)",
    price: 2600,
    rarity: "legendary",
    description: "High-contrast pulse for premium profiles and market flexes.",
    animated: true,
  },
  {
    id: "plasmaMint",
    name: "Plasma Mint",
    color: "#5eead4",
    gradient: "linear-gradient(90deg, #5eead4, #86efac, #67e8f9, #5eead4)",
    price: 3000,
    rarity: "legendary",
    description: "Bright mint plasma with a smooth animated loop.",
    animated: true,
  },
  {
    id: "starlightRun",
    name: "Starlight Run",
    color: "#bfdbfe",
    gradient: "linear-gradient(90deg, #bfdbfe, #93c5fd, #c4b5fd, #bfdbfe)",
    price: 3300,
    rarity: "legendary",
    description: "Cold starlight sweep for crisp futuristic names.",
    animated: true,
  },
  {
    id: "emberCircuit",
    name: "Ember Circuit",
    color: "#fdba74",
    gradient: "linear-gradient(90deg, #fdba74, #fb7185, #f97316, #fdba74)",
    price: 3450,
    rarity: "legendary",
    description: "Fast ember ribbon with a hot arcade finish.",
    animated: true,
  },
  {
    id: "toxicPop",
    name: "Toxic Pop",
    color: "#bef264",
    gradient: "linear-gradient(90deg, #bef264, #4ade80, #22d3ee, #bef264)",
    price: 3600,
    rarity: "legendary",
    description: "Acid green pop for louder market flexes.",
    animated: true,
  },
  {
    id: "royalStatic",
    name: "Royal Static",
    color: "#c4b5fd",
    gradient: "linear-gradient(90deg, #c4b5fd, #f0abfc, #818cf8, #c4b5fd)",
    price: 3750,
    rarity: "legendary",
    description: "Lilac static shimmer with stronger premium contrast.",
    animated: true,
  },
  {
    id: "tidalRush",
    name: "Tidal Rush",
    color: "#67e8f9",
    gradient: "linear-gradient(90deg, #67e8f9, #22d3ee, #5eead4, #67e8f9)",
    price: 3900,
    rarity: "legendary",
    description: "Fast cool-spectrum wave that keeps motion readable.",
    animated: true,
  },
  { id: "ionStorm", name: "Ion Storm", color: "#a5f3fc", gradient: "linear-gradient(90deg, #a5f3fc, #818cf8, #f0abfc, #a5f3fc)", price: 4200, rarity: "legendary", description: "Charged ice-blue and violet current with a fast animated sweep.", animated: true },
  { id: "copperGlow", name: "Copper Glow", color: "#fdba74", gradient: "linear-gradient(90deg, #fdba74, #fb7185, #fef3c7, #fdba74)", price: 4350, rarity: "legendary", description: "Polished copper shimmer with a warm, high-contrast finish.", animated: true },
];

export function getNameColorValue(equippedNameColorId: string | null | undefined) {
  return NAME_COLOR_OPTIONS.find((option) => option.id === equippedNameColorId)?.color ?? "var(--text)";
}

export function getNameColorStyle(equippedNameColorId: string | null | undefined) {
  const option = NAME_COLOR_OPTIONS.find((item) => item.id === equippedNameColorId);
  if (!option?.animated || !option.gradient) {
    return { color: option?.color ?? "var(--text)" };
  }

  return {
    color: "transparent",
    backgroundImage: option.gradient,
    backgroundSize: "200% 200%",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    animation: "nameplate-gradient-shift 5s linear infinite",
  };
}
