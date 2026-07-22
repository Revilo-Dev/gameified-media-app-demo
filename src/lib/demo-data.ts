import type {
  BadgeDefinition,
  Conversation,
  Message,
  NotificationItem,
  Post,
  ShopItem,
  TriviaQuestion,
  UserProfile,
} from "@/types/models";

export const badges: BadgeDefinition[] = [
  { id: "first-post", name: "First Post", description: "Published your first pulse.", rarity: "common", icon: "Sparkles" },
  { id: "starter", name: "Getting Started", description: "Finished onboarding and polished your profile.", rarity: "uncommon", icon: "Compass" },
  { id: "level-5", name: "Level 5", description: "Reached level five in the network.", rarity: "rare", icon: "Trophy" },
];

export const users: UserProfile[] = [
  {
    uid: "demo-user",
    email: "demo@pulsearc.app",
    displayName: "Nova Vale",
    handle: "novavale",
    photoURL: null,
    bannerURL: null,
    bio: "Designing playful systems for digital communities.",
    website: "https://pulsearc.demo",
    location: "Brisbane",
    interests: ["design", "games", "community"],
    level: 6,
    xp: 820,
    credits: 1640,
    featuredBadgeId: "level-5",
    isPremium: true,
    isModerator: true,
    isVerified: true,
    isPrivate: false,
    onboardingComplete: true,
    theme: "graphite",
    accentColor: "#ff6b57",
    gems: 84,
    followerCount: 382,
    followingCount: 111,
    postCount: 46,
    badgeCount: 12,
    joinedAt: "2026-01-11T10:00:00.000Z",
  },
  {
    uid: "mira",
    email: "mira@example.com",
    displayName: "Mira Rune",
    handle: "mirarune",
    photoURL: null,
    bannerURL: null,
    bio: "Building tiny rituals into apps.",
    website: "",
    location: "Melbourne",
    interests: ["ux", "wellbeing"],
    level: 4,
    xp: 465,
    credits: 890,
    featuredBadgeId: "starter",
    isPremium: false,
    isModerator: false,
    isVerified: false,
    isPrivate: false,
    onboardingComplete: true,
    theme: "mist",
    accentColor: "#1f9d8b",
    gems: 27,
    followerCount: 124,
    followingCount: 79,
    postCount: 18,
    badgeCount: 4,
    joinedAt: "2026-02-16T10:00:00.000Z",
  },
];

export const posts: Post[] = [
  {
    id: "post-1",
    authorId: "demo-user",
    content: "PulseArc daily challenge idea: reward thoughtful replies more than raw volume. Healthier conversations, better signals.",
    imageURL: null,
    parentPostId: null,
    repostedPostId: null,
    quotedPostId: null,
    reactionCount: 42,
    replyCount: 8,
    repostCount: 5,
    bookmarkCount: 14,
    tags: ["product", "community"],
    visibility: "public",
    createdAt: "2026-07-15T07:12:00.000Z",
  },
  {
    id: "post-2",
    authorId: "mira",
    content: "Today's arcade trivia streak is keeping my coffee breaks dangerously competitive.",
    imageURL: null,
    parentPostId: null,
    repostedPostId: null,
    quotedPostId: null,
    reactionCount: 19,
    replyCount: 2,
    repostCount: 1,
    bookmarkCount: 4,
    tags: ["arcade", "streaks"],
    visibility: "public",
    createdAt: "2026-07-15T04:05:00.000Z",
  },
];

export const notifications: NotificationItem[] = [
  { id: "n1", type: "badge", title: "Badge unlocked", body: "You earned Level 5.", createdAt: "2026-07-15T06:55:00.000Z", read: false },
  { id: "n2", type: "reaction", title: "New reactions", body: "Mira and 6 others reacted to your post.", createdAt: "2026-07-15T05:20:00.000Z", read: false },
  { id: "n3", type: "reward", title: "Daily reward", body: "You claimed 25 credits from arcade trivia.", createdAt: "2026-07-14T23:00:00.000Z", read: true },
];

export const conversations: Conversation[] = [
  {
    id: "conv-1",
    participantIds: ["demo-user", "mira"],
    title: "Mira Rune",
    unreadCount: 2,
    lastMessage: "Let's ship the badge animations tonight.",
    updatedAt: "2026-07-15T07:10:00.000Z",
  },
];

export const messages: Message[] = [
  { id: "m1", conversationId: "conv-1", senderId: "mira", body: "Do we keep OLED mode in the demo build?", createdAt: "2026-07-15T07:00:00.000Z" },
  { id: "m2", conversationId: "conv-1", senderId: "demo-user", body: "Yes. It makes the accent color system feel much stronger.", createdAt: "2026-07-15T07:05:00.000Z" },
];

export const shopItems: ShopItem[] = [
  { id: "shop-1", name: "Solar Frame", category: "Avatar Frame", rarity: "rare", price: 340, description: "A warm flare ring for standout profiles." },
  { id: "shop-2", name: "Midnight Grid", category: "Profile Theme", rarity: "epic", price: 520, description: "A sharp editorial theme with subtle grid texture." },
];

export const triviaQuestions: TriviaQuestion[] = [
  {
    id: "q1",
    prompt: "Which reward should never be purchasable in this demo?",
    choices: ["Credits", "Achievement badges", "Themes", "Reaction packs"],
    answer: "Achievement badges",
  },
];
