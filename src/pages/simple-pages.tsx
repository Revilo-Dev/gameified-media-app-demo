import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Bell, Check, ChevronDown, ChevronUp, CircleDollarSign, Clock3, Crown, Eye, EyeOff, Gem, Globe2, Hammer, ImagePlus, Lock, MapPin, MessageCircle, MoreHorizontal, Orbit, Palette, Search, Send, Sparkles, Star, Trash2, TriangleAlert, Unlock, UserPlus, Users, X, Zap } from "lucide-react";
import { auth } from "@/firebase/config";
import { Card } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { XpProgress } from "@/components/gamification/xp-progress";
import { SlotMachine } from "@/components/gamification/slot-machine";
import { CoinToss } from "@/components/gamification/coin-toss";
import { DiceGame } from "@/components/gamification/dice-game";
import { MinesGame } from "@/components/gamification/mines-game";
import { WheelSpin } from "@/components/gamification/wheel-spin";
import { ReactionTest } from "@/components/gamification/reaction-test";
import { shopItems, users } from "@/lib/demo-data";
import { bannerColorOptions, bannerPresets, defaultBannerColorIds } from "@/lib/banner-presets";
import { logout, signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/firebase/auth";
import { useAuth } from "@/app/auth-provider";
import { addGemsToUser, addXpToUser, ensureUserProfile, executeCoinPurchase, executeCoinSale, getDemoUserByHandle, isHandleAvailable, recordActivity, subscribeToUserLeaderboard, subscribeToUserProfileByHandle, subscribeToUserProfileById, subscribeToUserProfiles, subscribeToXpLeaderboard, updateUserProfile } from "@/firebase/users";
import { changeUserPassword, linkGoogleAccount, updateDisplayName, uploadProfileBanner, uploadProfilePicture } from "@/firebase/auth";
import { subscribeToPosts, subscribeToPostsByAuthor } from "@/firebase/posts";
import { InlineEntities } from "@/components/common/inline-entities";
import { Avatar } from "@/components/common/avatar";
import { setFollowingRelationship, subscribeToFollowerIds, subscribeToFollowCounts, subscribeToFollowRelationship, subscribeToFollowingIds } from "@/firebase/follows";
import { useUiStore } from "@/store/use-ui-store";
import { getNameColorStyle, NAME_COLOR_OPTIONS } from "@/constants/name-colors";
import { PROFILE_BORDER_OPTIONS, getProfileBorderStyle } from "@/constants/profile-borders";
import { PROFILE_CARD_OPTIONS, getProfileCardStyle } from "@/constants/profile-cards";
import { themePresets } from "@/lib/theme-presets";
import { banUserAccount, checkIpBan, recordPostView, registerUserDeviceIp, resetAllCrypto, resetAllGems } from "@/firebase/functions";
import { hasUnreadConversation, markConversationRead, sendDirectMessage, startConversation, subscribeToAllConversations, subscribeToConversationMessages, subscribeToConversations } from "@/firebase/chat";
import { createInitialCryptoMarketState, moderateCryptoMarket, subscribeToCryptoMarket, type CryptoMarketState } from "@/firebase/crypto-market";
import { subscribeToBookmarkedPosts } from "@/firebase/bookmarks";
import { markAllNotificationsRead, markNotificationRead, subscribeToNotifications } from "@/firebase/notifications";
import { TomatoIcon } from "@/components/common/tomato-icon";
import { SectionNav } from "@/components/common/section-nav";
import { UserBadges } from "@/components/common/user-badges";
import { PostCard } from "@/components/posts/post-card";
import { PostComposer } from "@/components/posts/post-composer";
import { formatAmount } from "@/lib/utils";
import { requestBrowserNotificationPermission, sendBrowserAlert } from "@/lib/browser-alerts";
import type { Conversation, CryptoCoinId, Message, NotificationItem, Post, ThemeMode, UserProfile } from "@/types/models";

function getFirebaseErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Unknown Firebase error.";
  }

  const firebaseError = error as { code?: string; message?: string };
  return `${firebaseError.code ?? "unknown-code"}: ${firebaseError.message ?? "Unknown Firebase error."}`;
}

function PageFrame({ title, subtitle, children, titleIcon: TitleIcon }: { title: string; subtitle: string; children?: ReactNode; titleIcon?: typeof Search }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          {TitleIcon ? <TitleIcon size={20} className="text-textMuted" /> : null}
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>
        <p className="mt-1 text-sm text-textMuted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function formatBannerStyle(profile: { bannerURL: string | null; bannerColor: string | null }) {
  if (profile.bannerURL) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(7,10,16,0.06), rgba(7,10,16,0.72)), url(${profile.bannerURL})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  return {
    background: profile.bannerColor ?? bannerPresets[0],
  };
}

function getRepliesLabel(count: number) {
  return `${count} ${count === 1 ? "reply" : "replies"}`;
}

function formatLastOnline(lastOnlineAt?: string) {
  if (!lastOnlineAt) {
    return "Last online unknown";
  }

  const lastSeen = new Date(lastOnlineAt);
  const diffMs = Date.now() - lastSeen.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 2) {
    return "Online now";
  }
  if (diffMinutes < 60) {
    return `Last online ${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Last online ${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `Last online ${diffDays}d ago`;
}

function getTimeoutRemainingLabel(timeoutUntil?: string | null) {
  if (!timeoutUntil) {
    return null;
  }

  if (timeoutUntil === "forever") {
    return "permanently";
  }

  const timeoutDate = new Date(timeoutUntil);
  if (Number.isNaN(timeoutDate.getTime()) || timeoutDate.getTime() <= Date.now()) {
    return null;
  }

  const remainingMs = timeoutDate.getTime() - Date.now();
  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingDays = Math.floor(remainingHours / 24);

  if (remainingDays >= 7) {
    return `${Math.floor(remainingDays / 7)}w remaining`;
  }

  if (remainingDays >= 1) {
    return `${remainingDays}d remaining`;
  }

  if (remainingHours >= 1) {
    return `${remainingHours}h remaining`;
  }

  return `${Math.max(1, Math.floor(remainingMs / 60000))}m remaining`;
}

function getNotificationVisual(type: NotificationItem["type"]) {
  switch (type) {
    case "reply":
      return { icon: MessageCircle, tint: "text-sky-300", chip: "bg-sky-500/15 text-sky-300", label: "Reply" };
    case "reaction":
      return { icon: Star, tint: "text-amber-300", chip: "bg-amber-500/15 text-amber-300", label: "Reaction" };
    case "follow":
      return { icon: UserPlus, tint: "text-emerald-300", chip: "bg-emerald-500/15 text-emerald-300", label: "Follow" };
    case "mention":
      return { icon: Bell, tint: "text-violet-300", chip: "bg-violet-500/15 text-violet-300", label: "Mention" };
    case "report":
      return { icon: TriangleAlert, tint: "text-[color:var(--error)]", chip: "bg-[color:var(--error)]/15 text-[color:var(--error)]", label: "Report" };
    case "level":
    case "reward":
    case "leaderboard":
      return { icon: Sparkles, tint: "text-fuchsia-300", chip: "bg-fuchsia-500/15 text-fuchsia-300", label: "Progress" };
    default:
      return { icon: Bell, tint: "text-textMuted", chip: "bg-surfaceAlt text-textMuted", label: "Alert" };
  }
}

const changelogEntries = [
  {
    version: "V0.9",
    date: "Latest",
    items: [
      "Added browser alerts and tab-title pings for notifications and incoming chat messages.",
      "Reworked Messages so moderator chat inspection is separate from personal conversations.",
      "Added Wheel Spin and Reaction Test, with Arcade games organized into tabs.",
      "Expanded market cosmetics with profile cards, themes, borders, and animated nameplates.",
      "Improved profile loading by deferring post data until its tab is opened.",
    ],
  },
  {
    version: "V0.8",
    date: "August 4, 2026",
    items: [
      "Crypto trading now confirms purchases with an in-card animation, and the market has expanded with Lumen and Titan alongside updated zero-balance migration support.",
      "Five new purchasable themes, two animated nameplates, and two animated profile rings were added to the cosmetic market.",
      "Daily rewards now build a visible streak, Mines joined the arcade, Explore gained batched post loading, and Messages now opens direct chats from mutual-follow avatars.",
    ],
  },
  {
    version: "V0.73",
    date: "August 3, 2026",
    items: [
      "Timeline loading was reworked so posts and replies can persist indefinitely, with the home feed now revealing older content in 50-post batches through a new load-more flow.",
      "Rotten tomato feedback was softened into a quick hit animation instead of a permanent post overlay, while rotten tomato counts now live in the profile stats area rather than the header card.",
      "Profiles gained a dedicated inventory tab that lists owned themes, name colors, and profile borders, making market unlocks visible after purchase.",
      "Mobile and thread interactions were tightened up with a side-sheet hamburger menu, a sticky reply composer on post pages, unclipped post action menus, and cleaner in-post avatar border sizing.",
      "Composer and discovery flows now recognize hashtags more reliably, save them with posts, and offer inline autocomplete for both @mentions and #tags to speed up posting and search.",
    ],
  },
  {
    version: "V0.71",
    date: "August 3, 2026",
    items: [
      "Profiles were expanded with a dedicated stats tab, visible last-online status, cleaner avatar border support, and stronger thread navigation when opening replies.",
      "Leaderboards now include separate tabs for top level, top gems, and top posts, with the posts ranking now derived from real authored post data.",
      "The market was expanded with new themes, animated nameplates, and profile borders, then cleaned up with simpler cards that focus on the preview and buy or equip action.",
      "Crypto and moderation tools were refined with safer coin conversion, profitable-sale XP rewards, moderator value adjusters, and nested global reset controls for gems and crypto.",
    ],
  },
  {
    version: "V0.7",
    date: "August 2, 2026",
    items: [
      "Crypto was rebuilt into a five-coin market with live buy and sell sliders, per-coin holdings, trade-driven price movement, and moderator buff or nerf controls.",
      "The crypto dashboard now uses denser market-style charts, wider history windows, stronger controls, and a cleaner one-column layout that fits the app's visual language better.",
      "Market pricing was rebalanced upward, five animated bonus nameplates were added, and several new premium themes were added for gem purchase.",
      "Theme previews, market cards, and changelog messaging were refreshed to support the broader economy update and make cosmetic progression feel more substantial.",
    ],
  },
  {
    version: "V0.58",
    date: "July 28, 2026",
    items: [
      "Star-rating XP is now awarded only on a user's first rating for a post, so changing a rating no longer grants repeat XP.",
      "Comment threads can now be collapsed and expanded inline, making long nested conversations much easier to scan.",
      "Auto-generated handles are now forced to be unique at account creation, and profile handle edits still check availability before save.",
      "Mobile navigation was redesigned with a cleaner four-tab bottom bar and a new menu panel for arcade, market, notifications, profile, premium, and settings.",
    ],
  },
  {
    version: "V0.56",
    date: "July 28, 2026",
    items: [
      "Post cards were rebuilt onto one shared system so posts and replies now use the same stars, rotten tomatoes, media, polls, and moderation controls.",
      "Thread pages now support replying to replies, nested conversations, and shared delete behavior instead of a separate custom reply surface.",
      "Notifications were upgraded to a live inbox with read states for replies, follows, reports, ratings, rotten tomatoes, and level-up events.",
      "Profile follower counts are now interactive, with follower and following lists that let you open profiles or follow people directly.",
      "Moderators can now remove a post embed without deleting the post, and composer overlays now dismiss correctly during navigation.",
    ],
  },
  {
    version: "V0.5",
    date: "July 27, 2026",
    items: [
      "Profile headers now use a banner-first layout with inline follow or edit actions, bio placement inside the card, leaderboard rank, and gem totals.",
      "Profiles now split activity into Posts and Replies tabs, including reply context showing who each reply was written to.",
      "Profile editing now supports bio, banner image upload for premium users, five banner color presets for non-premium users, privacy mode, and location updates.",
      "Explore now uses search-first iconography to better match discovery behavior.",
      "Post cards and thread layouts were compacted and cleaned up, with richer media support for images, GIFs, polls, and visible reaction icons.",
      "Delete actions now use trash-can iconography across profile and thread surfaces.",
    ],
  },
];

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = loginSchema.extend({
  displayName: z.string().min(2).max(25),
});

const DISPLAY_NAME_MAX_LENGTH = 25;
const HANDLE_MAX_LENGTH = 20;
const BIO_MAX_LENGTH = 180;
const LOCATION_MAX_LENGTH = 60;
const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9 ]+$/;
const HANDLE_PATTERN = /^[a-z0-9_]+$/;
const FREE_THEME_IDS: ThemeMode[] = ["graphite", "mist"];
const EXPLORE_PAGE_SIZE = 50;
const CRYPTO_SALE_XP_CAP = 100;
const THEME_MARKET_PRICES: Record<ThemeMode, number> = {
  graphite: 0,
  mist: 0,
  oled: 1000, aurora: 1500, nordic: 2000, synthwave: 2500, solarizedLight: 3000,
  midnightRose: 3500, lagoon: 4000, sunsetClub: 4500, citrusPunch: 5000, polarNight: 5500,
  roseQuartz: 6000, acidWash: 6500, emberDusk: 7000, deepSea: 7500, monochrome: 8000,
  orchard: 8500, ultraviolet: 9000, copperline: 9500, neonHarbor: 10000, velvetOrbit: 10500,
  moonlitInk: 11000, jadeCircuit: 11500, apricotGlow: 12000,
};

function getOwnedThemeIds(profile: Pick<UserProfile, "ownedThemeIds" | "theme">) {
  return [...new Set([...(profile.ownedThemeIds ?? FREE_THEME_IDS), profile.theme, ...FREE_THEME_IDS])];
}

function formatInventoryRarityLabel(rarity: string) {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

function ReplyCard({
  reply,
  author,
  parentAuthor,
  canDelete,
  onDelete,
}: {
  reply: Post;
  author: (typeof users)[number] | null;
  parentAuthor: (typeof users)[number] | null;
  canDelete: boolean;
  onDelete: () => Promise<void>;
}) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={author?.displayName ?? "Unknown"} src={author?.photoURL ?? null} className="h-10 w-10 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold" style={getNameColorStyle(author?.equippedNameColorId)}>{author?.displayName ?? "Unknown profile"}</p>
            {author ? <span className="rounded-full bg-[color:var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent)]">Lv {author.level}</span> : null}
            {author ? <UserBadges user={author} /> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-textMuted">
            <span>@{author?.handle ?? reply.authorId}</span>
            {parentAuthor ? <span>Replying to @{parentAuthor.handle}</span> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-text">
            <InlineEntities text={reply.content} />
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-textMuted">
        <span>{getRepliesLabel(reply.replyCount)}</span>
        <span>{reply.starRatingCount} ratings</span>
        <span>{reply.repostCount} reposts</span>
        {canDelete ? (
          <Button variant="ghost" className="ml-auto gap-2 px-0 text-red-500" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [queryText, setQueryText] = useState(() => searchParams.get("query") ?? "");
  const [feedSort, setFeedSort] = useState<"recent" | "stars" | "comments">("recent");
  const [visiblePostCount, setVisiblePostCount] = useState(EXPLORE_PAGE_SIZE);
  const [peopleOpen, setPeopleOpen] = useState(true);

  useEffect(() => subscribeToPosts(setPosts), []);
  useEffect(() => subscribeToUserProfiles(setProfiles), []);
  useEffect(() => {
    const nextQuery = searchParams.get("query") ?? "";
    setQueryText(nextQuery);
  }, [searchParams]);

  const normalizedQuery = queryText.trim().toLowerCase();
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const postLookup = useMemo(() => new Map(posts.map((post) => [post.id, post])), [posts]);
  const filteredPosts = useMemo(() => {
    if (!queryTokens.length) {
      return [...posts];
    }

    return posts.filter((post) => {
      const haystack = `${post.content} ${post.tags.map((tag) => `#${tag}`).join(" ")}`.toLowerCase();
      return queryTokens.every((token) => haystack.includes(token));
    });
  }, [posts, queryTokens]);
  const sortedPosts = useMemo(() => {
    const nextPosts = [...filteredPosts];

    if (feedSort === "stars") {
      return nextPosts.sort((left, right) => right.starRatingCount - left.starRatingCount || right.averageRating - left.averageRating);
    }

    if (feedSort === "comments") {
      return nextPosts.sort((left, right) => right.replyCount - left.replyCount || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }

    return nextPosts.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [feedSort, filteredPosts]);
  const pagedPosts = useMemo(() => sortedPosts.slice(0, visiblePostCount), [sortedPosts, visiblePostCount]);
  const canLoadMorePosts = sortedPosts.length > visiblePostCount;
  const filteredProfiles = useMemo(() => {
    if (!queryTokens.length) {
      return profiles.slice(0, 8);
    }

    return profiles.filter((profile) => {
      const haystack = `${profile.displayName} @${profile.handle} ${profile.bio} ${profile.location}`.toLowerCase();
      return queryTokens.every((token) => haystack.includes(token));
    }).slice(0, 8);
  }, [profiles, queryTokens]);
  const replyContextLabels = useMemo(() => {
    return pagedPosts.reduce<Record<string, string | null>>((accumulator, post) => {
      const replyTargetId = post.replyToPostId ?? post.parentPostId;
      if (!replyTargetId) {
        accumulator[post.id] = null;
        return accumulator;
      }

      const replyTarget = postLookup.get(replyTargetId);
      const replyAuthor = profiles.find((profile) => profile.uid === replyTarget?.authorId);
      accumulator[post.id] = replyAuthor ? `@${replyAuthor.handle}` : null;
      return accumulator;
    }, {});
  }, [pagedPosts, postLookup, profiles]);
  const trendingTags = useMemo(() => {
    const counts = posts.reduce<Record<string, number>>((accumulator, post) => {
      post.tags.forEach((tag) => {
        const normalizedTag = `#${tag.toLowerCase()}`;
        accumulator[normalizedTag] = (accumulator[normalizedTag] ?? 0) + 1;
      });
      return accumulator;
    }, {});

    return Object.entries(counts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
  }, [posts]);

  function appendSearchToken(token: string) {
    setQueryText((current) => {
      const normalizedToken = token.toLowerCase();
      const existingTokens = current.trim().split(/\s+/).filter(Boolean);
      if (existingTokens.map((item) => item.toLowerCase()).includes(normalizedToken)) {
        return current;
      }
      return [...existingTokens, token].join(" ").trim();
    });
  }

  useEffect(() => {
    const normalized = queryText.trim();
    const currentQuery = searchParams.get("query") ?? "";
    if (currentQuery === normalized) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    if (normalized) {
      nextParams.set("query", normalized);
    } else {
      nextParams.delete("query");
    }
    setSearchParams(nextParams, { replace: true });
  }, [queryText, searchParams, setSearchParams]);

  useEffect(() => {
    setVisiblePostCount(EXPLORE_PAGE_SIZE);
  }, [feedSort, normalizedQuery]);

  return (
    <PageFrame title="Explore" subtitle="Search users, posts, hashtags, and replies from one discovery surface." titleIcon={Search}>
      <Card className="space-y-4 p-5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="Search users, posts, #hashtags, or @handles"
            className="w-full rounded-[1.5rem] border border-border bg-surface px-11 py-3 text-sm outline-none focus:border-[color:var(--accent)]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {trendingTags.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              className="rounded-full border border-border bg-surfaceAlt px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)]"
              onClick={() => appendSearchToken(tag)}
            >
              {tag} · {count}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "recent", label: "Recent" },
            { id: "stars", label: "Most stars" },
            { id: "comments", label: "Most comments" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFeedSort(option.id as typeof feedSort)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${feedSort === option.id ? "bg-accent text-white" : "border border-border bg-surface text-textMuted"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setPeopleOpen((value) => !value)}>
          <div>
            <p className="font-semibold">People</p>
            <p className="text-sm text-textMuted">Open a profile directly from search results.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-textMuted">{filteredProfiles.length} result{filteredProfiles.length === 1 ? "" : "s"}{peopleOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
        </button>
        {peopleOpen && filteredProfiles.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredProfiles.map((profile) => (
              <button
                key={profile.uid}
                type="button"
                className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 text-left transition hover:border-[color:var(--accent)] hover:bg-surfaceAlt/40"
                onClick={() => navigate(`/profile/${profile.handle}`)}
              >
                <Avatar name={profile.displayName} src={profile.photoURL} className="h-12 w-12 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold" style={getNameColorStyle(profile.equippedNameColorId)}>{profile.displayName}</p>
                  <p className="text-sm text-textMuted">@{profile.handle}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-textMuted">{profile.bio || "No bio yet."}</p>
                </div>
              </button>
            ))}
          </div>
        ) : peopleOpen ? (
          <div className="rounded-3xl border border-dashed border-border p-5 text-sm text-textMuted">No users matched that search yet.</div>
        ) : null}
      </Card>

      <div className="space-y-4">
        {pagedPosts.length ? pagedPosts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            replyContextLabel={replyContextLabels[post.id]}
            priority={index < 3 ? "high" : "normal"}
          />
        )) : (
          <Card className="p-6 text-sm text-textMuted">No posts matched that search yet.</Card>
        )}
        {canLoadMorePosts ? (
          <Card className="p-4">
            <button
              type="button"
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              onClick={() => setVisiblePostCount((current) => current + EXPLORE_PAGE_SIZE)}
            >
              Load more posts
            </button>
          </Card>
        ) : null}
      </div>
    </PageFrame>
  );
}

