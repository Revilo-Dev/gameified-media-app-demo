export type ThemeMode = "graphite" | "mist" | "oled" | "aurora";

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type ReactionType = "like" | "fire" | "insightful" | "funny" | "gg";

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
  bannerURL: string | null;
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
  followerCount: number;
  followingCount: number;
  postCount: number;
  badgeCount: number;
  joinedAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  imageURL: string | null;
  parentPostId: string | null;
  repostedPostId: string | null;
  quotedPostId: string | null;
  reactionCount: number;
  replyCount: number;
  repostCount: number;
  bookmarkCount: number;
  reactionTypeCounts?: Partial<Record<ReactionType, number>>;
  tags: string[];
  visibility: "public" | "followers";
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: "follow" | "reaction" | "reply" | "badge" | "level" | "reward";
  title: string;
  body: string;
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
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface ShopItem {
  id: string;
  name: string;
  category: string;
  rarity: BadgeRarity;
  price: number;
  description: string;
}

export interface TriviaQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answer: string;
}
