import type { BadgeDefinition, BadgeProgressEntry, BadgeType, UserProfile } from "@/types/models";
import { Cherry, Flame, Gem, MessageSquareQuote, Reply, ShoppingBag, Sparkles, TrendingDown, TrendingUp, Users, type LucideIcon } from "lucide-react";

export interface BadgeState extends BadgeDefinition {
  progress: number;
  level: number;
  requirement: number;
  owned: boolean;
  unlockedAt?: string;
}

const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  MessageSquareQuote,
  Send: Sparkles,
  Reply,
  Gem,
  TrendingDown,
  TrendingUp,
  ShoppingBag,
  Flame,
  Cherry,
  Users,
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "rate-messages", type: "rate-messages", name: "Message Critic", description: "Rate messages to help shape better conversations.", rarity: "common", icon: "MessageSquareQuote", baseRequirement: 100, requirementStep: 100, rewardXp: 10, rewardGems: 5 },
  { id: "send-messages", type: "send-messages", name: "Conversation Starter", description: "Send messages and keep chats moving.", rarity: "common", icon: "Send", baseRequirement: 100, requirementStep: 100, rewardXp: 10, rewardGems: 5 },
  { id: "reply-messages", type: "reply-messages", name: "Thread Responder", description: "Reply often and keep threads alive.", rarity: "common", icon: "Reply", baseRequirement: 100, requirementStep: 100, rewardXp: 10, rewardGems: 5 },
  { id: "spend-gems", type: "spend-gems", name: "Gem Spender", description: "Invest gems back into the app economy.", rarity: "uncommon", icon: "Gem", baseRequirement: 1000, requirementStep: 1000, rewardXp: 20, rewardGems: 10 },
  { id: "lose-gems", type: "lose-gems", name: "Risk Taker", description: "Take losses in stride and keep going.", rarity: "uncommon", icon: "TrendingDown", baseRequirement: 1000, requirementStep: 1000, rewardXp: 20, rewardGems: 10 },
  { id: "win-gems", type: "win-gems", name: "Lucky Break", description: "Win gems through games and market moves.", rarity: "uncommon", icon: "TrendingUp", baseRequirement: 1000, requirementStep: 1000, rewardXp: 20, rewardGems: 10 },
  { id: "buy-items", type: "buy-items", name: "Collector", description: "Buy items and expand your inventory.", rarity: "rare", icon: "ShoppingBag", baseRequirement: 20, requirementStep: 10, rewardXp: 25, rewardGems: 10 },
  { id: "day-streak", type: "day-streak", name: "Daily Habit", description: "Keep showing up day after day.", rarity: "rare", icon: "Flame", baseRequirement: 7, requirementStep: 7, rewardXp: 25, rewardGems: 10 },
  { id: "tomatoes", type: "tomatoes", name: "Heat Magnet", description: "Take tomatoes and keep your cool.", rarity: "epic", icon: "Cherry", baseRequirement: 10, requirementStep: 10, rewardXp: 30, rewardGems: 15 },
  { id: "followers", type: "followers", name: "Crowd Builder", description: "Grow your audience over time.", rarity: "epic", icon: "Users", baseRequirement: 5, requirementStep: 5, rewardXp: 30, rewardGems: 15 },
];

export function getBadgeDefinition(badgeId: string) {
  return BADGE_DEFINITIONS.find((badge) => badge.id === badgeId) ?? null;
}

export function getBadgeRequirement(badge: BadgeDefinition, level = 1) {
  return badge.baseRequirement + Math.max(0, level - 1) * badge.requirementStep;
}

export function getBadgeProgressEntry(profile: Pick<UserProfile, "badgeProgress" | "ownedBadgeIds">, badgeId: string): BadgeProgressEntry {
  return profile.badgeProgress?.[badgeId] ?? { badgeId, level: 1, progress: 0 };
}

export function getBadgeState(profile: Pick<UserProfile, "badgeProgress" | "ownedBadgeIds">, badgeId: string): BadgeState | null {
  const definition = getBadgeDefinition(badgeId);
  if (!definition) return null;
  const entry = getBadgeProgressEntry(profile, badgeId);
  return {
    ...definition,
    progress: entry.progress,
    level: entry.level,
    requirement: getBadgeRequirement(definition, entry.level),
    owned: Boolean(profile.ownedBadgeIds?.includes(badgeId)),
    unlockedAt: entry.unlockedAt,
  };
}

export function getBadgeStates(profile: Pick<UserProfile, "badgeProgress" | "ownedBadgeIds">) {
  return BADGE_DEFINITIONS.map((badge) => getBadgeState(profile, badge.id)).filter((badge): badge is BadgeState => Boolean(badge));
}

export function getBadgeIcon(iconName: string) {
  return BADGE_ICON_MAP[iconName] ?? Sparkles;
}