export function ProfilePage() {
  const { user: authUser } = useAuth();
  const { handle } = useParams();
  const currentUserHandle = auth.currentUser?.email?.split("@")[0] ?? "";
  const currentUserId = auth.currentUser?.uid ?? "";
  const [user, setUser] = useState(() => (handle ? users.find((profile) => profile.handle === handle) ?? null : null));
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const isOwnProfile = Boolean(user && (handle === currentUserHandle || user.uid === currentUserId));
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: user?.followerCount ?? 0, following: user?.followingCount ?? 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsViewer, setFollowsViewer] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [allUserPosts, setAllUserPosts] = useState<Post[]>([]);
  const [profileTab, setProfileTab] = useState<"posts" | "replies" | "stats" | "inventory">("stats");
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [followModalTab, setFollowModalTab] = useState<"followers" | "following" | null>(null);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followProfiles, setFollowProfiles] = useState<Record<string, UserProfile | null>>({});
  const [market, setMarket] = useState<CryptoMarketState>(() => createInitialCryptoMarketState());
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [editingModeratorValue, setEditingModeratorValue] = useState<"level" | "gems" | null>(null);
  const [moderatorValue, setModeratorValue] = useState("");
  const [isSavingModeratorValue, setIsSavingModeratorValue] = useState(false);
  const [isEditingCoinHoldings, setIsEditingCoinHoldings] = useState(false);
  const [coinHoldingValues, setCoinHoldingValues] = useState<Partial<Record<CryptoCoinId, string>>>({});
  const [isSavingStats, setIsSavingStats] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authUser) {
      setCurrentUserProfile(null);
      return;
    }

    return subscribeToUserProfileById(authUser.uid, setCurrentUserProfile);
  }, [authUser]);

  useEffect(() => {
    if (!handle) {
      return;
    }

    const demoProfile = getDemoUserByHandle(handle);
    setUser(demoProfile ?? null);
    if (demoProfile) {
      setFollowCounts({ followers: demoProfile.followerCount, following: demoProfile.followingCount });
    }

    const unsubscribeProfile = subscribeToUserProfileByHandle(handle, (profile) => {
      setUser(profile ?? demoProfile ?? null);
      if (profile) {
        setFollowCounts({ followers: profile.followerCount, following: profile.followingCount });
      }
    });

    return unsubscribeProfile;
  }, [handle]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFollowCounts({ followers: user.followerCount, following: user.followingCount });

    if (!currentUserId || user.uid === currentUserId) {
      setIsFollowing(false);
      setFollowsViewer(false);
      return;
    }

    const unsubscribeCounts = subscribeToFollowCounts(user.uid, setFollowCounts);
    const unsubscribeRelationship = subscribeToFollowRelationship(currentUserId, user.uid, setIsFollowing);
    const unsubscribeReverse = subscribeToFollowRelationship(user.uid, currentUserId, setFollowsViewer);

    return () => {
      unsubscribeCounts();
      unsubscribeRelationship();
      unsubscribeReverse();
    };
  }, [currentUserId, user?.followingCount, user?.followerCount, user?.uid]);

  useEffect(() => {
    if (!user?.uid || (profileTab !== "posts" && profileTab !== "replies")) {
      setAllUserPosts([]);
      return;
    }

    return subscribeToPostsByAuthor(user.uid, setAllUserPosts);
  }, [profileTab, user?.uid]);

  useEffect(() => {
    if (!user?.uid || profileTab !== "stats") {
      setLeaderboardRank(null);
      return;
    }

    return subscribeToXpLeaderboard((leaders) => {
      const rank = leaders.findIndex((leader) => leader.uid === user.uid);
      setLeaderboardRank(rank >= 0 ? rank + 1 : null);
    });
  }, [profileTab, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !followModalTab) {
      if (!followModalTab) {
        setFollowerIds([]);
        setFollowingIds([]);
      }
      return;
    }

    const unsubscribeFollowers = subscribeToFollowerIds(user.uid, setFollowerIds);
    const unsubscribeFollowing = subscribeToFollowingIds(user.uid, setFollowingIds);

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
    };
  }, [followModalTab, user?.uid]);

  const userPosts = useMemo(() => allUserPosts.filter((post) => !post.parentPostId), [allUserPosts]);
  const userReplies = useMemo(() => allUserPosts.filter((post) => Boolean(post.parentPostId)), [allUserPosts]);
  const ownedThemeItems = useMemo(
    () => (user ? getOwnedThemeIds(user).map((themeId) => ({ id: themeId, ...themePresets[themeId], price: THEME_MARKET_PRICES[themeId] ?? 0 })) : []),
    [user],
  );
  const ownedNameColorItems = useMemo(
    () => ((user?.ownedNameColorIds ?? ["default"]))
      .map((colorId) => NAME_COLOR_OPTIONS.find((option) => option.id === colorId))
      .filter((option): option is (typeof NAME_COLOR_OPTIONS)[number] => Boolean(option)),
    [user],
  );
  const ownedProfileBorderItems = useMemo(
    () => ((user?.ownedProfileBorderIds ?? ["border-none"]))
      .map((borderId) => PROFILE_BORDER_OPTIONS.find((option) => option.id === borderId))
      .filter((option): option is (typeof PROFILE_BORDER_OPTIONS)[number] => Boolean(option)),
    [user],
  );
  const isMutual = isFollowing && followsViewer;
  const canViewPosts = !user?.isPrivate || isOwnProfile || isMutual;

  const visibleFollowIds = useMemo(
    () => (followModalTab === "followers" ? followerIds : followModalTab === "following" ? followingIds : []),
    [followModalTab, followerIds, followingIds],
  );

  useEffect(() => {
    if (!visibleFollowIds.length) {
      return;
    }

    const unsubscribers = visibleFollowIds.map((profileId) =>
      subscribeToUserProfileById(profileId, (profile) => {
        setFollowProfiles((current) => ({
          ...current,
          [profileId]: profile ?? users.find((candidate) => candidate.uid === profileId) ?? null,
        }));
      }),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [visibleFollowIds]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isProfileMenuOpen]);

  const visibleFollowProfiles = useMemo(
    () => visibleFollowIds.map((profileId) => followProfiles[profileId]).filter((profile): profile is UserProfile => Boolean(profile)),
    [followProfiles, visibleFollowIds],
  );
  const timeoutLabel = getTimeoutRemainingLabel(user?.timeoutUntil);
  const canModerateInventory = Boolean(currentUserProfile?.isModerator);
  const canEditModeratorValues = Boolean(currentUserProfile?.isModerator);

  function beginModeratorValueEdit(field: "level" | "gems") {
    if (!user || !canEditModeratorValues) {
      return;
    }

    setEditingModeratorValue(field);
    setModeratorValue(field === "level" ? String(user.level) : String(user.gems));
  }

  async function saveModeratorValue(field: "level" | "gems") {
    if (!user) {
      return;
    }

    const parsedValue = Number(moderatorValue);
    const value = field === "level" ? Math.floor(parsedValue) : Number(parsedValue.toFixed(2));
    const minimum = field === "level" ? 1 : 0;

    if (!Number.isFinite(value) || value < minimum) {
      toast.error(field === "level" ? "Level must be a whole number of at least 1." : "Gems must be a non-negative number.");
      return;
    }

    setIsSavingModeratorValue(true);
    try {
      await updateUserProfile(user.uid, field === "level" ? { level: value, xp: 0 } : { gems: value });
      setEditingModeratorValue(null);
      toast.success(`${field === "level" ? "Level" : "Gems"} updated`);
    } catch (error) {
      console.error(`Failed to update ${field}`, error);
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setIsSavingModeratorValue(false);
    }
  }

  function beginCoinHoldingEdit() {
    if (!user || !canEditModeratorValues) return;
    setCoinHoldingValues(Object.fromEntries(CRYPTO_COINS.map((coin) => [coin.id, String(user.coinHoldings?.[coin.id] ?? 0)])) as Record<CryptoCoinId, string>);
    setIsEditingCoinHoldings(true);
  }

  async function saveCoinHoldings() {
    if (!user) return;
    const nextHoldings = {} as Record<CryptoCoinId, number>;
    for (const coin of CRYPTO_COINS) {
      const value = Number(coinHoldingValues[coin.id] ?? 0);
      if (!Number.isFinite(value) || value < 0) {
        toast.error("Coin holdings must be non-negative numbers.");
        return;
      }
      nextHoldings[coin.id] = Number(value.toFixed(2));
    }
    setIsSavingStats(true);
    try {
      await updateUserProfile(user.uid, { coinHoldings: nextHoldings });
      setIsEditingCoinHoldings(false);
      toast.success("Coin holdings updated");
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setIsSavingStats(false);
    }
  }

  async function resetUserStats() {
    if (!user || !canEditModeratorValues || !window.confirm(`Reset ${user.displayName}'s profile stats? This cannot be undone.`)) return;
    const emptyHoldings = Object.fromEntries(CRYPTO_COINS.map((coin) => [coin.id, 0])) as Record<CryptoCoinId, number>;
    setIsSavingStats(true);
    try {
      await updateUserProfile(user.uid, { xp: 0, level: 1, gems: 0, casinoCoins: 0, gamblingGains: 0, gamblingLosses: 0, coinHoldings: emptyHoldings, coinInvestmentTotals: emptyHoldings, totalPostViews: 0, rottenTomatoCount: 0 });
      toast.success("Profile stats reset");
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setIsSavingStats(false);
    }
  }

  async function removeOwnedNameColor(colorId: string) {
    if (!canModerateInventory || !user) {
      return;
    }

    const targetUser = user;
    const nextOwnedNameColorIds = (targetUser.ownedNameColorIds ?? ["default"]).filter((ownedColorId) => ownedColorId !== colorId);
    await updateUserProfile(targetUser.uid, {
      ownedNameColorIds: nextOwnedNameColorIds.length ? nextOwnedNameColorIds : ["default"],
      equippedNameColorId: targetUser.equippedNameColorId === colorId ? "default" : targetUser.equippedNameColorId,
    });
    toast.success("Name color removed from inventory");
  }

  async function removeOwnedProfileBorder(borderId: string) {
    if (!canModerateInventory || !user) {
      return;
    }

    const targetUser = user;
    const nextOwnedProfileBorderIds = (targetUser.ownedProfileBorderIds ?? ["border-none"]).filter((ownedBorderId) => ownedBorderId !== borderId);
    await updateUserProfile(targetUser.uid, {
      ownedProfileBorderIds: nextOwnedProfileBorderIds.length ? nextOwnedProfileBorderIds : ["border-none"],
      equippedProfileBorderId: targetUser.equippedProfileBorderId === borderId ? "border-none" : targetUser.equippedProfileBorderId,
    });
    toast.success("Profile border removed from inventory");
  }

  async function removeOwnedTheme(themeId: ThemeMode) {
    if (!canModerateInventory || !user) {
      return;
    }

    const targetUser = user;
    const nextOwnedThemeIds = (targetUser.ownedThemeIds ?? FREE_THEME_IDS).filter((ownedThemeId) => ownedThemeId !== themeId);
    const safeOwnedThemeIds = nextOwnedThemeIds.length ? nextOwnedThemeIds : [...FREE_THEME_IDS];
    await updateUserProfile(targetUser.uid, {
      ownedThemeIds: safeOwnedThemeIds,
      theme: targetUser.theme === themeId ? safeOwnedThemeIds[0] : targetUser.theme,
    });
    toast.success("Theme removed from inventory");
  }

  if (!user) {
    return (
      <PageFrame title="Profile not found" subtitle="This profile is unavailable.">
        <Card className="p-6 text-sm text-textMuted">We could not find a profile for @{handle ?? "unknown"}.</Card>
      </PageFrame>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border border-border p-0" style={{ background: getProfileCardStyle(user.equippedProfileCardId).background }}>
        <div className="h-36 w-full sm:h-44" style={formatBannerStyle(user)} />
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-end gap-4">
              <div className="-mt-16 shrink-0 rounded-[1.75rem] border-4 border-canvas bg-canvas sm:-mt-20">
                <Avatar
                  name={user.displayName}
                  src={user.photoURL}
                  className="h-20 w-20 rounded-3xl sm:h-24 sm:w-24"
                  borderId={!currentUserProfile?.displayPreferences?.disableProfileBorders ? user.equippedProfileBorderId : undefined}
                />
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="min-w-0 text-2xl font-bold" style={currentUserProfile?.displayPreferences?.disableNameEffects ? undefined : getNameColorStyle(user.equippedNameColorId)}>{user.displayName}</p>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <Button
                      variant={isOwnProfile || isFollowing ? "secondary" : "primary"}
                      className="h-9"
                      disabled={isTogglingFollow}
                      onClick={() => {
                        if (isOwnProfile) {
                          setIsEditorOpen(true);
                          return;
                        }
                        if (!currentUserId) {
                          return;
                        }
                        void (async () => {
                          setIsTogglingFollow(true);
                          try {
                            await setFollowingRelationship(currentUserId, user.uid, !isFollowing);
                          } catch (error) {
                            console.error("Failed to toggle follow relationship", error);
                            toast.error("Follow action failed");
                          } finally {
                            setIsTogglingFollow(false);
                          }
                        })();
                      }}
                    >
                      {isOwnProfile ? "Edit profile" : isTogglingFollow ? "Saving..." : isFollowing ? "Following" : "Follow"}
                    </Button>
                    {currentUserId && !isOwnProfile ? (
                      <div ref={profileMenuRef} className="relative">
                        <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setIsProfileMenuOpen((current) => !current)}>
                          <MoreHorizontal size={16} />
                        </Button>
                        {isProfileMenuOpen ? (
                          <div className="absolute right-0 top-11 z-20 w-56 rounded-2xl border border-border bg-canvas p-2 shadow-panel">
                            <div className="px-3 py-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textMuted">Moderation</p>
                            </div>
                            <div className="px-3 pb-2">
                              <ModeratorTimeoutButton targetUserId={user.uid} />
                            </div>
                            <div className="px-3 pb-2">
                              <ModeratorBanButton targetUserId={user.uid} />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-textMuted">
                  <span>@{user.handle}</span>
                  <UserBadges user={user} />
                  {user.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={14} />
                      {user.location}
                    </span>
                  ) : null}
                  {user.isPrivate ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs">
                      <Lock size={12} />
                      Private
                    </span>
                  ) : null}
                  {timeoutLabel ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-500/10 px-2 py-1 text-xs text-red-300">
                      <Clock3 size={12} />
                      Timed out: {timeoutLabel}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs">
                    <Zap size={12} className="text-amber-300" />
                    {user.dailyStreak ?? 0} day streak
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs">
                    <Clock3 size={12} />
                    {user.isPremium && user.isPrivate ? "Last online hidden" : formatLastOnline(user.lastOnlineAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-[18rem]">
              <div className="rounded-2xl border border-border bg-surfaceAlt/50 px-3 py-2">
                <p className="text-xs text-textMuted">Leaderboard</p>
                <p className="mt-1 font-semibold">{leaderboardRank ? `#${leaderboardRank}` : "Unranked"}</p>
              </div>
              {editingModeratorValue === "gems" ? (
                <form className="rounded-2xl border border-[color:var(--accent)] bg-surfaceAlt/50 px-2 py-2" onSubmit={(event) => { event.preventDefault(); void saveModeratorValue("gems"); }}>
                  <label htmlFor="moderator-gems" className="text-xs text-textMuted">Gems</label>
                  <div className="mt-1 flex items-center gap-1">
                    <input id="moderator-gems" autoFocus inputMode="decimal" min="0" step="0.01" value={moderatorValue} onChange={(event) => setModeratorValue(event.target.value)} className="min-w-0 flex-1 bg-transparent font-semibold tabular-nums outline-none" />
                    <button type="submit" disabled={isSavingModeratorValue} className="rounded p-1 text-emerald-400 hover:bg-surface" aria-label="Save gems" title="Save gems"><Check size={15} /></button>
                    <button type="button" disabled={isSavingModeratorValue} className="rounded p-1 text-textMuted hover:bg-surface hover:text-text" aria-label="Cancel gem edit" title="Cancel" onClick={() => setEditingModeratorValue(null)}><X size={15} /></button>
                  </div>
                </form>
              ) : (
                <button type="button" className={`rounded-2xl border border-border bg-surfaceAlt/50 px-3 py-2 text-left ${canEditModeratorValues ? "transition hover:border-[color:var(--accent)]" : "cursor-default"}`} onClick={() => beginModeratorValueEdit("gems")} disabled={!canEditModeratorValues} title={canEditModeratorValues ? "Click to edit gems" : undefined}>
                  <p className="text-xs text-textMuted">Gems</p>
                  <p className="mt-1 font-semibold tabular-nums">{formatAmount(user.gems)}</p>
                </button>
              )}
            </div>
          </div>

          <p className="text-sm leading-6 text-text">{user.bio || "No bio added yet."}</p>

          <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
            <div className="flex flex-wrap gap-3 text-sm">
              <button
                type="button"
                className="rounded-2xl border border-border px-3 py-2 text-left transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => setFollowModalTab("followers")}
              >
                <strong>{followCounts.followers}</strong> Followers
              </button>
              <button
                type="button"
                className="rounded-2xl border border-border px-3 py-2 text-left transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => setFollowModalTab("following")}
              >
                <strong>{followCounts.following}</strong> Following
              </button>
            </div>
            {editingModeratorValue === "level" ? (
              <form className="flex items-center gap-2 rounded-2xl border border-[color:var(--accent)] bg-surfaceAlt/50 px-3 py-2" onSubmit={(event) => { event.preventDefault(); void saveModeratorValue("level"); }}>
                <label htmlFor="moderator-level" className="text-xs text-textMuted">Level</label>
                <input id="moderator-level" autoFocus inputMode="numeric" min="1" step="1" value={moderatorValue} onChange={(event) => setModeratorValue(event.target.value)} className="min-w-0 flex-1 bg-transparent font-semibold tabular-nums outline-none" />
                <button type="submit" disabled={isSavingModeratorValue} className="rounded p-1 text-emerald-400 hover:bg-surface" aria-label="Save level"><Check size={15} /></button>
                <button type="button" disabled={isSavingModeratorValue} className="rounded p-1 text-textMuted hover:bg-surface" aria-label="Cancel level edit" onClick={() => setEditingModeratorValue(null)}><X size={15} /></button>
              </form>
            ) : (
              <button type="button" className={`w-full text-left ${canEditModeratorValues ? "cursor-pointer" : "cursor-default"}`} disabled={!canEditModeratorValues} onClick={() => beginModeratorValueEdit("level")} title={canEditModeratorValues ? "Click the level bar to adjust this user's level" : undefined}>
                <XpProgress xp={user.xp} level={user.level} />
              </button>
            )}
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <SectionNav
          ariaLabel="Profile sections"
          activeId={profileTab}
          onChange={setProfileTab}
          items={[
            { id: "posts", label: `Posts ${userPosts.length}` },
            { id: "replies", label: `Replies ${userReplies.length}` },
            { id: "stats", label: "Profile" },
            { id: "inventory", label: "Inventory" },
          ] as const}
        />
        {!canViewPosts ? (
          <Card className="space-y-2 p-6 text-sm text-textMuted">
            <p className="inline-flex items-center gap-2 font-semibold text-text"><Lock size={16} /> Private profile</p>
            <p>Only mutual follows can view this user&apos;s posts and replies.</p>
          </Card>
        ) : profileTab === "stats" ? (
          <Card className="space-y-4 p-5">
            {canEditModeratorValues ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--accent)]/35 bg-[color:var(--accent)]/5 px-4 py-3"><p className="text-sm font-semibold">Admin stat controls</p><Button type="button" variant="ghost" size="sm" disabled={isSavingStats} className="border border-red-400/40 text-red-400 hover:text-red-300" onClick={() => void resetUserStats()}>Reset stats</Button></div> : null}
            <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Gems</p>
              <p className="mt-2 text-xl font-semibold tabular-nums">{formatAmount(user.gems)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Rotten tomatoes taken</p>
              <p className="mt-2 inline-flex items-center gap-2 text-xl font-semibold tabular-nums text-rose-300"><TomatoIcon className="h-5 w-5" /> {user.rottenTomatoCount ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Illiquid value</p>
              <p className="mt-2 text-xl font-semibold tabular-nums">{CRYPTO_COINS.reduce((sum, coin) => sum + ((user.coinHoldings?.[coin.id] ?? 0) * market.coins[coin.id].currentValue), 0).toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Total net value</p>
              <p className="mt-2 text-xl font-semibold tabular-nums">{(user.gems + CRYPTO_COINS.reduce((sum, coin) => sum + ((user.coinHoldings?.[coin.id] ?? 0) * market.coins[coin.id].currentValue), 0)).toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Gambling gains</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-emerald-300">+{formatAmount(user.gamblingGains ?? 0)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Gambling losses</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-rose-300">-{formatAmount(user.gamblingLosses ?? 0)}</p>
            </div>
            </div>
            <div className="rounded-2xl border border-border bg-surfaceAlt/35 p-4">
              <div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[0.16em] text-textMuted">Owned coins</p>{canEditModeratorValues ? <Button type="button" variant="secondary" size="sm" disabled={isSavingStats} onClick={() => isEditingCoinHoldings ? void saveCoinHoldings() : beginCoinHoldingEdit()}>{isEditingCoinHoldings ? "Save holdings" : "Edit holdings"}</Button> : null}</div>
              {isEditingCoinHoldings ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{CRYPTO_COINS.map((coin) => <label key={coin.id} className="rounded-xl border border-border bg-surface px-3 py-2 text-xs"><span className="font-semibold" style={{ color: coin.accent }}>{coin.name}</span><input inputMode="decimal" value={coinHoldingValues[coin.id] ?? "0"} onChange={(event) => setCoinHoldingValues((current) => ({ ...current, [coin.id]: event.target.value }))} className="mt-1 w-full bg-transparent text-sm font-semibold outline-none" /></label>)}<Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => setIsEditingCoinHoldings(false)}>Cancel</Button></div> : null}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {CRYPTO_COINS.filter((coin) => (user.coinHoldings?.[coin.id] ?? 0) > 0).length ? CRYPTO_COINS.filter((coin) => (user.coinHoldings?.[coin.id] ?? 0) > 0).map((coin) => (
                  <div key={coin.id} className="rounded-[1.4rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-semibold" style={{ color: coin.accent }}>{coin.name}</span>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-textMuted">{coin.shortLabel}</p>
                      </div>
                      <span className="rounded-full border border-border bg-surfaceAlt/50 px-2.5 py-1 text-xs font-semibold tabular-nums">{formatAmount(user.coinHoldings?.[coin.id] ?? 0)} coins</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-border bg-surface px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-textMuted">Spot</p>
                        <p className="mt-1 text-sm font-semibold tabular-nums">{formatAmount(market.coins[coin.id].currentValue)}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-surface px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-textMuted">Value</p>
                        <p className="mt-1 text-sm font-semibold tabular-nums">{formatAmount((user.coinHoldings?.[coin.id] ?? 0) * market.coins[coin.id].currentValue)}</p>
                      </div>
                    </div>
                  </div>
                )) : <p className="text-sm text-textMuted">No coins owned yet.</p>}
              </div>
            </div>
          </Card>
        ) : profileTab === "inventory" ? (
          <div className="space-y-4">
            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Name Colors</p>
                  <p className="mt-1 text-sm text-textMuted">{ownedNameColorItems.length} owned</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {ownedNameColorItems.map((option) => (
                  <div key={option.id} className="rounded-2xl border border-border bg-surfaceAlt/35 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold" style={getNameColorStyle(option.id)}>{option.name}</p>
                        <p className="mt-1 text-xs text-textMuted">{option.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-border px-2 py-1 text-[11px] font-semibold text-textMuted">{formatInventoryRarityLabel(option.rarity)}</span>
                        {canModerateInventory && option.id !== "default" ? (
                          <Button type="button" variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => void removeOwnedNameColor(option.id)}>
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-4 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Profile Borders</p>
                <p className="mt-1 text-sm text-textMuted">{ownedProfileBorderItems.length} owned</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {ownedProfileBorderItems.map((option) => (
                  <div key={option.id} className="rounded-2xl border border-border bg-surfaceAlt/35 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{option.name}</p>
                        <p className="mt-1 text-xs text-textMuted">{option.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 shrink-0 rounded-2xl p-[3px]" style={getProfileBorderStyle(option.id)}>
                          <div className="h-full w-full rounded-[13px] bg-canvas" />
                        </div>
                        {canModerateInventory && option.id !== "border-none" ? (
                          <Button type="button" variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => void removeOwnedProfileBorder(option.id)}>
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-4 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Themes</p>
                <p className="mt-1 text-sm text-textMuted">{ownedThemeItems.length} owned</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {ownedThemeItems.map((theme) => (
                  <div key={theme.id} className="rounded-2xl border border-border bg-surfaceAlt/35 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{theme.label}</p>
                        <p className="mt-1 text-xs text-textMuted">{theme.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-border px-2 py-1 text-[11px] font-semibold text-textMuted">
                          {theme.price > 0 ? `${theme.price} gems` : "Starter"}
                        </span>
                        {canModerateInventory && theme.price > 0 ? (
                          <Button type="button" variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => void removeOwnedTheme(theme.id as ThemeMode)}>
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <span className="h-6 rounded-full border border-border" style={{ background: theme.tokens.background }} />
                      <span className="h-6 rounded-full border border-border" style={{ background: theme.tokens.surface }} />
                      <span className="h-6 rounded-full border border-border" style={{ background: theme.tokens.surfaceAlt }} />
                      <span className="h-6 rounded-full border border-border" style={{ background: theme.tokens.accent }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : profileTab === "posts" ? (
          userPosts.length ? userPosts.map((post) => <PostCard key={post.id} post={post} />) : (
            <Card className="p-6 text-sm text-textMuted">No posts yet.</Card>
          )
        ) : userReplies.length ? (
          <div className="space-y-3">
            {userReplies.map((reply) => (
              <PostCard
                key={reply.id}
                post={reply}
                replyContextLabel={null}
              />
            ))}
          </div>
        ) : (
          <Card className="p-6 text-sm text-textMuted">No replies yet.</Card>
        )}
      </section>

      {isOwnProfile ? <EditProfileModal open={isEditorOpen} onClose={() => setIsEditorOpen(false)} profile={user} /> : null}
      <FollowListModal
        open={Boolean(followModalTab)}
        title={followModalTab === "followers" ? "Followers" : "Following"}
        currentUserId={currentUserId}
        profileUserId={user.uid}
        users={visibleFollowProfiles}
        onClose={() => setFollowModalTab(null)}
      />
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, textScale, setTheme, setTextScale } = useUiStore();
  const availableThemes = Object.entries(themePresets);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  const ownedThemeIds = profile ? getOwnedThemeIds(profile) : FREE_THEME_IDS;
  const ownedNameColors = (profile?.ownedNameColorIds ?? ["default"])
    .map((colorId) => NAME_COLOR_OPTIONS.find((item) => item.id === colorId))
    .filter((option): option is (typeof NAME_COLOR_OPTIONS)[number] => Boolean(option));
  const notificationPreferences = profile?.notificationPreferences ?? { replies: true, mentions: true, follows: true, reactions: true, rewards: true, reports: true };
  const displayPreferences = profile?.displayPreferences ?? { disableProfileBorders: false, disableNameEffects: false };

  return (
    <PageFrame title="Settings" subtitle="Appearance, account controls, and release notes live here.">
      <div className="space-y-5">
        <details open className="rounded-2xl border border-border bg-surface p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2"><div className="flex items-center gap-2">
            <Palette size={18} />
            <h2 className="text-lg font-semibold">Appearance</h2>
          </div><ChevronDown size={18} /></summary>
          <div className="mt-4 grid gap-3">
            {availableThemes.map(([themeKey, definition]) => {
              const isActive = theme === themeKey;
              const isOwned = ownedThemeIds.includes(themeKey as ThemeMode);

              return (
                <details
                  key={themeKey}
                  open={isActive}
                  className="rounded-2xl border border-border bg-surfaceAlt/40 p-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{definition.label}</p>
                      <p className="text-sm text-textMuted">{definition.description}</p>
                    </div>
                    <Button
                      type="button"
                      variant={isActive ? "primary" : "secondary"}
                      disabled={!isOwned}
                      onClick={(event) => {
                        event.preventDefault();
                        if (!isOwned) {
                          return;
                        }
                        setTheme(themeKey as keyof typeof themePresets);
                      }}
                    >
                      {isActive ? "Active theme" : isOwned ? "Use theme" : "Unlock in market"}
                    </Button>
                  </summary>
                </details>
              );
            })}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Name color</p>
              <Link to="/market" className="text-sm font-semibold text-[color:var(--accent)]">More in market</Link>
            </div>
            <select
              value={profile?.equippedNameColorId ?? "default"}
              disabled={!user || !profile}
              onChange={(event) => {
                if (!user || !profile) {
                  return;
                }
                void updateUserProfile(user.uid, { equippedNameColorId: event.target.value });
              }}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none"
            >
              {ownedNameColors.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} · {option.rarity}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Text scale</p>
              <span className="text-sm text-textMuted">{Math.round(textScale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.9"
              max="1.15"
              step="0.05"
              value={textScale}
              onChange={(event) => setTextScale(Number(event.target.value))}
              className="w-full accent-[color:var(--accent)]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Display effects</p>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-surfaceAlt/30 px-3 py-2 text-sm"><input type="checkbox" checked={displayPreferences.disableProfileBorders} disabled={!user || !profile} onChange={(event) => { if (user && profile) void updateUserProfile(user.uid, { displayPreferences: { ...displayPreferences, disableProfileBorders: event.target.checked } }); }} className="h-4 w-4 accent-[color:var(--accent)]" />Disable profile borders</label>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-surfaceAlt/30 px-3 py-2 text-sm"><input type="checkbox" checked={displayPreferences.disableNameEffects} disabled={!user || !profile} onChange={(event) => { if (user && profile) void updateUserProfile(user.uid, { displayPreferences: { ...displayPreferences, disableNameEffects: event.target.checked } }); }} className="h-4 w-4 accent-[color:var(--accent)]" />Disable name effects</label>
          </div>
        </details>

        <details open className="rounded-2xl border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between p-5"><span className="text-lg font-semibold">Account</span><ChevronDown size={18} /></summary>
          <div className="space-y-5 border-t border-border p-5">
            <p className="text-sm text-textMuted">Profile, privacy, and media settings are managed from your profile editor.</p>
            <Link to={profile ? `/profile/${profile.handle}` : "/"} className="inline-flex rounded-full border border-border bg-surfaceAlt px-4 py-2 text-sm font-semibold">Manage profile</Link>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surfaceAlt/30 px-3 py-3"><div><p className="font-semibold">Browser alerts</p><p className="text-sm text-textMuted">Receive native alerts and tab pings for notifications and messages.</p></div><Button type="button" variant="secondary" onClick={() => void requestBrowserNotificationPermission().then((permission) => toast(permission === "granted" ? "Browser alerts enabled" : permission === "unsupported" ? "Browser alerts are unavailable" : "Browser alert permission was not granted"))}>Enable alerts</Button></div>
            <div className="space-y-3"><div><p className="font-semibold">Notifications</p><p className="text-sm text-textMuted">Choose the activity that should reach your inbox.</p></div><div className="grid gap-2 sm:grid-cols-2">{([ ["replies", "Replies"], ["mentions", "Mentions"], ["follows", "New followers"], ["reactions", "Ratings and reactions"], ["rewards", "Rewards and level-ups"], ["reports", "Moderator reports"] ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-xl border border-border bg-surfaceAlt/30 px-3 py-2 text-sm"><input type="checkbox" checked={notificationPreferences[key]} disabled={!user || !profile} onChange={(event) => { if (user && profile) void updateUserProfile(user.uid, { notificationPreferences: { ...notificationPreferences, [key]: event.target.checked } }); }} className="h-4 w-4 accent-[color:var(--accent)]" />{label}</label>)}</div></div>
          </div>
        </details>

        <details open className="rounded-2xl border border-border bg-surface p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between"><h2 className="text-lg font-semibold">Changelog</h2><ChevronDown size={18} /></summary>
          <div className="mt-4 space-y-4">
            {changelogEntries.map((entry) => (
              <div key={entry.version} className="rounded-3xl border border-border bg-surfaceAlt/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-lg font-semibold">{entry.version}</p>
                  <span className="text-sm text-textMuted">{entry.date}</span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-textMuted">
                  {entry.items.map((item) => (
                    <p key={item}>• {item}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </PageFrame>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:px-8">
      <div className="hidden max-w-md space-y-6 lg:block">
        <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white"><Orbit size={22} /></span>
          Nebula Social
        </Link>
        <div className="space-y-3">
          <p className="text-4xl font-bold leading-tight">Welcome to Nebula.</p>
          <p className="max-w-sm text-base leading-7 text-textMuted">A gamified social networking platform.</p>
        </div>
      </div>
      <Card className="w-full space-y-6 rounded-2xl border border-border p-5 shadow-panel sm:p-7">
        <Link to="/" className="inline-flex items-center gap-2 text-base font-bold lg:hidden">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white"><Orbit size={18} /></span>
          Nebula
        </Link>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="text-sm leading-6 text-textMuted">{subtitle}</p>
        </div>
        {children}
      </Card>
    </div>
  );
}

function EditProfileModal({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: (typeof users)[number];
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);
  const [bannerColor, setBannerColor] = useState(profile.bannerColor ?? bannerPresets[0]);
  const [isPrivate, setIsPrivate] = useState(profile.isPrivate);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");

  useEffect(() => {
    if (open) {
      setDisplayName(profile.displayName);
      setHandle(profile.handle);
      setBio(profile.bio);
      setLocation(profile.location);
      setBannerColor(profile.bannerColor ?? bannerPresets[0]);
      setIsPrivate(profile.isPrivate);
    }
  }, [open, profile.bannerColor, profile.bio, profile.displayName, profile.handle, profile.isPrivate, profile.location]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Card className="space-y-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Edit profile</h2>
              <p className="text-sm text-textMuted">Update your profile details, banner, privacy, and account settings from one cleaner editor.</p>
            </div>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-5">
              <Card className="space-y-4 p-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Profile preview</p>
                  <div className="overflow-hidden rounded-[1.75rem] border border-border">
                    <div className="h-28" style={formatBannerStyle({ bannerURL: profile.bannerURL, bannerColor })} />
                    <div className="space-y-3 p-4">
                      <div className="flex items-end gap-3">
                        <div className="-mt-12 rounded-[1.25rem] border-4 border-canvas bg-canvas">
                          <Avatar name={displayName} src={profile.photoURL} className="h-16 w-16 rounded-3xl" />
                        </div>
                        <div>
                          <p className="font-semibold">{displayName || "Display name"}</p>
                          <p className="text-sm text-textMuted">@{handle || profile.handle}</p>
                        </div>
                      </div>
                      <p className="text-sm text-textMuted">{bio || "Your bio will show here."}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Display name</label>
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      maxLength={DISPLAY_NAME_MAX_LENGTH}
                      className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none"
                    />
                    <p className="text-xs text-textMuted">{displayName.length}/{DISPLAY_NAME_MAX_LENGTH}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Handle</label>
                    <input
                      value={handle}
                      onChange={(event) => setHandle(event.target.value.toLowerCase())}
                      maxLength={HANDLE_MAX_LENGTH}
                      disabled={!profile.isPremium}
                      className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none"
                    />
                    <p className="text-xs text-textMuted">{handle.length}/{HANDLE_MAX_LENGTH}</p>
                    {!profile.isPremium ? <p className="text-xs text-textMuted">Premium is required to update your @ handle.</p> : null}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Location</label>
                    <input
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      maxLength={LOCATION_MAX_LENGTH}
                      placeholder="City, country, or remote"
                      className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none"
                    />
                    <p className="text-xs text-textMuted">{location.length}/{LOCATION_MAX_LENGTH}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    rows={4}
                    maxLength={BIO_MAX_LENGTH}
                    placeholder="Tell people what you're about."
                    className="w-full rounded-3xl border border-border bg-transparent px-4 py-3 text-sm outline-none"
                  />
                  <p className="text-xs text-textMuted">{bio.length}/{BIO_MAX_LENGTH}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Profile visibility</p>
                      <p className="text-xs text-textMuted">Private profiles only show posts to mutual follows.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPrivate((current) => !current)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${isPrivate ? "bg-accent text-white" : "border border-border bg-surface text-text"}`}
                    >
                      {isPrivate ? <Lock size={14} /> : <Unlock size={14} />}
                      {isPrivate ? "Private" : "Public"}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ImagePlus size={16} />
                    <p className="text-sm font-semibold">Banner</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {bannerColorOptions.filter((option) => (profile.ownedBannerColorIds ?? defaultBannerColorIds).includes(option.id)).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setBannerColor(option.value)}
                        className={`h-12 w-16 rounded-2xl border transition ${bannerColor === option.value ? "border-accent ring-2 ring-[color:var(--accent)]/30" : "border-border"}`}
                        style={{ background: option.value }}
                        title={option.name}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-textMuted">
                    {profile.isPremium ? "Premium users can keep a color banner or upload a banner image." : "Choose your unlocked banner colors. More colors are available in the market; banner image upload is premium-only."}
                  </p>
                  {profile.isPremium ? (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          return;
                        }

                        try {
                          await uploadProfileBanner(file);
                          toast.success("Banner updated");
                        } catch (error) {
                          console.error("Failed to update banner", error);
                          toast.error(getFirebaseErrorMessage(error));
                        }
                      }}
                      className="w-full rounded-2xl border border-dashed border-border px-4 py-3 text-sm"
                    />
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={isSavingProfile}
                    onClick={async () => {
                      setIsSavingProfile(true);
                      try {
                        const nextDisplayName = displayName.trim();
                        const nextHandle = handle.trim().toLowerCase();
                        const nextBio = bio.trim();
                        const nextLocation = location.trim();

                        if (!nextDisplayName || nextDisplayName.length > DISPLAY_NAME_MAX_LENGTH || !DISPLAY_NAME_PATTERN.test(nextDisplayName)) {
                          throw new Error("Display name may only use letters, numbers, and spaces, and must be 1-25 characters.");
                        }

                        if (!nextHandle || nextHandle.length < 3 || nextHandle.length > HANDLE_MAX_LENGTH || !HANDLE_PATTERN.test(nextHandle)) {
                          throw new Error("Handle must be 3-20 characters using lowercase letters, numbers, and underscores.");
                        }

                        if (nextBio.length > BIO_MAX_LENGTH) {
                          throw new Error(`Bio must be ${BIO_MAX_LENGTH} characters or fewer.`);
                        }

                        if (nextLocation.length > LOCATION_MAX_LENGTH) {
                          throw new Error(`Location must be ${LOCATION_MAX_LENGTH} characters or fewer.`);
                        }

                        if (nextHandle !== profile.handle && !profile.isPremium) {
                          throw new Error("Premium is required to update your @ handle.");
                        }

                        if (nextHandle !== profile.handle) {
                          const available = await isHandleAvailable(nextHandle, profile.uid);
                          if (!available) {
                            throw new Error("That handle is already taken.");
                          }
                        }

                        if (nextDisplayName !== profile.displayName) {
                          await updateDisplayName(nextDisplayName);
                        }
                        await updateUserProfile(profile.uid, {
                          handle: nextHandle,
                          bio: nextBio,
                          location: nextLocation,
                          bannerColor,
                          isPrivate,
                        });
                        toast.success("Profile updated");
                        onClose();
                      } catch (error) {
                        console.error("Failed to update profile", error);
                        toast.error(getFirebaseErrorMessage(error));
                      } finally {
                        setIsSavingProfile(false);
                      }
                    }}
                  >
                    {isSavingProfile ? "Saving..." : "Save profile"}
                  </Button>
                  <div className="flex items-center gap-3">
                    <Avatar name={profile.displayName} src={profile.photoURL} />
                    <div className="space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }

                          try {
                            await uploadProfilePicture(file);
                            toast.success("Profile picture updated");
                          } catch (error) {
                            console.error("Failed to update profile picture", error);
                            toast.error(getFirebaseErrorMessage(error));
                          }
                        }}
                      />
                      <p className="text-xs text-textMuted">Upload a new profile picture.</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-5">
              <Card className="space-y-3 p-4">
                <h3 className="font-semibold">Link Google</h3>
                <p className="text-sm text-textMuted">Connect a Google account to this profile.</p>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await linkGoogleAccount();
                      toast.success("Google account linked");
                    } catch (error) {
                      console.error("Failed to link Google account", error);
                      toast.error(getFirebaseErrorMessage(error));
                    }
                  }}
                >
                  Link Google
                </Button>
              </Card>

              <Card className="space-y-3 p-4">
                <h3 className="font-semibold">Change password</h3>
                <input
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  type="password"
                  placeholder="Current password"
                  className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none"
                />
                <input
                  value={nextPassword}
                  onChange={(event) => setNextPassword(event.target.value)}
                  type="password"
                  placeholder="New password"
                  className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none"
                />
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await changeUserPassword(currentPassword, nextPassword);
                      toast.success("Password updated");
                      setCurrentPassword("");
                      setNextPassword("");
                    } catch (error) {
                      console.error("Failed to change password", error);
                      toast.error(getFirebaseErrorMessage(error));
                    }
                  }}
                >
                  Update password
                </Button>
              </Card>

              <Card className="space-y-3 p-4">
                <h3 className="font-semibold">Visibility summary</h3>
                <div className="space-y-2 text-sm text-textMuted">
                  <p className="inline-flex items-center gap-2">{isPrivate ? <Lock size={14} /> : <Globe2 size={14} />}{isPrivate ? "Private profile" : "Public profile"}</p>
                  <p>{isPrivate ? "Only mutuals can see your posts." : "Anyone can see your posts."}</p>
                </div>
              </Card>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ModeratorBanButton({ targetUserId }: { targetUserId: string }) {
  const { user } = useAuth();
  const [currentUserProfile, setCurrentUserProfile] = useState<ReturnType<typeof getDemoUserByHandle> | null>(null);
  const [isBanning, setIsBanning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setCurrentUserProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, setCurrentUserProfile);
  }, [user]);

  if (!currentUserProfile?.isModerator) {
    return null;
  }

  return (
    <Button
      variant="secondary"
      className="h-9 px-3 text-red-500"
      disabled={isBanning}
      onClick={async () => {
        const confirmed = window.confirm("Ban this user? This removes their account, posts, replies, and blocks their recorded IP address.");
        if (!confirmed) {
          return;
        }

        setIsBanning(true);
        try {
          await banUserAccount(targetUserId);
          toast.success("User banned", { description: "The account, authored content, and recorded IP address were blocked." });
          navigate("/");
        } catch (error) {
          console.error("Failed to ban user", error);
          toast.error("Unable to ban user", { description: getFirebaseErrorMessage(error) });
        } finally {
          setIsBanning(false);
        }
      }}
    >
      <Hammer size={16} />
    </Button>
  );
}

const MODERATOR_TIMEOUT_OPTIONS = [
  { label: "Remove timeout", durationMs: null },
  { label: "Forever", durationMs: "forever" },
  { label: "1h", durationMs: 60 * 60 * 1000 },
  { label: "3h", durationMs: 3 * 60 * 60 * 1000 },
  { label: "6h", durationMs: 6 * 60 * 60 * 1000 },
  { label: "1d", durationMs: 24 * 60 * 60 * 1000 },
  { label: "1w", durationMs: 7 * 24 * 60 * 60 * 1000 },
] as const;

function ModeratorTimeoutButton({ targetUserId }: { targetUserId: string }) {
  const { user } = useAuth();
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!user) {
      setCurrentUserProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, setCurrentUserProfile);
  }, [user]);

  if (!currentUserProfile?.isModerator) {
    return null;
  }

  return (
    <select
      className="h-9 rounded-2xl border border-border bg-surface px-3 text-sm text-text"
      defaultValue=""
      disabled={isUpdating}
      onChange={async (event) => {
        const selected = MODERATOR_TIMEOUT_OPTIONS.find((option) => option.label === event.target.value);
        event.currentTarget.value = "";
        if (!selected) {
          return;
        }

        setIsUpdating(true);
        try {
          await updateUserProfile(targetUserId, {
            timeoutUntil: selected.durationMs === null ? null : selected.durationMs === "forever" ? "forever" : new Date(Date.now() + selected.durationMs).toISOString(),
          });
          toast.success(selected.durationMs === null ? "Timeout removed" : selected.durationMs === "forever" ? "User timed out forever" : "User timed out", {
            description: selected.durationMs === null ? "The user can post again." : selected.durationMs === "forever" ? "Permanent timeout applied." : `${selected.label} applied.`,
          });
        } catch (error) {
          console.error("Failed to time out user", error);
          toast.error(getFirebaseErrorMessage(error));
        } finally {
          setIsUpdating(false);
        }
      }}
    >
      <option value="">Timeout</option>
      {MODERATOR_TIMEOUT_OPTIONS.map((option) => (
        <option key={option.label} value={option.label}>{option.label}</option>
      ))}
    </select>
  );
}

export function PremiumPage() {
  return (
    <PageFrame title="Premium" subtitle="Upgrade to premium">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <Card className="space-y-5 overflow-hidden p-0">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(255,107,87,0.35),_transparent_42%),linear-gradient(135deg,#20131a_0%,#402029_52%,#ff6b57_100%)] p-14 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              <Sparkles size={14} />
              Premium
            </div>
            <h2 className="mt-4 max-w-xl text-3xl font-bold">Premium perks that actually change how your account feels.</h2>
            <p className="mt-3 max-w-2xl text-sm text-white/80">Cosmetics, extra rewards, stronger odds, and a few quality-of-life flexes in one cheap upgrade.</p>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">Premium</p>
            <h3 className="mt-2 text-2xl font-bold">$1 / month</h3>
            <p className="mt-2 text-sm text-textMuted">Best value</p>
          </div>
          <Button className="w-full gap-2">
            <Crown size={16} />
            Buy Premium
          </Button>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">Premium +</p>
            <h3 className="mt-2 text-2xl font-bold">$5 / month</h3>
            <p className="mt-2 text-sm text-textMuted">Most popular</p>
          </div>
          <Button className="w-full gap-2">
            <Crown size={16} />
            Buy Premium+
          </Button>
        </Card>
      </div>

      <Card className="p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            "Verified checkmark",
            "Banner headers",
            "Increased daily rewards",
            "5% market discount",
            "+5% gambling odds",
            "+150 daily gems",
            "Hidden last online",
            "Update @ handle",
            "Animated pfp",
            "Free rotten tomatoes",
          ].map((benefit) => (
            <div key={benefit} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surfaceAlt/30 px-4 py-3 text-sm">
              <Check size={15} className="text-[color:var(--accent)]" />
              {benefit}
            </div>
          ))}
        </div>
      </Card>
    </PageFrame>
  );
}

export function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [navigate, user]);

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to pick up where you left off.">
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            if ((await checkIpBan()).banned) {
              navigate("/banned", { replace: true });
              return;
            }
            const credential = await signInWithEmail(values.email, values.password);
            if ((await registerUserDeviceIp()).banned) {
              await logout();
              navigate("/banned", { replace: true });
              return;
            }
            await ensureUserProfile(credential.user);
            toast.success("Signed in");
            navigate("/");
          } catch (error) {
            console.error("Failed login", error);
            toast.error("Login failed", {
              description: getFirebaseErrorMessage(error),
            });
          }
        })}
      >
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-sm font-semibold">Email address</label>
          <input id="login-email" {...form.register("email")} autoComplete="email" type="email" placeholder="you@example.com" className="w-full rounded-xl border border-border bg-transparent px-4 py-3 outline-none transition focus:border-accent focus:ring-2 focus:ring-[color:var(--accent)]/20" />
          {form.formState.errors.email ? <p className="text-sm text-red-400">Enter a valid email address.</p> : null}
        </div>
        <div className="space-y-2">
          <label htmlFor="login-password" className="text-sm font-semibold">Password</label>
          <div className="relative">
            <input id="login-password" {...form.register("password")} autoComplete="current-password" type={showPassword ? "text" : "password"} placeholder="Your password" className="w-full rounded-xl border border-border bg-transparent py-3 pl-4 pr-12 outline-none transition focus:border-accent focus:ring-2 focus:ring-[color:var(--accent)]/20" />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-textMuted hover:bg-surfaceAlt hover:text-text" onClick={() => setShowPassword((visible) => !visible)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {form.formState.errors.password ? <p className="text-sm text-red-400">Enter your password.</p> : null}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
        <div className="relative py-1 text-center text-xs text-textMuted before:absolute before:left-0 before:right-0 before:top-1/2 before:border-t before:border-border">
          <span className="relative bg-surface px-3">or continue with</span>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={async () => {
              try {
                if ((await checkIpBan()).banned) {
                  navigate("/banned", { replace: true });
                  return;
                }
                const credential = await signInWithGoogle();
                if ((await registerUserDeviceIp()).banned) {
                  await logout();
                  navigate("/banned", { replace: true });
                  return;
                }
                await ensureUserProfile(credential.user);
                toast.success("Signed in with Google");
                navigate("/");
              } catch (error) {
                console.error("Failed Google login", error);
                toast.error("Google sign-in failed", {
                  description: getFirebaseErrorMessage(error),
                });
              }
            }}
          >
            Continue with Google
          </Button>
        </div>
        <p className="text-center text-sm text-textMuted">
          New to PulseArc? <Link className="font-semibold text-accent hover:underline" to="/signup">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [navigate, user]);

  return (
    <AuthShell title="Create your account" subtitle="Sign up for Nebula.">
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            if ((await checkIpBan()).banned) {
              navigate("/banned", { replace: true });
              return;
            }
            await signUpWithEmail(values.email.trim(), values.password, values.displayName.trim());
            toast.success("Check your email", { description: "Verify your email address, then sign in to finish creating your account." });
            navigate("/login");
          } catch (error) {
            console.error("Failed signup", error);
            toast.error("Account creation failed", {
              description: getFirebaseErrorMessage(error),
            });
          }
        })}
      >
        <div className="space-y-2">
          <label htmlFor="signup-name" className="text-sm font-semibold">Display name</label>
          <input id="signup-name" {...form.register("displayName")} autoComplete="name" placeholder="Your name" className="w-full rounded-xl border border-border bg-transparent px-4 py-3 outline-none transition focus:border-accent focus:ring-2 focus:ring-[color:var(--accent)]/20" />
          {form.formState.errors.displayName ? <p className="text-sm text-red-400">Use 2 to 25 characters.</p> : null}
        </div>
        <div className="space-y-2">
          <label htmlFor="signup-email" className="text-sm font-semibold">Email address</label>
          <input id="signup-email" {...form.register("email")} autoComplete="email" type="email" placeholder="you@example.com" className="w-full rounded-xl border border-border bg-transparent px-4 py-3 outline-none transition focus:border-accent focus:ring-2 focus:ring-[color:var(--accent)]/20" />
          {form.formState.errors.email ? <p className="text-sm text-red-400">Enter a valid email address.</p> : null}
        </div>
        <div className="space-y-2">
          <label htmlFor="signup-password" className="text-sm font-semibold">Password</label>
          <div className="relative">
            <input id="signup-password" {...form.register("password")} autoComplete="new-password" type={showPassword ? "text" : "password"} placeholder="At least 6 characters" className="w-full rounded-xl border border-border bg-transparent py-3 pl-4 pr-12 outline-none transition focus:border-accent focus:ring-2 focus:ring-[color:var(--accent)]/20" />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-textMuted hover:bg-surfaceAlt hover:text-text" onClick={() => setShowPassword((visible) => !visible)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {form.formState.errors.password ? <p className="text-sm text-red-400">Use at least 6 characters.</p> : null}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating account..." : "Create account"}
        </Button>
        <div className="relative py-1 text-center text-xs text-textMuted before:absolute before:left-0 before:right-0 before:top-1/2 before:border-t before:border-border">
          <span className="relative bg-surface px-3">or continue with</span>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={async () => {
              try {
                if ((await checkIpBan()).banned) {
                  navigate("/banned", { replace: true });
                  return;
                }
                const credential = await signInWithGoogle();
                if ((await registerUserDeviceIp()).banned) {
                  await logout();
                  navigate("/banned", { replace: true });
                  return;
                }
                await ensureUserProfile(credential.user);
                toast.success("Signed in with Google");
                navigate("/");
              } catch (error) {
                console.error("Failed Google signup", error);
                toast.error("Google sign-in failed", {
                  description: getFirebaseErrorMessage(error),
                });
              }
            }}
          >
            Continue with Google
          </Button>
        </div>
        <p className="text-center text-sm text-textMuted">
          Already have an account? <Link className="font-semibold text-accent hover:underline" to="/login">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function BannedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <Card className="w-full max-w-lg space-y-4 p-8 text-center shadow-xl">
        <TriangleAlert className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="text-2xl font-bold">You have been banned of Nebula Social</h1>
        <p className="text-sm text-textMuted">Access from this device has been blocked. If you believe this is a mistake, contact Nebula Social support.</p>
      </Card>
    </div>
  );
}

export function TimedOutPage() {
  const { timeoutUntil } = useAuth();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!timeoutUntil || timeoutUntil === "forever") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timeoutUntil]);

  const remaining = timeoutUntil && timeoutUntil !== "forever" && new Date(timeoutUntil).getTime() > now
    ? getTimeoutRemainingLabel(timeoutUntil) ?? "less than a minute"
    : "no time — your timeout has expired.";
  const expiry = timeoutUntil && timeoutUntil !== "forever" ? new Date(timeoutUntil) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <Card className="w-full max-w-lg space-y-4 p-8 text-center shadow-xl">
        <Clock3 className="mx-auto h-12 w-12 text-amber-400" />
        <h1 className="text-2xl font-bold">You have been timed out</h1>
        <p className="text-sm text-textMuted">{timeoutUntil === "forever" ? "This timeout is permanent." : `Your timeout expires in ${remaining}`}</p>
        {expiry ? <p className="text-xs text-textMuted">Expires on {expiry.toLocaleString()}</p> : null}
      </Card>
    </div>
  );
}

export function OnboardingPage() {
  return <PageFrame title="Onboarding" subtitle="Coming soon. Multi-step setup for avatar, bio, interests, accent color, and starter follows." />;
}

export function PostPage() {
  const { user } = useAuth();
  const { postId } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, (typeof users)[number] | null>>({});
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [collapsedReplyIds, setCollapsedReplyIds] = useState<Record<string, boolean>>({});

  useEffect(() => subscribeToPosts(setPosts), []);

  const post = posts.find((item: Post) => item.id === postId);
  const replies = useMemo(() => posts.filter((item: Post) => item.parentPostId === postId), [posts, postId]);

  useEffect(() => {
    if (!user || !postId || !post || post.authorId === user.uid) return;
    void recordPostView(postId).catch(() => undefined);
  }, [post, postId, user]);

  useEffect(() => {
    const relevantUserIds = Array.from(new Set(
      [post?.authorId, ...replies.map((reply) => reply.authorId)]
        .filter((value): value is string => Boolean(value)),
    ));

    if (!relevantUserIds.length) {
      setProfilesById({});
      return;
    }

    const unsubscribers = relevantUserIds.map((userId) =>
      subscribeToUserProfileById(userId, (profile) => {
        setProfilesById((current) => ({
          ...current,
          [userId]: profile ?? users.find((candidate) => candidate.uid === userId) ?? null,
        }));
      }),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [post?.authorId, replies]);

  const replyTarget = replies.find((reply) => reply.id === replyTargetId) ?? null;
  const groupedReplies = useMemo(() => {
    const grouped = new Map<string, Post[]>();
    for (const reply of replies) {
      const key = reply.replyToPostId ?? reply.parentPostId ?? "";
      const current = grouped.get(key) ?? [];
      current.push(reply);
      grouped.set(key, current);
    }

    for (const entry of grouped.values()) {
      entry.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
    }

    return grouped;
  }, [replies]);

  function getReplyContextLabel(reply: Post) {
    const targetId = reply.replyToPostId ?? reply.parentPostId;
    if (!targetId) {
      return null;
    }

    if (post && targetId === post.id) {
      const rootAuthor = profilesById[post.authorId];
      return rootAuthor ? `@${rootAuthor.handle}` : null;
    }

    const targetReply = replies.find((item) => item.id === targetId);
    if (!targetReply) {
      return null;
    }

    const targetProfile = profilesById[targetReply.authorId];
    return targetProfile ? `@${targetProfile.handle}` : null;
  }

  function toggleReplyThread(replyId: string) {
    setCollapsedReplyIds((current) => ({
      ...current,
      [replyId]: !current[replyId],
    }));
  }

  function renderReplies(parentId: string, depth = 0): ReactNode {
    const children = groupedReplies.get(parentId) ?? [];
    if (!children.length) {
      return null;
    }

    return (
      <div className="space-y-3">
        {children.map((reply) => {
          const nestedChildren = groupedReplies.get(reply.id) ?? [];
          const isCollapsed = Boolean(collapsedReplyIds[reply.id]);

          return (
            <div key={reply.id} className={depth ? "ml-4 border-l border-border pl-4 sm:ml-6 sm:pl-5" : ""}>
              <PostCard
                post={reply}
                replyContextLabel={getReplyContextLabel(reply)}
                onReply={() => setReplyTargetId(reply.id)}
              />
              {nestedChildren.length ? (
                <div className="mt-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-[color:var(--accent)]"
                    onClick={() => toggleReplyThread(reply.id)}
                  >
                    {isCollapsed ? `Show ${nestedChildren.length} repl${nestedChildren.length === 1 ? "y" : "ies"}` : "Hide thread"}
                  </button>
                </div>
              ) : null}
              {!isCollapsed ? (
                <div className="mt-3">
                  {renderReplies(reply.id, depth + 1)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <PageFrame title="" subtitle="">
      {!post ? (
        <Card className="p-6 text-sm text-textMuted">Post not found.</Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
            <p className="text-sm text-textMuted">{replies.length} replies</p>
          </div>
          <PostCard post={post} onReply={() => setReplyTargetId(post.id)} />
          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2 font-semibold">
              <MessageCircle size={18} />
              Comments
              <span className="rounded-full bg-surfaceAlt px-2 py-0.5 text-xs font-medium text-textMuted">{replies.length}</span>
            </div>
            {replies.length ? renderReplies(post.id) : (
              <p className="text-sm text-textMuted">No comments yet.</p>
            )}
          </Card>
          <div className="sticky bottom-20 z-30 sm:bottom-4">
            {replyTarget ? <div className="mb-2 flex justify-end">
              {replyTarget ? (
                <Button variant="secondary" size="sm" onClick={() => setReplyTargetId(null)}>
                  Clear target
                </Button>
              ) : null}
            </div> : null}
            <PostComposer
              parentPost={post}
              replyToPost={replyTarget && replyTarget.id !== post.id ? replyTarget : undefined}
              mode="reply"
              onPosted={() => setReplyTargetId(null)}
            />
          </div>
        </div>
      )}
    </PageFrame>
  );
}

export function ChatPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [adminConversations, setAdminConversations] = useState<Conversation[]>([]);
  const [inspectedConversationId, setInspectedConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [draft, setDraft] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false);
  const messageIdsRef = useRef<string[] | null>(null);
  const activeConversation = inspectedConversationId
    ? adminConversations.find((conversation) => conversation.id === inspectedConversationId) ?? null
    : conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0] ?? null;
  const canSendMessage = Boolean(user && activeConversation?.participantIds.includes(user.uid));
  const profilesById = useMemo(() => new Map(profiles.map((item) => [item.uid, item])), [profiles]);
  const mutualProfiles = useMemo(() => profiles.filter((item) => followingIds.includes(item.uid) && followerIds.includes(item.uid)), [followerIds, followingIds, profiles]);
  const isModerator = Boolean(profile?.isModerator);
  const unreadMessageCount = useMemo(() => user ? conversations.filter((conversation) => hasUnreadConversation(conversation, user.uid)).length : 0, [conversations, user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setConversations([]);
      setAdminConversations([]);
      return;
    }
    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToUserProfiles(setProfiles);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribeFollowing = subscribeToFollowingIds(user.uid, setFollowingIds);
    const unsubscribeFollowers = subscribeToFollowerIds(user.uid, setFollowerIds);
    return () => { unsubscribeFollowing(); unsubscribeFollowers(); };
  }, [user]);

  useEffect(() => {
    const mutualIds = followingIds.filter((profileId) => followerIds.includes(profileId));
    if (!mutualIds.length) return;
    const unsubscribers = mutualIds.map((profileId) => subscribeToUserProfileById(profileId, (mutualProfile) => {
      if (!mutualProfile) return;
      setProfiles((current) => [...current.filter((item) => item.uid !== profileId), mutualProfile]);
    }));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [followerIds, followingIds]);

  useEffect(() => {
    if (!user) return;
    return subscribeToConversations(user.uid, setConversations);
  }, [user]);

  useEffect(() => {
    if (!isModerator) {
      setAdminConversations([]);
      setInspectedConversationId("");
      return;
    }
    return subscribeToAllConversations(setAdminConversations);
  }, [isModerator]);

  useEffect(() => {
    if (!activeConversationId && conversations[0]) setActiveConversationId(conversations[0].id);
    if (activeConversationId && !conversations.some((item) => item.id === activeConversationId)) setActiveConversationId(conversations[0]?.id ?? "");
  }, [activeConversationId, conversations]);

  useEffect(() => {
    messageIdsRef.current = null;
    return subscribeToConversationMessages(activeConversation?.id ?? null, (nextMessages) => {
      const previousIds = messageIdsRef.current;
      if (previousIds && user) {
        const newMessage = nextMessages.find((message) => !previousIds.includes(message.id) && message.senderId !== user.uid);
        if (newMessage) sendBrowserAlert(`Message from ${conversationTitle(activeConversation!)}`, newMessage.body);
      }
      messageIdsRef.current = nextMessages.map((message) => message.id);
      setMessages(nextMessages);
    });
  }, [activeConversation?.id, user]);

  useEffect(() => {
    if (!user || !activeConversation || inspectedConversationId || !hasUnreadConversation(activeConversation, user.uid)) return;
    void markConversationRead(activeConversation.id, user.uid).catch((error) => console.error("Failed to mark conversation read", error));
  }, [activeConversation, inspectedConversationId, user]);

  const sendMessage = async () => {
    if (!user || !activeConversation || !draft.trim()) {
      return;
    }
    try { await sendDirectMessage(activeConversation, user.uid, draft); setDraft(""); } catch (error) { toast.error(getFirebaseErrorMessage(error)); }
  };

  async function beginChat(contact: UserProfile) {
    if (!user) return;
    if (!followingIds.includes(contact.uid) || !followerIds.includes(contact.uid)) {
      toast.error("You can only start chats with mutual follows.");
      return;
    }
    setIsStartingChat(true);
    try { setInspectedConversationId(""); setActiveConversationId(await startConversation(user.uid, contact.uid, contact.displayName)); } catch (error) { toast.error(getFirebaseErrorMessage(error)); } finally { setIsStartingChat(false); }
  }

  function conversationTitle(conversation: Conversation) {
    const otherId = conversation.participantIds.find((id) => id !== user?.uid) ?? conversation.participantIds[0];
    return profilesById.get(otherId)?.displayName ?? conversation.title;
  }

  return (
    <PageFrame title="Messages" subtitle="Chat privately with people you both follow.">
      {!user ? <Card className="p-6 text-sm text-textMuted">Sign in to use direct messages.</Card> : (
      <div className="space-y-4">
        {unreadMessageCount ? <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--error)]/15 px-3 py-1 text-xs font-semibold text-[color:var(--error)]">{unreadMessageCount} unread message{unreadMessageCount === 1 ? "" : "s"}</div> : null}
      <Card className="flex min-h-[620px] flex-col overflow-hidden p-0">
          <div className="flex items-center gap-3 overflow-x-auto border-b border-border p-4">
            {mutualProfiles.map((contact) => <button key={contact.uid} type="button" disabled={isStartingChat} title={`Chat with ${contact.displayName}`} onClick={() => void beginChat(contact)} className="group shrink-0"><Avatar name={contact.displayName} src={contact.photoURL} className="h-11 w-11 rounded-xl transition group-hover:ring-2 group-hover:ring-[color:var(--accent)]" /></button>)}
            {!mutualProfiles.length ? <p className="text-sm text-textMuted">Mutually follow someone to start a direct message.</p> : null}
          </div>
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent"><Users size={18} /></div>
            <div className="min-w-0 flex-1"><h2 className="font-semibold">{activeConversation ? conversationTitle(activeConversation) : "Select a conversation"}</h2><p className="text-xs text-textMuted">{inspectedConversationId ? "Admin inspection — read only" : "Mutual-follow direct message"}</p></div>
            {isModerator ? <select value={inspectedConversationId} onChange={(event) => setInspectedConversationId(event.target.value)} className="min-w-48 rounded-xl border border-border bg-surface px-3 py-2 text-sm"><option value="">Admin: my chats</option>{adminConversations.filter((item) => !item.participantIds.includes(user.uid)).map((item) => <option key={item.id} value={item.id}>{item.title || item.participantIds.join(" / ")}</option>)}</select> : null}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {messages.map((message) => {
              const isOwn = message.senderId === user.uid;
              return (
                <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-lg px-4 py-2 text-sm ${isOwn ? "bg-accent text-white" : "bg-surfaceAlt text-text"}`}>
                    {message.body}
                  </div>
                </div>
              );
            })}
            {!activeConversation ? <p className="text-sm text-textMuted">Choose a conversation or start one with a mutual follow.</p> : null}
          </div>
          <div className="flex gap-2 border-t border-border p-4">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void sendMessage();
                }
              }}
              placeholder={activeConversation ? "Write a message" : "Choose a conversation first"}
              disabled={!canSendMessage || Boolean(inspectedConversationId)}
              className="min-w-0 flex-1 rounded-full border border-border bg-transparent px-4 py-2 text-sm outline-none focus:border-accent"
            />
            <Button type="button" onClick={() => void sendMessage()} disabled={!draft.trim() || !canSendMessage || Boolean(inspectedConversationId)} className="gap-2">
              <Send size={16} />
              Send
            </Button>
          </div>
      </Card>
      </div>
      )}
    </PageFrame>
  );
}

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const unreadCount = items.filter((item) => !item.read).length;

  async function handleNotificationClick(item: NotificationItem) {
    if (!item.read) {
      await markNotificationRead(item.id);
    }

    if (item.postId) {
      navigate(`/post/${item.postId}`);
    }
  }

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    return subscribeToNotifications(user.uid, setItems);
  }, [user]);

  return (
    <PageFrame title="Notifications" subtitle="Live activity from replies, follows, mentions, rotten tomatoes, reports, and level-ups.">
      {!user ? (
        <Card className="p-6 text-sm text-textMuted">Sign in to view your notifications.</Card>
      ) : (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold">Live activity</p>
              <p className="text-sm text-textMuted">{items.length ? `${items.length} notification${items.length === 1 ? "" : "s"}` : "No notifications yet"}</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount ? (
                <div className="rounded-full bg-[color:var(--error)]/15 px-3 py-1 text-xs font-semibold text-[color:var(--error)]">
                  {unreadCount} unread
                </div>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                disabled={!unreadCount}
                onClick={() => void (user ? markAllNotificationsRead(user.uid) : Promise.resolve())}
              >
                Read all
              </Button>
            </div>
          </Card>

          <Card className="space-y-3 p-4">
          {items.length ? items.map((item) => {
            const visual = getNotificationVisual(item.type);
            const Icon = visual.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={`block w-full rounded-3xl border p-4 text-left transition ${
                  item.read
                    ? "border-border bg-surface hover:bg-surfaceAlt/40"
                    : "border-[color:var(--accent)]/25 bg-[color:var(--accent)]/8 hover:bg-[color:var(--accent)]/12"
                }`}
                onClick={() => void handleNotificationClick(item)}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surfaceAlt ${visual.tint}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${visual.chip}`}>
                          {visual.label}
                        </span>
                      </div>
                      {!item.read ? <span className="rounded-full bg-[color:var(--error)] px-2 py-0.5 text-[10px] font-semibold text-white">New</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-textMuted">{item.body}</p>
                    <p className="mt-3 text-xs text-textMuted">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </button>
            );
          }) : (
            <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-textMuted">
              Notifications will appear here as people reply, mention you, follow you, report content, throw rotten tomatoes, or when your account levels up.
            </div>
          )}
          </Card>
        </div>
      )}
    </PageFrame>
  );
}

function FollowListModal({
  open,
  title,
  currentUserId,
  profileUserId,
  users,
  onClose,
}: {
  open: boolean;
  title: string;
  currentUserId: string;
  profileUserId: string;
  users: UserProfile[];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !currentUserId) {
      setFollowingIds([]);
      return;
    }

    return subscribeToFollowingIds(currentUserId, setFollowingIds);
  }, [currentUserId, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-border bg-canvas p-4 shadow-panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-textMuted">{users.length} {users.length === 1 ? "person" : "people"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        <div className="space-y-3">
          {users.length ? users.map((profile) => {
            const isOwn = profile.uid === currentUserId;
            const isProfileOwner = profile.uid === profileUserId;
            const isFollowing = followingIds.includes(profile.uid);

            return (
              <div key={profile.uid} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                <button type="button" className="shrink-0" onClick={() => {
                  navigate(`/profile/${profile.handle}`);
                  onClose();
                }}>
                  <Avatar name={profile.displayName} src={profile.photoURL} className="h-11 w-11 rounded-2xl" />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="block text-left font-semibold hover:underline"
                    onClick={() => {
                      navigate(`/profile/${profile.handle}`);
                      onClose();
                    }}
                  >
                    {profile.displayName}
                  </button>
                  <p className="text-sm text-textMuted">@{profile.handle}</p>
                </div>
                {!currentUserId || isOwn ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      navigate(`/profile/${profile.handle}`);
                      onClose();
                    }}
                  >
                    {isOwn ? "You" : "View"}
                  </Button>
                ) : (
                  <Button
                    variant={isFollowing ? "secondary" : (isProfileOwner ? "primary" : "ghost")}
                    size="sm"
                    disabled={pendingUserId === profile.uid}
                    onClick={() => {
                      void (async () => {
                        setPendingUserId(profile.uid);
                        try {
                          await setFollowingRelationship(currentUserId, profile.uid, !isFollowing);
                        } catch (error) {
                          console.error("Failed to toggle follow relationship", error);
                          toast.error("Follow action failed");
                        } finally {
                          setPendingUserId(null);
                        }
                      })();
                    }}
                  >
                    {pendingUserId === profile.uid ? "Saving..." : isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
              </div>
            );
          }) : (
            <div className="rounded-2xl border border-border p-6 text-sm text-textMuted">No users to show yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BookmarksPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);

  useEffect(() => subscribeToPosts(setPosts), []);

  useEffect(() => {
    if (!user) {
      setBookmarkedPosts([]);
      return;
    }

    return subscribeToBookmarkedPosts(user.uid, posts, setBookmarkedPosts);
  }, [posts, user]);

  return (
    <PageFrame title="Bookmarks" subtitle="Your saved posts, synced privately to your account.">
      {bookmarkedPosts.length ? bookmarkedPosts.map((post) => <PostCard key={post.id} post={post} />) : (
        <Card className="p-6 text-sm text-textMuted">No bookmarks yet.</Card>
      )}
    </PageFrame>
  );
}

export function ArcadePage() {
  const [arcadeTab, setArcadeTab] = useState<"slots" | "mines" | "coin" | "dice" | "wheel" | "reaction">("slots");

  return (
    <PageFrame title="Arcade" subtitle="Wager games and quick challenges.">
      <div className="space-y-5">
        <SectionNav ariaLabel="Arcade games" activeId={arcadeTab} onChange={setArcadeTab} items={[ { id: "slots", label: "Slots" }, { id: "mines", label: "Mines" }, { id: "coin", label: "Coin Toss" }, { id: "dice", label: "Dice" }, { id: "wheel", label: "Wheel Spin" }, { id: "reaction", label: "Reaction Test" } ] as const} />
        {arcadeTab === "slots" ? <SlotMachine /> : arcadeTab === "mines" ? <MinesGame /> : arcadeTab === "coin" ? <CoinToss /> : arcadeTab === "dice" ? <DiceGame /> : arcadeTab === "wheel" ? <WheelSpin /> : <ReactionTest />}
      </div>
    </PageFrame>
  );
}

export function MarketPage() {
  const { user } = useAuth();
  const { setTheme } = useUiStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [marketSection, setMarketSection] = useState<"nameplates" | "borders" | "banners" | "cards" | "themes">("nameplates");
  const themeOptions = Object.entries(themePresets).map(([id, definition]) => ({
    id: id as ThemeMode,
    ...definition,
    price: THEME_MARKET_PRICES[id as ThemeMode],
  }));

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  async function buyNameColor(colorId: string) {
    if (!user || !profile) {
      return;
    }

    const option = NAME_COLOR_OPTIONS.find((item) => item.id === colorId);
    if (!option) {
      return;
    }
    if ((profile.ownedNameColorIds ?? []).includes(colorId)) {
      await updateUserProfile(user.uid, { equippedNameColorId: colorId });
      toast.success(`${option.name} equipped`);
      return;
    }
    if (profile.gems < option.price) {
      toast.error("Not enough gems for that color.");
      return;
    }

    await addGemsToUser(user.uid, -option.price);
    await updateUserProfile(user.uid, {
      ownedNameColorIds: [...new Set([...(profile.ownedNameColorIds ?? ["default"]), colorId])],
      equippedNameColorId: colorId,
    });
    await recordActivity(user.uid, "purchase", option.name, `Purchased name color for ${formatAmount(option.price)} gems`, option.price);
    toast.success(`${option.name} purchased and equipped`);
  }

  async function buyTheme(themeId: ThemeMode) {
    if (!user || !profile) {
      return;
    }

    const option = themeOptions.find((item) => item.id === themeId);
    if (!option) {
      return;
    }

    const ownedThemeIds = getOwnedThemeIds(profile);
    const owned = ownedThemeIds.includes(themeId);
    if (owned) {
      await updateUserProfile(user.uid, { theme: themeId });
      setTheme(themeId);
      toast.success(`${option.label} equipped`);
      return;
    }

    if (profile.gems < option.price) {
      toast.error("Not enough gems for that theme.");
      return;
    }

    await addGemsToUser(user.uid, -option.price);
    await updateUserProfile(user.uid, {
      ownedThemeIds: [...new Set([...ownedThemeIds, themeId])],
      theme: themeId,
    });
    await recordActivity(user.uid, "purchase", option.label, `Purchased theme for ${formatAmount(option.price)} gems`, option.price);
    setTheme(themeId);
    toast.success(`${option.label} purchased and equipped`);
  }

  async function buyProfileBorder(borderId: string) {
    if (!user || !profile) {
      return;
    }

    const option = PROFILE_BORDER_OPTIONS.find((item) => item.id === borderId);
    if (!option) {
      return;
    }

    const owned = (profile.ownedProfileBorderIds ?? ["border-none"]).includes(borderId);
    if (owned) {
      await updateUserProfile(user.uid, { equippedProfileBorderId: borderId });
      toast.success(`${option.name} equipped`);
      return;
    }

    if (profile.gems < option.price) {
      toast.error("Not enough gems for that profile border.");
      return;
    }

    await addGemsToUser(user.uid, -option.price);
    await updateUserProfile(user.uid, {
      ownedProfileBorderIds: [...new Set([...(profile.ownedProfileBorderIds ?? ["border-none"]), borderId])],
      equippedProfileBorderId: borderId,
    });
    await recordActivity(user.uid, "purchase", option.name, `Purchased profile border for ${formatAmount(option.price)} gems`, option.price);
    toast.success(`${option.name} purchased and equipped`);
  }

  async function buyProfileCard(cardId: string) {
    if (!user || !profile) return;
    const option = PROFILE_CARD_OPTIONS.find((item) => item.id === cardId);
    if (!option) return;
    const owned = (profile.ownedProfileCardIds ?? ["card-default"]).includes(cardId);
    if (owned) {
      await updateUserProfile(user.uid, { equippedProfileCardId: cardId });
      toast.success(`${option.name} equipped`);
      return;
    }
    if (profile.gems < option.price) {
      toast.error("Not enough gems for that profile card.");
      return;
    }
    await addGemsToUser(user.uid, -option.price);
    await updateUserProfile(user.uid, { ownedProfileCardIds: [...new Set([...(profile.ownedProfileCardIds ?? ["card-default"]), cardId])], equippedProfileCardId: cardId });
    await recordActivity(user.uid, "purchase", option.name, `Purchased profile card for ${formatAmount(option.price)} gems`, option.price);
    toast.success(`${option.name} purchased and equipped`);
  }

  async function buyBannerColor(bannerId: string) {
    if (!user || !profile) return;
    const option = bannerColorOptions.find((item) => item.id === bannerId);
    if (!option) return;
    const ownedIds = profile.ownedBannerColorIds ?? defaultBannerColorIds;
    if (ownedIds.includes(bannerId)) {
      await updateUserProfile(user.uid, { bannerColor: option.value });
      toast.success(`${option.name} equipped`);
      return;
    }
    if (profile.gems < option.price) {
      toast.error("Not enough gems for that banner color.");
      return;
    }
    await addGemsToUser(user.uid, -option.price);
    await updateUserProfile(user.uid, {
      ownedBannerColorIds: [...new Set([...ownedIds, bannerId])],
      bannerColor: option.value,
    });
    await recordActivity(user.uid, "purchase", option.name, `Purchased banner color for ${formatAmount(option.price)} gems`, option.price);
    toast.success(`${option.name} purchased and equipped`);
  }

  return (
    <PageFrame title="Market" subtitle="Spend gems on profile cosmetics, animated nameplates, borders, and a deeper theme catalog.">
      {!user || !profile ? (
        <Card className="p-6 text-sm text-textMuted">Sign in to browse the market.</Card>
      ) : (
        <div className="space-y-5">
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm text-textMuted">Preview</p>
              <div className="mt-2 flex items-center gap-3">
                <Avatar
                  name={profile.displayName}
                  src={profile.photoURL}
                  className="h-14 w-14 rounded-3xl"
                  borderId={profile.equippedProfileBorderId}
                />
                <div>
                  <p className="text-2xl font-bold" style={getNameColorStyle(profile.equippedNameColorId)}>{profile.displayName}</p>
                  <p className="mt-1 text-sm text-textMuted">@{profile.handle}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Gems</p>
              <p className="mt-1 text-xl font-bold">{profile.gems}</p>
            </div>
          </Card>

          <SectionNav
            ariaLabel="Market categories"
            activeId={marketSection}
            onChange={(section) => {
              setMarketSection(section);
              document.getElementById(`market-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            items={[ { id: "nameplates", label: "Nameplates" }, { id: "borders", label: "Borders" }, { id: "banners", label: "Banners" }, { id: "cards", label: "Cards" }, { id: "themes", label: "Themes" } ] as const}
          />

          <details id="market-nameplates" open className="scroll-mt-20 space-y-3 rounded-2xl border border-border bg-surfaceAlt/20 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between"><h2 className="text-lg font-semibold">Nameplates</h2><ChevronDown size={18} /></summary>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {NAME_COLOR_OPTIONS.map((option) => {
              const owned = (profile.ownedNameColorIds ?? ["default"]).includes(option.id);
              const equipped = profile.equippedNameColorId === option.id;

              return (
                <Card key={option.id} className="space-y-3 p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: option.color }} />
                    <span className="text-sm font-semibold" style={{ color: option.color }}>{option.name}</span>
                  </div>
                  <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3 text-sm">
                    <p className="font-bold" style={option.animated ? getNameColorStyle(option.id) : { color: option.color }}>{profile.displayName}</p>
                  </div>
                  <Button
                    className="w-full"
                    variant={equipped ? "secondary" : "primary"}
                    disabled={equipped}
                    onClick={() => void buyNameColor(option.id)}
                  >
                    {equipped ? "Equipped" : owned ? "Equip" : `Buy for ${option.price}`}
                  </Button>
                </Card>
              );
            })}
          </div>
          </details>

          <details id="market-borders" open className="scroll-mt-20 space-y-3 rounded-2xl border border-border bg-surfaceAlt/20 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between"><h2 className="text-lg font-semibold">Profile Borders</h2><ChevronDown size={18} /></summary>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {PROFILE_BORDER_OPTIONS.map((option) => {
                const owned = (profile.ownedProfileBorderIds ?? ["border-none"]).includes(option.id);
                const equipped = profile.equippedProfileBorderId === option.id;

                return (
                  <Card key={option.id} className="space-y-4 p-4">
                    <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-surfaceAlt/30 p-5 text-center">
                      <Avatar
                        name={profile.displayName}
                        src={profile.photoURL}
                        className="h-20 w-20 rounded-[1.25rem]"
                        borderId={option.id}
                      />
                      <p className="font-semibold">{option.name}</p>
                    </div>
                    <Button
                      className="w-full"
                      variant={equipped ? "secondary" : "primary"}
                      disabled={equipped}
                      onClick={() => void buyProfileBorder(option.id)}
                    >
                      {equipped ? "Equipped" : owned ? "Equip" : `Buy for ${option.price}`}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </details>

          <details id="market-banners" open className="scroll-mt-20 space-y-3 rounded-2xl border border-border bg-surfaceAlt/20 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between"><h2 className="text-lg font-semibold">Banner Colors</h2><ChevronDown size={18} /></summary>
            <p className="text-sm text-textMuted">Choose from 20 premium banner colors plus five free starter colors.</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {bannerColorOptions.map((option) => {
                const owned = (profile.ownedBannerColorIds ?? defaultBannerColorIds).includes(option.id);
                const equipped = profile.bannerColor === option.value;
                return <Card key={option.id} className="space-y-3 p-4">
                  <div className="h-20 rounded-2xl border border-border" style={{ background: option.value }} />
                  <p className="font-semibold">{option.name}</p>
                  <Button className="w-full" variant={equipped ? "secondary" : "primary"} disabled={equipped} onClick={() => void buyBannerColor(option.id)}>{equipped ? "Equipped" : owned ? "Equip" : `Buy for ${option.price}`}</Button>
                </Card>;
              })}
            </div>
          </details>

          <details id="market-cards" open className="scroll-mt-20 space-y-3 rounded-2xl border border-border bg-surfaceAlt/20 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between"><h2 className="text-lg font-semibold">Profile Cards</h2><ChevronDown size={18} /></summary>
            <p className="text-sm text-textMuted">Used on profiles, @ mention popups, and leaderboard cards.</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {PROFILE_CARD_OPTIONS.map((option) => {
                const owned = (profile.ownedProfileCardIds ?? ["card-default"]).includes(option.id);
                const equipped = profile.equippedProfileCardId === option.id;
                return <Card key={option.id} className="space-y-3 p-4" style={{ background: option.background, color: option.text }}>
                  <div><p className="font-semibold">{option.name}</p><p className="mt-1 text-xs" style={{ color: option.mutedText ?? option.text }}>{option.description}</p></div>
                  <div className="rounded-2xl border border-border/70 bg-black/10 p-3"><p className="font-semibold" style={getNameColorStyle(profile.equippedNameColorId)}>{profile.displayName}</p><p className="text-xs" style={{ color: option.mutedText ?? option.text }}>@{profile.handle}</p></div>
                  <Button className="w-full" variant={equipped ? "secondary" : "primary"} disabled={equipped} onClick={() => void buyProfileCard(option.id)}>{equipped ? "Equipped" : owned ? "Equip" : `Buy for ${option.price}`}</Button>
                </Card>;
              })}
            </div>
          </details>

          <div id="market-themes" className="scroll-mt-20 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Themes</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {themeOptions.map((option) => {
                const owned = getOwnedThemeIds(profile).includes(option.id);
                const equipped = profile.theme === option.id;

                return (
                  <Card key={option.id} className="space-y-4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{option.label}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-4 w-4 rounded-full border border-border" style={{ background: option.tokens.background }} />
                        <span className="h-4 w-4 rounded-full border border-border" style={{ background: option.tokens.surface }} />
                        <span className="h-4 w-4 rounded-full border border-border" style={{ background: option.tokens.accent }} />
                      </div>
                    </div>
                    <div
                      className="rounded-3xl border p-4"
                      style={{
                        background: option.tokens.background,
                        borderColor: option.tokens.border,
                        color: option.tokens.text,
                      }}
                    >
                      <p className="font-semibold" style={{ color: option.tokens.text }}>{profile.displayName}</p>
                      <p className="text-sm" style={{ color: option.tokens.textMuted }}>@{profile.handle}</p>
                      <div className="mt-3 h-2 rounded-full" style={{ background: option.tokens.surfaceAlt }}>
                        <div className="h-2 w-2/3 rounded-full" style={{ background: option.tokens.accent }} />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      variant={equipped ? "secondary" : "primary"}
                      disabled={equipped}
                      onClick={() => void buyTheme(option.id)}
                    >
                      {equipped ? "Equipped" : owned ? "Equip" : `Buy for ${option.price}`}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

const CRYPTO_COINS: Array<{
  id: CryptoCoinId;
  name: string;
  shortLabel: string;
  accent: string;
  cardTone: string;
  description: string;
  icon: typeof Gem;
}> = [
  { id: "wutax", name: "Wutax Coin", shortLabel: "WTX", accent: "#f97316", cardTone: "from-orange-500/20 to-amber-500/10", description: "Volatile meme-energy momentum with sharp intraday swings.", icon: CircleDollarSign },
  { id: "galaxy", name: "Galaxy Coin", shortLabel: "GLX", accent: "#60a5fa", cardTone: "from-sky-500/20 to-indigo-500/10", description: "Big-cap social token with steadier orbit-like movement.", icon: Orbit },
  { id: "arc", name: "Arc", shortLabel: "ARC", accent: "#f472b6", cardTone: "from-pink-500/20 to-fuchsia-500/10", description: "Fast reaction coin with dramatic sentiment spikes.", icon: Zap },
  { id: "nebula", name: "Nebula Coin", shortLabel: "NEB", accent: "#a78bfa", cardTone: "from-violet-500/20 to-purple-500/10", description: "Cloudy mid-cap asset that drifts before snapping higher or lower.", icon: Sparkles },
  { id: "spark", name: "Spark", shortLabel: "SPK", accent: "#34d399", cardTone: "from-emerald-500/20 to-teal-500/10", description: "Utility-style coin with smaller but frequent moves.", icon: Star },
  { id: "lumen", name: "Lumen", shortLabel: "LMN", accent: "#facc15", cardTone: "from-yellow-500/20 to-lime-500/10", description: "Light-driven growth token with bright momentum swings.", icon: Sparkles },
  { id: "titan", name: "Titan", shortLabel: "TTN", accent: "#94a3b8", cardTone: "from-slate-400/20 to-cyan-500/10", description: "High-value infrastructure coin built for slower, heavier moves.", icon: CircleDollarSign },
];

export function CryptoPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(users[0]);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [market, setMarket] = useState<CryptoMarketState>(() => createInitialCryptoMarketState());
  const [buyAmounts, setBuyAmounts] = useState<Record<CryptoCoinId, number>>({ wutax: 10, galaxy: 10, arc: 10, nebula: 10, spark: 10, lumen: 10, titan: 10 });
  const [sellAmounts, setSellAmounts] = useState<Record<CryptoCoinId, number>>({ wutax: 0, galaxy: 0, arc: 0, nebula: 0, spark: 0, lumen: 0, titan: 0 });
  const [isModeratorPanelOpen, setIsModeratorPanelOpen] = useState(false);
  const [isModeratorResetsOpen, setIsModeratorResetsOpen] = useState(false);
  const [purchasedCoinId, setPurchasedCoinId] = useState<CryptoCoinId | null>(null);
  const gems = profile?.gems ?? 0;
  const holdings = profile?.coinHoldings ?? { wutax: 0, galaxy: 0, arc: 0, nebula: 0, spark: 0, lumen: 0, titan: 0 };
  const isModerator = profile?.isModerator ?? false;

  useEffect(() => {
    if (!user) {
      setProfile(users[0]);
      return;
    }

    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  useEffect(() => {
    return subscribeToCryptoMarket(setMarket);
  }, []);

  const invest = async (coinId: CryptoCoinId, gemAmount: number) => {
    if (!user || pendingActionId) {
      return;
    }

    setPendingActionId(`${coinId}-${gemAmount}`);
    try {
      const roundedGemAmount = Number(gemAmount.toFixed(2));
      const result = await executeCoinPurchase(user.uid, coinId, roundedGemAmount);
      setPurchasedCoinId(coinId);
      window.setTimeout(() => setPurchasedCoinId((current) => current === coinId ? null : current), 800);
      toast.success("Investment confirmed", {
        description: `-${roundedGemAmount.toFixed(2)} gems invested for ${result.coinAmount.toFixed(2)} ${CRYPTO_COINS.find((coin) => coin.id === coinId)?.shortLabel}`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place that investment.");
    } finally {
      setPendingActionId(null);
    }
  };

  const sell = async (coinId: CryptoCoinId, coinAmount: number) => {
    if (!user || pendingActionId || coinAmount <= 0) {
      return;
    }

    setPendingActionId(`${coinId}-sell-${coinAmount}`);
    try {
      const result = await executeCoinSale(user.uid, coinId, coinAmount);
      if (result.profit > 0) {
        const xpReward = Math.min(CRYPTO_SALE_XP_CAP, Math.max(2, Math.floor(result.profit / 25)));
        await addXpToUser(user.uid, xpReward);
      }
      toast.success("Sale confirmed", { description: `+${result.gemValue.toFixed(2)} gems from ${CRYPTO_COINS.find((coin) => coin.id === coinId)?.name}` });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not complete that sale.");
    } finally {
      setPendingActionId(null);
    }
  };

  const moderateCoin = async (coinId: CryptoCoinId, direction: 1 | -1) => {
    if (!isModerator) {
      return;
    }

    await moderateCryptoMarket(coinId, direction);
  };

  const runModeratorReset = async (type: "gems" | "crypto") => {
    if (!isModerator || pendingActionId) {
      return;
    }

    const confirmationText = type === "gems"
      ? "Reset every user's gems to 500?"
      : "Reset all user crypto holdings to zero?";
    if (!window.confirm(confirmationText)) {
      return;
    }

    setPendingActionId(`moderator-${type}`);
    try {
      if (type === "gems") {
        await resetAllGems();
        toast.success("All gems reset", { description: "Every user now has 500 gems." });
      } else {
        await resetAllCrypto();
        toast.success("All crypto reset", { description: "Every user's coin holdings were cleared." });
      }
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setPendingActionId(null);
    }
  };

  const totalPortfolioValue = CRYPTO_COINS.reduce((sum, coin) => sum + holdings[coin.id] * market.coins[coin.id].currentValue, 0);

  return (
    <PageFrame title="Crypto" subtitle="Track the market, move gems in and out, and catch the 10-minute swings." titleIcon={Gem}>
      <div className="space-y-5">
        {isModerator ? (
          <Card className="space-y-3 p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-surfaceAlt/30 px-4 py-3 text-left"
              onClick={() => setIsModeratorPanelOpen((current) => !current)}
            >
              <span className="inline-flex items-center gap-2 font-semibold"><Hammer size={16} /> Moderator panel</span>
              {isModeratorPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isModeratorPanelOpen ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  {CRYPTO_COINS.map((coin) => (
                    <div key={`moderate-${coin.id}`} className="rounded-2xl border border-border bg-surfaceAlt/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: coin.accent }}><coin.icon size={16} />{coin.name}</p>
                        <span className="text-sm font-semibold tabular-nums">{market.coins[coin.id].currentValue.toFixed(2)}</span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Button variant="secondary" className="w-full" onClick={() => moderateCoin(coin.id, 1)}>Buff +5%</Button>
                        <Button variant="secondary" className="w-full" onClick={() => moderateCoin(coin.id, -1)}>Nerf -5%</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-border bg-surfaceAlt/20 p-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left text-sm font-semibold"
                    onClick={() => setIsModeratorResetsOpen((current) => !current)}
                  >
                    <span>Reset tools</span>
                    {isModeratorResetsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isModeratorResetsOpen ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Button variant="secondary" className="w-full" disabled={pendingActionId !== null} onClick={() => void runModeratorReset("gems")}>
                        Reset all gems to 500
                      </Button>
                      <Button variant="secondary" className="w-full" disabled={pendingActionId !== null} onClick={() => void runModeratorReset("crypto")}>
                        Reset all crypto
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}

        <Card className="grid gap-3 p-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-textMuted"><Gem size={16} /> Available gems</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{formatAmount(gems)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-textMuted"><Sparkles size={16} /> Coins held</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{formatAmount(Object.values(holdings).reduce((sum, amount) => sum + amount, 0))}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-textMuted"><Globe2 size={16} /> Portfolio value</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{totalPortfolioValue.toFixed(2)}</p>
          </div>
        </Card>

        <div className="space-y-4">
          {CRYPTO_COINS.map((coin) => {
            const coinMarket = market.coins[coin.id];
            const minValue = Math.min(...coinMarket.history);
            const maxValue = Math.max(...coinMarket.history);
            const holdingsValue = holdings[coin.id] * coinMarket.currentValue;
            const chartDelta = ((coinMarket.currentValue - coinMarket.history[0]) / coinMarket.history[0]) * 100;
            const buyAmount = Math.min(buyAmounts[coin.id], Math.max(gems, 0.01));
            const sellAmount = Math.min(sellAmounts[coin.id], holdings[coin.id]);
            const sellGemValue = Number((sellAmount * coinMarket.currentValue).toFixed(2));
            const buyCoinAmount = Number((buyAmount / coinMarket.currentValue).toFixed(2));
            const chartStroke = chartDelta >= 0 ? "#4ade80" : "#f87171";

            return (
              <Card key={coin.id} className={`space-y-4 border border-border bg-surface p-5 ${purchasedCoinId === coin.id ? "crypto-purchase-flash" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: coin.accent }}><coin.icon size={16} />{coin.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-textMuted">{coin.shortLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Value</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums">{coinMarket.currentValue.toFixed(2)}</p>
                    <p className={`mt-1 text-xs font-semibold ${chartDelta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {chartDelta >= 0 ? "+" : ""}{chartDelta.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-surfaceAlt/45 p-4">
                  <div className="relative h-28 overflow-hidden rounded-2xl border border-border/70 bg-surface/40 px-3 py-2">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_24%,rgba(255,255,255,0.04)_25%,transparent_26%,transparent_49%,rgba(255,255,255,0.04)_50%,transparent_51%,transparent_74%,rgba(255,255,255,0.04)_75%,transparent_76%)]" />
                    <div className="flex h-full items-end gap-0">
                      {coinMarket.history.flatMap((point, index, history) => {
                        const previousPoint = coinMarket.history[Math.max(0, index - 1)] ?? point;
                        const barColor = point >= previousPoint ? "#4ade80" : "#f87171";
                        const normalizedHeightPx = maxValue === minValue ? 52 : 18 + ((point - minValue) / (maxValue - minValue)) * 58;
                        const wickHeightPx = Math.min(88, normalizedHeightPx + 10);
                        const bars = [
                          <div key={`${coin.id}-${index}`} className="relative flex-1 self-end px-[0.5px]">
                            <div
                              className="absolute bottom-0 left-1/2 w-px -translate-x-1/2 rounded-full"
                              style={{ height: `${wickHeightPx}px`, background: `${barColor}88` }}
                            />
                            <div
                              className="w-full rounded-t-[1px]"
                              style={{
                                height: `${normalizedHeightPx}px`,
                                background: `linear-gradient(180deg, ${barColor}cc 0%, ${barColor} 100%)`,
                                boxShadow: `0 0 10px ${barColor}33`,
                              }}
                            />
                          </div>
                        ];
                        if (index < history.length - 1) {
                          const midpoint = Number(((point + history[index + 1]) / 2).toFixed(2));
                          const midpointColor = midpoint >= point ? "#4ade80" : "#f87171";
                          const midpointHeightPx = maxValue === minValue ? 48 : 16 + ((midpoint - minValue) / (maxValue - minValue)) * 52;
                          bars.push(
                            <div key={`${coin.id}-${index}-mid`} className="relative flex-1 self-end px-[0.5px]">
                              <div
                                className="w-full rounded-t-[1px]"
                                style={{
                                  height: `${midpointHeightPx}px`,
                                  background: `${midpointColor}99`,
                                  boxShadow: `0 0 8px ${midpointColor}22`,
                                }}
                              />
                            </div>,
                          );
                        }
                        return bars;
                      })}
                    </div>
                  </div>
                <div className="rounded-[1.5rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Your position</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-surface px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-textMuted">Holding</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">{formatAmount(holdings[coin.id])} {coin.shortLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-textMuted">Value</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">{formatAmount(holdingsValue)} gems</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-textMuted">Trend</p>
                      <p className={`mt-1 text-sm font-semibold tabular-nums ${chartDelta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{chartDelta >= 0 ? "+" : ""}{formatAmount(chartDelta)}%</p>
                    </div>
                  </div>
                </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-surfaceAlt/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Buy</p>
                      <span className="text-sm font-semibold tabular-nums">{buyAmount.toFixed(2)} gems</span>
                    </div>
                    <input
                      type="range"
                      min={0.01}
                      max={Math.max(gems, 0.01)}
                      step={0.01}
                      value={buyAmount}
                      disabled={!user || gems < 0.01}
                      onChange={(event) => {
                        const nextAmount = Number(event.target.value);
                        setBuyAmounts((current) => ({ ...current, [coin.id]: nextAmount }));
                      }}
                      className="mt-4 h-3 w-full cursor-pointer appearance-none rounded-full border border-white/10 bg-surfaceAlt shadow-inner shadow-black/30"
                      style={{ accentColor: chartStroke }}
                    />
                    <Button
                      className="mt-4 w-full"
                      disabled={!user || pendingActionId !== null || gems < 0.01}
                      onClick={() => void invest(coin.id, buyAmount)}
                    >
                      {pendingActionId === `${coin.id}-${buyAmount}` ? "Buying..." : `Buy ${buyCoinAmount.toFixed(2)} ${coin.shortLabel}`}
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-border bg-surfaceAlt/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Sell</p>
                      <span className="text-sm font-semibold tabular-nums">{sellAmount.toFixed(2)} coins</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(holdings[coin.id], 0)}
                      step={0.01}
                      value={sellAmount}
                      disabled={!user || holdings[coin.id] < 0.01}
                      onChange={(event) => {
                        const nextAmount = Number(event.target.value);
                        setSellAmounts((current) => ({ ...current, [coin.id]: nextAmount }));
                      }}
                      className="mt-4 h-3 w-full cursor-pointer appearance-none rounded-full border border-white/10 bg-surfaceAlt shadow-inner shadow-black/30"
                      style={{ accentColor: chartStroke }}
                    />
                    <Button
                      variant="secondary"
                      className="mt-4 w-full"
                      disabled={!user || pendingActionId !== null || sellAmount < 0.01}
                      onClick={() => void sell(coin.id, sellAmount)}
                    >
                      {pendingActionId === `${coin.id}-sell-${sellAmount}` ? "Selling..." : `Sell ${sellAmount.toFixed(2)} for ${sellGemValue.toFixed(2)}`}
                    </Button>
                  </div>
                </div>

              </Card>
            );
          })}
        </div>
      </div>
    </PageFrame>
  );
}

export function ShopPage() {
  return (
    <PageFrame title="Shop" subtitle="Cosmetic-only purchases with credits. Achievement badges remain earnable, never purchasable.">
      <Card className="grid gap-4 p-6 md:grid-cols-2">
        {shopItems.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border p-4">
            <p className="font-semibold">{item.name}</p>
            <p className="text-sm text-textMuted">{item.description}</p>
            <p className="mt-2 text-sm">{item.price} credits</p>
          </div>
        ))}
      </Card>
    </PageFrame>
  );
}

export function LeaderboardPage() {
  const navigate = useNavigate();
  const [leaderboardTab, setLeaderboardTab] = useState<"level" | "gems" | "posts" | "followers">("level");
  const [leaders, setLeaders] = useState(users);
  const [allPosts, setAllPosts] = useState<Post[]>([]);

  useEffect(() => subscribeToPosts(setAllPosts), []);
  useEffect(() => {
    if (leaderboardTab === "level") {
      return subscribeToXpLeaderboard(setLeaders);
    }

    if (leaderboardTab === "posts") {
      return subscribeToUserProfiles((profiles) => {
        const postCounts = allPosts.reduce<Record<string, number>>((accumulator, post) => {
          accumulator[post.authorId] = (accumulator[post.authorId] ?? 0) + 1;
          return accumulator;
        }, {});
        const profileMap = new Map<string, UserProfile>();

        [...users, ...profiles].forEach((profile) => {
          profileMap.set(profile.uid, profile);
        });

        setLeaders(
          Array.from(profileMap.values())
            .map((profile) => ({
              ...profile,
              postCount: postCounts[profile.uid] ?? 0,
            }))
            .sort((left, right) => right.postCount - left.postCount)
            .slice(0, 20),
        );
      });
    }

    return subscribeToUserLeaderboard(leaderboardTab === "gems" ? "gems" : leaderboardTab === "followers" ? "followerCount" : "postCount", setLeaders);
  }, [allPosts, leaderboardTab]);

  const metricLabel = leaderboardTab === "level" ? "Level" : leaderboardTab === "gems" ? "Gems" : leaderboardTab === "followers" ? "Followers" : "Posts";

  return (
    <PageFrame title="Leaderboard" subtitle="Switch between the top level, top gems, and top posts leaders.">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLeaderboardTab("level")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${leaderboardTab === "level" ? "bg-accent text-white" : "border border-border bg-surface text-textMuted"}`}
          >
            Top level
          </button>
          <button
            type="button"
            onClick={() => setLeaderboardTab("gems")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${leaderboardTab === "gems" ? "bg-accent text-white" : "border border-border bg-surface text-textMuted"}`}
          >
            Top gems
          </button>
          <button
            type="button"
            onClick={() => setLeaderboardTab("posts")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${leaderboardTab === "posts" ? "bg-accent text-white" : "border border-border bg-surface text-textMuted"}`}
          >
            Top posts
          </button>
          <button
            type="button"
            onClick={() => setLeaderboardTab("followers")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${leaderboardTab === "followers" ? "bg-accent text-white" : "border border-border bg-surface text-textMuted"}`}
          >
            Top followers
          </button>
        </div>
        {leaders.map((leader, index) => {
          const metricValue = leaderboardTab === "level" ? leader.level : leaderboardTab === "gems" ? leader.gems : leaderboardTab === "followers" ? leader.followerCount : leader.postCount;

          return (
            <div key={leader.uid} className="rounded-3xl">
            <Card className="overflow-hidden border border-border p-0" style={{ background: getProfileCardStyle(leader.equippedProfileCardId).background, color: getProfileCardStyle(leader.equippedProfileCardId).text }}>
              <div className="h-24 w-full" style={formatBannerStyle(leader)} />
              <div className="relative p-5">
                <div className="absolute -top-8 left-5 flex h-16 w-16 items-center justify-center rounded-[1.75rem] border-4 border-canvas bg-canvas">
                  <Avatar
                    name={leader.displayName}
                    src={leader.photoURL}
                    className="h-full w-full rounded-[1.2rem]"
                    borderId={leader.equippedProfileBorderId}
                  />
                </div>
                <div className="flex items-start justify-between gap-4 pt-10">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[color:var(--accent)]/15 px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">
                        #{index + 1}
                      </span>
                      {index === 0 ? <Crown size={16} className="text-[color:var(--accent)]" /> : null}
                      <button
                        type="button"
                        className="truncate text-left text-lg font-semibold hover:underline"
                        onClick={() => navigate(`/profile/${leader.handle}`)}
                      >
                        <span style={getNameColorStyle(leader.equippedNameColorId)}>{leader.displayName}</span>
                      </button>
                    </div>
                    <p className="mt-1 text-sm" style={{ color: getProfileCardStyle(leader.equippedProfileCardId).mutedText }}>{`@${leader.handle}`}</p>
                    <p className="mt-2 line-clamp-2 text-sm" style={{ color: getProfileCardStyle(leader.equippedProfileCardId).mutedText }}>{leader.bio || "No bio yet."}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface/80 px-4 py-3 text-right backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-textMuted">{metricLabel}</p>
                    <p className="mt-1 text-2xl font-bold">{metricValue}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-textMuted">
                  <span>{leader.followerCount} followers</span>
                  <span>{leader.postCount} posts</span>
                  <span>{leader.isPremium ? "Premium" : "Standard"}</span>
                </div>
              </div>
            </Card>
            </div>
          );
        })}
      </div>
    </PageFrame>
  );
}

export function AboutPage() {
  return <PageFrame title="About PulseArc" subtitle="Coming soon. PulseArc is an original social sandbox built around playful progression, healthier engagement loops, and portfolio-ready Firebase architecture." />;
}

export function NotFoundPage() {
  return <PageFrame title="Page Not Found" subtitle="The route does not exist in this demo." />;
}
