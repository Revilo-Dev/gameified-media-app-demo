export interface BannerColorOption {
  id: string;
  name: string;
  value: string;
  price: number;
}

export const bannerColorOptions: BannerColorOption[] = [
  { id: "banner-coral", name: "Coral Dawn", value: "linear-gradient(135deg, #ff6b57 0%, #ffb36b 100%)", price: 0 },
  { id: "banner-sky", name: "Skyline", value: "linear-gradient(135deg, #3254ff 0%, #6fd3ff 100%)", price: 0 },
  { id: "banner-mint", name: "Mint Current", value: "linear-gradient(135deg, #1f9d8b 0%, #8df0c8 100%)", price: 0 },
  { id: "banner-violet", name: "Violet Pulse", value: "linear-gradient(135deg, #6c3bff 0%, #f08bff 100%)", price: 0 },
  { id: "banner-slate", name: "Slate Night", value: "linear-gradient(135deg, #111827 0%, #475569 100%)", price: 0 },
  { id: "banner-ember", name: "Ember", value: "linear-gradient(135deg, #7f1d1d 0%, #fb7185 100%)", price: 900 },
  { id: "banner-ocean", name: "Deep Ocean", value: "linear-gradient(135deg, #082f49 0%, #22d3ee 100%)", price: 950 },
  { id: "banner-forest", name: "Forest Glow", value: "linear-gradient(135deg, #14532d 0%, #a3e635 100%)", price: 1000 },
  { id: "banner-gold", name: "Golden Hour", value: "linear-gradient(135deg, #78350f 0%, #facc15 100%)", price: 1050 },
  { id: "banner-rose", name: "Rose Quartz", value: "linear-gradient(135deg, #831843 0%, #f9a8d4 100%)", price: 1100 },
  { id: "banner-aurora", name: "Aurora", value: "linear-gradient(135deg, #064e3b 0%, #67e8f9 48%, #c4b5fd 100%)", price: 1150 },
  { id: "banner-lava", name: "Lava Flow", value: "linear-gradient(135deg, #450a0a 0%, #ef4444 55%, #f59e0b 100%)", price: 1200 },
  { id: "banner-midnight", name: "Midnight", value: "linear-gradient(135deg, #020617 0%, #312e81 100%)", price: 1250 },
  { id: "banner-citrus", name: "Citrus Pop", value: "linear-gradient(135deg, #365314 0%, #fde047 100%)", price: 1300 },
  { id: "banner-cosmic", name: "Cosmic Dust", value: "linear-gradient(135deg, #1e1b4b 0%, #7e22ce 55%, #ec4899 100%)", price: 1350 },
  { id: "banner-glacier", name: "Glacier", value: "linear-gradient(135deg, #164e63 0%, #bae6fd 100%)", price: 1400 },
  { id: "banner-copper", name: "Copper", value: "linear-gradient(135deg, #431407 0%, #fb923c 100%)", price: 1450 },
  { id: "banner-orchid", name: "Orchid", value: "linear-gradient(135deg, #4a044e 0%, #e879f9 100%)", price: 1500 },
  { id: "banner-arctic", name: "Arctic", value: "linear-gradient(135deg, #0c4a6e 0%, #f0fdfa 100%)", price: 1550 },
  { id: "banner-jade", name: "Jade", value: "linear-gradient(135deg, #064e3b 0%, #2dd4bf 100%)", price: 1600 },
  { id: "banner-sunset", name: "Sunset Drive", value: "linear-gradient(135deg, #9a3412 0%, #fb7185 50%, #fde047 100%)", price: 1650 },
  { id: "banner-storm", name: "Stormfront", value: "linear-gradient(135deg, #1e293b 0%, #64748b 45%, #38bdf8 100%)", price: 1700 },
  { id: "banner-neon", name: "Neon Circuit", value: "linear-gradient(135deg, #172554 0%, #22d3ee 50%, #d946ef 100%)", price: 1750 },
  { id: "banner-wine", name: "Velvet Wine", value: "linear-gradient(135deg, #4c0519 0%, #be123c 55%, #fb7185 100%)", price: 1800 },
  { id: "banner-eclipse", name: "Eclipse", value: "linear-gradient(135deg, #030712 0%, #374151 55%, #a78bfa 100%)", price: 1900 },
];

export const bannerPresets = bannerColorOptions.map((option) => option.value);
export const defaultBannerColorIds = bannerColorOptions.filter((option) => option.price === 0).map((option) => option.id);
