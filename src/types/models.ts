export type ThemeMode =
  | "graphite"
  | "mist"
  | "oled"
  | "aurora"
  | "nordic"
  | "synthwave"
  | "solarizedLight"
  | "midnightRose"
  | "lagoon"
  | "sunsetClub"
  | "citrusPunch"
  | "polarNight"
  | "roseQuartz"
  | "acidWash"
  | "emberDusk"
  | "deepSea"
  | "monochrome"
  | "orchard"
  | "ultraviolet"
  | "copperline"
  | "neonHarbor"
  | "velvetOrbit"
  | "moonlitInk"
  | "jadeCircuit"
  | "apricotGlow";

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type CryptoCoinId = "wutax" | "galaxy" | "arc" | "nebula" | "spark" | "lumen" | "titan";

export type TimelineTab = "for-you" | "following";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  icon: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  handle: string;
  photoURL: string | null;
  photoStoragePath: string | null;
  bannerURL: string | null;
  bannerStoragePath: string | null;
  bannerColor: string | null;
  bio: string;
  website: string;
  location: string;
  interests: string[];
  level: number;
  xp: number;
  credits: number;
  featuredBadgeId: string | null;
  isPremium: boolean;
  isModerator: boolean;
  isVerified: boolean;
  isPrivate: boolean;
  onboardingComplete: boolean;
  theme: ThemeMode;
  accentColor: string;
  gems: number;
  coinHoldings: Record<CryptoCoinId, number>;
  coinInvestmentTotals: Record<CryptoCoinId, number>;
  casinoCoins: number;
  gamblingGains: number;
  gamblingLosses: number;
  ownedNameColorIds: string[];
  ownedThemeIds: ThemeMode[];
  equippedNameColorId: string | null;
  ownedProfileBorderIds: string[];
  equippedProfileBorderId: string | null;
  ownedProfileCardIds?: string[];
  equippedProfileCardId?: string | null;
  ownedBannerColorIds?: string[];
  displayPreferences?: {
    disableProfileBorders: boolean;
    disableNameEffects: boolean;
  };
  followerCount: number;
  followingCount: number;
  postCount: number;
  rottenTomatoCount: number;
  badgeCount: number;
  totalPostViews?: number;
  joinedAt: string;
  lastOnlineAt?: string;
  timeoutUntil?: string | null;
  dailyClaimDate?: string | null;
  dailyClaimAt?: number | null;
  dailyStreak?: number;
  dailyWheelSpinDate?: string | null;
  dailyWheelSpinsUsed?: number;
  notificationPreferences?: Record<"replies" | "mentions" | "follows" | "reactions" | "rewards" | "reports", boolean>;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  isDeleted?: boolean;
  imageURL: string | null;
  imageStoragePath: string | null;
  imageUrls?: string[];
  imageStoragePaths?: string[];
  gifURL: string | null;
  parentPostId: string | null;
  repostedPostId: string | null;
  quotedPostId: string | null;
  replyToPostId?: string | null;
  reactionCount: number;
  replyCount: number;
  repostCount: number;
  bookmarkCount: number;
  viewCount?: number;
  reactionTypeCounts?: Record<string, number>;
  averageRating: number;
  starRatingCount: number;
  rottenTomatoCount: number;
  tags: string[];
  visibility: "public" | "followers";
  createdAt: string;
  poll?: {
    question: string;
    options: string[];
    votes: Record<string, string[]>;
    endsAt: string;
    durationLabel: string;
  } | null;
}

export interface NotificationItem {
  id: string;
  type: "follow" | "reaction" | "reply" | "badge" | "level" | "reward" | "mention" | "report" | "leaderboard";
  title: string;
  body: string;
  actorId?: string | null;
  userId?: string;
  postId?: string | null;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  title: string;
  unreadCount: number;
  lastMessage: string;
  updatedAt: string;
  lastSenderId?: string | null;
  lastReadAtByUser?: Record<string, string>;
}

export interface ActivityHistoryEntry {
  id: string;
  userId: string;
  category: "trade" | "gamble" | "purchase";
  title: string;
  detail: string;
  amount?: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  recipientId?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  category: string;
  rarity: BadgeRarity;
  price: number;
  description: string;
}

export interface NameColorOption {
  id: string;
  name: string;
  color: string;
  price: number;
  rarity: BadgeRarity;
  description: string;
  animated?: boolean;
  gradient?: string;
  effect?: "glow" | "pulse" | "flicker";
}

export interface ProfileBorderOption {
  id: string;
  name: string;
  price: number;
  rarity: BadgeRarity;
  description: string;
  preview: string;
  animated?: boolean;
  effect?: "glow" | "pulse" | "spin";
}

export interface ProfileCardOption {
  id: string;
  name: string;
  price: number;
  rarity: BadgeRarity;
  description: string;
  background: string;
  accent: string;
  text: string;
  mutedText?: string;
  animated?: boolean;
  effect?: "glow" | "pulse" | "spin";
}

export interface TriviaQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answer: string;
}
