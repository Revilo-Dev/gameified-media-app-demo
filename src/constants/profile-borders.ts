import type { ProfileBorderOption } from "@/types/models";

export const PROFILE_BORDER_OPTIONS: ProfileBorderOption[] = [
  { id: "border-none", name: "None", price: 0, rarity: "common", description: "No profile border.", preview: "transparent" },
  { id: "solid-coral", name: "Coral Ring", price: 320, rarity: "common", description: "Warm coral edge for punchy profile cards.", preview: "#ff6b57" },
  { id: "solid-mint", name: "Mint Ring", price: 360, rarity: "common", description: "Fresh mint border with arcade energy.", preview: "#34d399" },
  { id: "solid-gold", name: "Gold Ring", price: 420, rarity: "uncommon", description: "Bright gold frame for leaderboard regulars.", preview: "#fbbf24" },
  { id: "solid-ocean", name: "Ocean Ring", price: 460, rarity: "uncommon", description: "Cool blue frame with clean contrast.", preview: "#38bdf8" },
  { id: "solid-rose", name: "Rose Ring", price: 500, rarity: "uncommon", description: "Soft rose border for warmer profiles.", preview: "#fb7185" },
  { id: "gradient-sunset", name: "Sunset Sweep", price: 720, rarity: "rare", description: "Amber-to-rose gradient with a warm finish.", preview: "linear-gradient(135deg, #fb923c, #fb7185)" },
  { id: "gradient-aurora", name: "Aurora Sweep", price: 780, rarity: "rare", description: "Mint and aqua blend for luminous headers.", preview: "linear-gradient(135deg, #34d399, #22d3ee)" },
  { id: "gradient-cosmic", name: "Cosmic Fade", price: 840, rarity: "rare", description: "Purple-blue blend with stronger contrast.", preview: "linear-gradient(135deg, #818cf8, #38bdf8)" },
  { id: "gradient-flare", name: "Flare Melt", price: 920, rarity: "epic", description: "Hot coral-orange frame built to stand out.", preview: "linear-gradient(135deg, #f97316, #ef4444)" },
  { id: "gradient-neon", name: "Neon Bloom", price: 980, rarity: "epic", description: "Lime-to-cyan frame with sharper energy.", preview: "linear-gradient(135deg, #a3e635, #22d3ee)" },
  { id: "animated-prism", name: "Prism Loop", price: 1300, rarity: "legendary", description: "Animated rainbow shimmer around the avatar.", preview: "linear-gradient(90deg, #fb7185, #facc15, #4ade80, #38bdf8, #fb7185)", animated: true },
  { id: "animated-plasma", name: "Plasma Ring", price: 1450, rarity: "legendary", description: "Fast neon plasma pulse for premium flexes.", preview: "linear-gradient(90deg, #22d3ee, #818cf8, #f472b6, #22d3ee)", animated: true },
  { id: "animated-ember", name: "Ember Cycle", price: 1550, rarity: "legendary", description: "Molten orange-red animated edge.", preview: "linear-gradient(90deg, #fb923c, #ef4444, #f59e0b, #fb923c)", animated: true },
  { id: "animated-forest", name: "Forest Pulse", price: 1650, rarity: "legendary", description: "Deep green animated sweep with cool highlights.", preview: "linear-gradient(90deg, #22c55e, #14b8a6, #86efac, #22c55e)", animated: true },
  { id: "animated-galaxy", name: "Galaxy Spin", price: 1800, rarity: "legendary", description: "Purple-blue loop for loud profile presentation.", preview: "linear-gradient(90deg, #a78bfa, #60a5fa, #f472b6, #a78bfa)", animated: true },
  { id: "animated-auric", name: "Auric Halo", price: 1950, rarity: "legendary", description: "Gold, ivory, and rose light orbiting the profile edge.", preview: "linear-gradient(90deg, #facc15, #fef3c7, #fb7185, #facc15)", animated: true },
  { id: "animated-tidal", name: "Tidal Current", price: 2100, rarity: "legendary", description: "Aqua and deep-blue current with a clean moving edge.", preview: "linear-gradient(90deg, #67e8f9, #0ea5e9, #6366f1, #67e8f9)", animated: true },
  { id: "animated-aurora-pulse", name: "Aurora Pulse", price: 0, rarity: "legendary", description: "A mint-violet ring that pulses with light.", preview: "linear-gradient(90deg,#86efac,#a78bfa,#67e8f9,#86efac)", animated: true, effect: "pulse" },
  { id: "animated-solar-glow", name: "Solar Glow", price: 0, rarity: "legendary", description: "A bright amber ring with a glowing edge.", preview: "linear-gradient(90deg,#fef08a,#fb923c,#fb7185,#fef08a)", animated: true, effect: "glow" },
  { id: "animated-orbit-spin", name: "Orbit Spin", price: 0, rarity: "legendary", description: "A cyan-violet orbiting profile frame.", preview: "conic-gradient(#22d3ee,#818cf8,#e879f9,#22d3ee)", animated: true, effect: "spin" },
  { id: "animated-rose-pulse", name: "Rose Pulse", price: 0, rarity: "legendary", description: "A soft rose halo with a steady pulse.", preview: "linear-gradient(90deg,#fda4af,#f0abfc,#fb7185,#fda4af)", animated: true, effect: "pulse" },
  { id: "animated-jade-glow", name: "Jade Glow", price: 0, rarity: "legendary", description: "A radiant jade edge with a deep glow.", preview: "linear-gradient(90deg,#86efac,#2dd4bf,#a3e635,#86efac)", animated: true, effect: "glow" },
].map((option, index) => index === 0 ? option : { ...option, price: 1000 + (index - 1) * 500 }) as ProfileBorderOption[];

export function getProfileBorderOption(borderId: string | null | undefined) {
  return PROFILE_BORDER_OPTIONS.find((option) => option.id === borderId) ?? PROFILE_BORDER_OPTIONS[0];
}

export function getProfileBorderStyle(borderId: string | null | undefined) {
  const option = getProfileBorderOption(borderId);

  return {
    background: option.preview,
    backgroundSize: option.animated ? "200% 200%" : undefined,
    animation: !option.animated ? undefined : option.effect === "glow" ? "border-glow 2.4s ease-in-out infinite" : option.effect === "pulse" ? "border-pulse 1.8s ease-in-out infinite" : option.effect === "spin" ? "border-spin 4s linear infinite" : "nameplate-gradient-shift 5s linear infinite",
  };
}

export function getProfileBorderPreviewStyle(borderId: string | null | undefined) {
  const style = getProfileBorderStyle(borderId);
  return { ...style, animation: undefined, transform: undefined, filter: undefined, boxShadow: undefined };
}
