import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Bell, Check, ChevronDown, ChevronUp, CircleDollarSign, Clock3, Crown, Gem, Globe2, Hammer, ImagePlus, Lock, MapPin, MessageCircle, Orbit, Palette, Search, Send, Sparkles, Star, Trash2, TriangleAlert, Unlock, UserPlus, Zap } from "lucide-react";
import { deleteDoc, doc, increment, updateDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { Card } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { XpProgress } from "@/components/gamification/xp-progress";
import { SlotMachine } from "@/components/gamification/slot-machine";
import { CoinToss } from "@/components/gamification/coin-toss";
import { DiceGame } from "@/components/gamification/dice-game";
import { conversations, messages, shopItems, users } from "@/lib/demo-data";
import { bannerPresets } from "@/lib/banner-presets";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/firebase/auth";
import { useAuth } from "@/app/auth-provider";
import { addGemsToUser, addXpToUser, ensureUserProfile, getDemoUserByHandle, investGemsInCoin, isHandleAvailable, sellCoinForGems, subscribeToUserLeaderboard, subscribeToUserProfileByHandle, subscribeToUserProfileById, subscribeToUserProfiles, subscribeToXpLeaderboard, updateUserProfile } from "@/firebase/users";
import { changeUserPassword, linkGoogleAccount, updateDisplayName, uploadProfileBanner, uploadProfilePicture } from "@/firebase/auth";
import { deletePostCascade, subscribeToPosts, subscribeToPostsByAuthor } from "@/firebase/posts";
import { InlineEntities } from "@/components/common/inline-entities";
import { Avatar } from "@/components/common/avatar";
import { setFollowingRelationship, subscribeToFollowerIds, subscribeToFollowCounts, subscribeToFollowRelationship, subscribeToFollowingIds } from "@/firebase/follows";
import { useUiStore } from "@/store/use-ui-store";
import { getXpProgress } from "@/constants/gamification";
import { getNameColorStyle, getNameColorValue, NAME_COLOR_OPTIONS } from "@/constants/name-colors";
import { PROFILE_BORDER_OPTIONS, getProfileBorderStyle } from "@/constants/profile-borders";
import { themePresets } from "@/lib/theme-presets";
import { readCache, writeCache } from "@/lib/persistent-cache";
import { banUserAccount, resetAllCrypto, resetAllGems } from "@/firebase/functions";
import { createInitialCryptoMarketState, moderateCryptoMarket, subscribeToCryptoMarket, type CryptoMarketState, updateCryptoMarketForTrade } from "@/firebase/crypto-market";
import { subscribeToBookmarkedPosts } from "@/firebase/bookmarks";
import { markAllNotificationsRead, markNotificationRead, subscribeToNotifications } from "@/firebase/notifications";
import { UserBadges } from "@/components/common/user-badges";
import { PostCard } from "@/components/posts/post-card";
import { PostComposer } from "@/components/posts/post-composer";
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
const BASE_DAILY_GEM_REWARD = 25;
const PREMIUM_DAILY_GEM_MULTIPLIER = 2;
const FREE_THEME_IDS: ThemeMode[] = ["graphite", "mist"];
const THEME_MARKET_PRICES: Record<ThemeMode, number> = {
  graphite: 0,
  mist: 0,
  oled: 1400,
  aurora: 1800,
  nordic: 2200,
  synthwave: 2600,
  solarizedLight: 3000,
  midnightRose: 3400,
  lagoon: 3600,
  sunsetClub: 3800,
  citrusPunch: 4100,
  polarNight: 4300,
  roseQuartz: 4500,
  acidWash: 4700,
  emberDusk: 4900,
};

function getOwnedThemeIds(profile: Pick<UserProfile, "ownedThemeIds" | "theme">) {
  return [...new Set([...(profile.ownedThemeIds ?? FREE_THEME_IDS), profile.theme, ...FREE_THEME_IDS])];
}

function getDailyGemReward(isPremium: boolean) {
  return BASE_DAILY_GEM_REWARD * (isPremium ? PREMIUM_DAILY_GEM_MULTIPLIER : 1);
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [queryText, setQueryText] = useState("");
  const [feedSort, setFeedSort] = useState<"recent" | "stars" | "comments">("recent");

  useEffect(() => subscribeToPosts(setPosts), []);
  useEffect(() => subscribeToUserProfiles(setProfiles), []);

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
    return filteredPosts.reduce<Record<string, string | null>>((accumulator, post) => {
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
  }, [filteredPosts, postLookup, profiles]);
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">People</p>
            <p className="text-sm text-textMuted">Open a profile directly from search results.</p>
          </div>
          <span className="text-xs text-textMuted">{filteredProfiles.length} result{filteredProfiles.length === 1 ? "" : "s"}</span>
        </div>
        {filteredProfiles.length ? (
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
        ) : (
          <div className="rounded-3xl border border-dashed border-border p-5 text-sm text-textMuted">No users matched that search yet.</div>
        )}
      </Card>

      <div className="space-y-4">
        {sortedPosts.length ? sortedPosts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            replyContextLabel={replyContextLabels[post.id]}
            priority={index < 3 ? "high" : "normal"}
          />
        )) : (
          <Card className="p-6 text-sm text-textMuted">No posts matched that search yet.</Card>
        )}
      </div>
    </PageFrame>
  );
}

export function ProfilePage() {
  const { handle } = useParams();
  const currentUserHandle = auth.currentUser?.email?.split("@")[0] ?? "";
  const currentUserId = auth.currentUser?.uid ?? "";
  const [user, setUser] = useState(() => (handle ? users.find((profile) => profile.handle === handle) ?? null : null));
  const isOwnProfile = Boolean(user && (handle === currentUserHandle || user.uid === currentUserId));
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: user?.followerCount ?? 0, following: user?.followingCount ?? 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsViewer, setFollowsViewer] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [allUserPosts, setAllUserPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [profileTab, setProfileTab] = useState<"posts" | "replies" | "stats">("posts");
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [parentAuthors, setParentAuthors] = useState<Record<string, (typeof users)[number] | null>>({});
  const [followModalTab, setFollowModalTab] = useState<"followers" | "following" | null>(null);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followProfiles, setFollowProfiles] = useState<Record<string, UserProfile | null>>({});
  const [isEditingGems, setIsEditingGems] = useState(false);
  const [gemInput, setGemInput] = useState("");
  const [market, setMarket] = useState<CryptoMarketState>(() => createInitialCryptoMarketState());

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
    if (!user?.uid) {
      setAllUserPosts([]);
      return;
    }

    return subscribeToPostsByAuthor(user.uid, setAllUserPosts);
  }, [user?.uid]);

  useEffect(() => subscribeToPosts(setAllPosts), []);

  useEffect(() => {
    if (!user?.uid) {
      setLeaderboardRank(null);
      return;
    }

    return subscribeToXpLeaderboard((leaders) => {
      const rank = leaders.findIndex((leader) => leader.uid === user.uid);
      setLeaderboardRank(rank >= 0 ? rank + 1 : null);
    });
  }, [user?.uid]);

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
  const isMutual = isFollowing && followsViewer;
  const canViewPosts = !user?.isPrivate || isOwnProfile || isMutual;

  useEffect(() => {
    if (!userReplies.length) {
      setParentAuthors({});
      return;
    }

    const nextParentAuthors = userReplies.reduce<Record<string, (typeof users)[number] | null>>((accumulator, reply) => {
      const parentPost = allPosts.find((candidate) => candidate.id === reply.parentPostId);
      accumulator[reply.id] = parentPost ? users.find((candidate) => candidate.uid === parentPost.authorId) ?? null : null;
      return accumulator;
    }, {});

    setParentAuthors(nextParentAuthors);
  }, [allPosts, userReplies]);

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

  const visibleFollowProfiles = useMemo(
    () => visibleFollowIds.map((profileId) => followProfiles[profileId]).filter((profile): profile is UserProfile => Boolean(profile)),
    [followProfiles, visibleFollowIds],
  );
  const timeoutLabel = getTimeoutRemainingLabel(user?.timeoutUntil);
  const canModerateGems = Boolean(user && currentUserId && currentUserId !== user.uid);

  if (!user) {
    return (
      <PageFrame title="Profile not found" subtitle="This profile is not available in the current demo dataset.">
        <Card className="p-6 text-sm text-textMuted">We could not find a profile for @{handle ?? "unknown"}.</Card>
      </PageFrame>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl p-px" style={user.equippedProfileBorderId && user.equippedProfileBorderId !== "border-none" ? getProfileBorderStyle(user.equippedProfileBorderId) : undefined}>
      <Card className="overflow-hidden border border-border p-0">
        <div className="h-36 w-full sm:h-44" style={formatBannerStyle(user)} />
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-end gap-4">
              <div className="-mt-16 shrink-0 rounded-[1.75rem] border-4 border-canvas bg-canvas sm:-mt-20">
                <Avatar
                  name={user.displayName}
                  src={user.photoURL}
                  className="h-20 w-20 rounded-3xl sm:h-24 sm:w-24"
                />
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="min-w-0 text-2xl font-bold" style={getNameColorStyle(user.equippedNameColorId)}>{user.displayName}</p>
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
                    {currentUserId && !isOwnProfile ? <ModeratorTimeoutButton targetUserId={user.uid} /> : null}
                    {currentUserId && !isOwnProfile ? <ModeratorBanButton targetUserId={user.uid} /> : null}
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
              <div className="rounded-2xl border border-border bg-surfaceAlt/50 px-3 py-2">
                <p className="text-xs text-textMuted">Gems</p>
                {isEditingGems ? (
                  <div className="mt-2 space-y-2">
                    <input
                      type="number"
                      value={gemInput}
                      onChange={(event) => setGemInput(event.target.value)}
                      className="w-full rounded-2xl border border-border bg-transparent px-3 py-2 text-sm outline-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          const nextValue = Number(Math.max(0, Number(gemInput)).toFixed(2));
                          if (!Number.isFinite(nextValue)) {
                            toast.error("Enter a valid gem amount.");
                            return;
                          }

                          try {
                            await updateUserProfile(user.uid, { gems: nextValue });
                            toast.success("Gems updated");
                            setIsEditingGems(false);
                          } catch (error) {
                            toast.error(getFirebaseErrorMessage(error));
                          }
                        }}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setIsEditingGems(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`mt-1 inline-flex items-center gap-1 font-semibold ${canModerateGems ? "hover:text-[color:var(--accent)]" : ""}`}
                    onClick={() => {
                      if (!canModerateGems) {
                        return;
                      }
                      setGemInput(String(user.gems));
                      setIsEditingGems(true);
                    }}
                  >
                    <Gem size={14} /> {user.gems.toFixed(2)}
                  </button>
                )}
              </div>
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
            <XpProgress xp={user.xp} level={user.level} />
          </div>
        </div>
      </Card>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setProfileTab("posts")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${profileTab === "posts" ? "bg-accent text-white" : "border border-border bg-surface text-textMuted"}`}
          >
            Posts {userPosts.length}
          </button>
          <button
            type="button"
            onClick={() => setProfileTab("replies")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${profileTab === "replies" ? "bg-accent text-white" : "border border-border bg-surface text-textMuted"}`}
          >
            Replies {userReplies.length}
          </button>
          <button
            type="button"
            onClick={() => setProfileTab("stats")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${profileTab === "stats" ? "bg-accent text-white" : "border border-border bg-surface text-textMuted"}`}
          >
            Profile
          </button>
        </div>

        {!canViewPosts ? (
          <Card className="space-y-2 p-6 text-sm text-textMuted">
            <p className="inline-flex items-center gap-2 font-semibold text-text"><Lock size={16} /> Private profile</p>
            <p>Only mutual follows can view this user&apos;s posts and replies.</p>
          </Card>
        ) : profileTab === "stats" ? (
          <Card className="space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Gems</p>
              <p className="mt-2 text-xl font-semibold tabular-nums">{user.gems.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Liquid value</p>
              <p className="mt-2 text-xl font-semibold tabular-nums">{user.gems.toFixed(2)}</p>
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
              <p className="mt-2 text-xl font-semibold tabular-nums text-emerald-300">+{user.gamblingGains ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Gambling losses</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-rose-300">-{user.gamblingLosses ?? 0}</p>
            </div>
            </div>
            <div className="rounded-2xl border border-border bg-surfaceAlt/35 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-textMuted">Owned coins</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {CRYPTO_COINS.filter((coin) => (user.coinHoldings?.[coin.id] ?? 0) > 0).length ? CRYPTO_COINS.filter((coin) => (user.coinHoldings?.[coin.id] ?? 0) > 0).map((coin) => (
                  <div key={coin.id} className="rounded-2xl border border-border bg-surface px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold" style={{ color: coin.accent }}>{coin.shortLabel}</span>
                      <span className="text-sm tabular-nums">{(user.coinHoldings?.[coin.id] ?? 0).toFixed(2)}</span>
                    </div>
                    <p className="mt-1 text-sm text-textMuted">{coin.name}</p>
                    <p className="mt-2 text-sm font-semibold tabular-nums">{(((user.coinHoldings?.[coin.id] ?? 0) * market.coins[coin.id].currentValue)).toFixed(2)}</p>
                  </div>
                )) : <p className="text-sm text-textMuted">No coins owned yet.</p>}
              </div>
            </div>
          </Card>
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
                replyContextLabel={parentAuthors[reply.id] ? `@${parentAuthors[reply.id]?.handle}` : null}
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

  return (
    <PageFrame title="Settings" subtitle="Appearance, account controls, and release notes live here.">
      <div className="space-y-5">
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Palette size={18} />
            <h2 className="text-lg font-semibold">Appearance</h2>
          </div>
          <div className="grid gap-3">
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
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Account</h2>
          <p className="text-sm text-textMuted">Profile, privacy, and media settings are now managed from the profile editor.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary">Manage profile</Button>
            <Button variant="secondary">Privacy</Button>
            <Button variant="secondary">Notifications</Button>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Changelog</h2>
          <div className="space-y-4">
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
        </Card>
      </div>
    </PageFrame>
  );
}

function AuthShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid min-h-screen max-w-5xl place-items-center px-4 py-10">
      <Card className="w-full max-w-lg space-y-6 p-6">
        <h1 className="text-3xl font-bold">{title}</h1>
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
                    {bannerPresets.slice(0, 5).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBannerColor(preset)}
                        className={`h-12 w-16 rounded-2xl border transition ${bannerColor === preset ? "border-accent ring-2 ring-[color:var(--accent)]/30" : "border-border"}`}
                        style={{ background: preset }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-textMuted">
                    {profile.isPremium ? "Premium users can keep a color banner or upload a banner image." : "Choose one of five banner colors. Banner image upload is premium-only."}
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
        const confirmed = window.confirm("Ban this user? This removes their account, posts, and replies.");
        if (!confirmed) {
          return;
        }

        setIsBanning(true);
        try {
          await banUserAccount(targetUserId);
          toast.success("User banned", { description: "The account and authored content were removed." });
          navigate("/");
        } catch (error) {
          console.error("Failed to ban user", error);
          toast.error(getFirebaseErrorMessage(error));
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
            timeoutUntil: new Date(Date.now() + selected.durationMs).toISOString(),
          });
          toast.success("User timed out", { description: `${selected.label} applied.` });
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
    <AuthShell title="Login">
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            const credential = await signInWithEmail(values.email, values.password);
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
        <input {...form.register("email")} type="email" placeholder="Email" className="w-full rounded-2xl border border-border bg-transparent px-4 py-3" />
        <input {...form.register("password")} type="password" placeholder="Password" className="w-full rounded-2xl border border-border bg-transparent px-4 py-3" />
        {form.formState.errors.email || form.formState.errors.password ? <p className="text-sm text-red-500">Enter a valid email and password.</p> : null}
        <div className="flex gap-3">
          <Button type="submit" className="flex-1">Login</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              try {
                const credential = await signInWithGoogle();
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
            Google
          </Button>
        </div>
        <p className="text-sm text-textMuted">
          No account? <Link className="text-accent" to="/signup">Create one</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    <AuthShell title="Sign Up">
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            const credential = await signUpWithEmail(values.email, values.password, values.displayName);
            await ensureUserProfile(credential.user);
            toast.success("Account created");
            navigate("/");
          } catch (error) {
            console.error("Failed signup", error);
            toast.error("Account creation failed", {
              description: getFirebaseErrorMessage(error),
            });
          }
        })}
      >
        <input {...form.register("displayName")} placeholder="Display name" className="w-full rounded-2xl border border-border bg-transparent px-4 py-3" />
        <input {...form.register("email")} type="email" placeholder="Email" className="w-full rounded-2xl border border-border bg-transparent px-4 py-3" />
        <input {...form.register("password")} type="password" placeholder="Password" className="w-full rounded-2xl border border-border bg-transparent px-4 py-3" />
        <div className="flex gap-3">
          <Button type="submit" className="flex-1">Create account</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              try {
                const credential = await signInWithGoogle();
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
            Google
          </Button>
        </div>
        <p className="text-sm text-textMuted">
          Already have an account? <Link className="text-accent" to="/login">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function OnboardingPage() {
  return <PageFrame title="Onboarding" subtitle="Coming soon. Multi-step setup for avatar, bio, interests, accent color, and starter follows." />;
}

export function PostPage() {
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
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{replyTarget ? "Replying to a comment" : "Add a reply"}</p>
                  <p className="text-sm text-textMuted">
                    {replyTarget
                      ? `Your reply will nest under ${getReplyContextLabel(replyTarget) ?? "this comment"}.`
                      : "Replying here keeps the thread connected to the original post."}
                  </p>
                </div>
                {replyTarget ? (
                  <Button variant="secondary" size="sm" onClick={() => setReplyTargetId(null)}>
                    Clear target
                  </Button>
                ) : null}
              </div>
              <PostComposer
                parentPost={post}
                replyToPost={replyTarget && replyTarget.id !== post.id ? replyTarget : undefined}
                mode="reply"
                onPosted={() => setReplyTargetId(null)}
              />
            </div>
          </Card>
        </div>
      )}
    </PageFrame>
  );
}

export function ChatPage() {
  const { user } = useAuth();
  const userId = user?.uid ?? "demo-user";
  const chatCacheKey = `cache:chat:${userId}`;
  const [chatState, setChatState] = useState<{ conversations: Conversation[]; messages: Message[] }>(() => (
    readCache<{ conversations: Conversation[]; messages: Message[] }>(chatCacheKey) ?? {
      conversations,
      messages,
    }
  ));
  const [activeConversationId, setActiveConversationId] = useState(chatState.conversations[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const activeConversation = chatState.conversations.find((conversation) => conversation.id === activeConversationId) ?? chatState.conversations[0];
  const activeMessages = activeConversation
    ? chatState.messages.filter((message) => message.conversationId === activeConversation.id)
    : [];

  useEffect(() => {
    const nextCacheKey = `cache:chat:${userId}`;
    const cachedChat = readCache<{ conversations: Conversation[]; messages: Message[] }>(nextCacheKey);
    const nextState = cachedChat ?? { conversations, messages };
    setChatState(nextState);
    setActiveConversationId(nextState.conversations[0]?.id ?? "");
  }, [userId]);

  useEffect(() => {
    writeCache(chatCacheKey, chatState);
  }, [chatCacheKey, chatState]);

  const sendMessage = () => {
    if (!activeConversation || !draft.trim()) {
      return;
    }

    const body = draft.trim();
    const createdAt = new Date().toISOString();
    const nextMessage: Message = {
      id: `local-${createdAt}`,
      conversationId: activeConversation.id,
      senderId: userId,
      body,
      createdAt,
    };

    setChatState((current) => ({
      conversations: current.conversations.map((conversation) => (
        conversation.id === activeConversation.id
          ? { ...conversation, lastMessage: body, updatedAt: createdAt, unreadCount: 0 }
          : conversation
      )),
      messages: [...current.messages, nextMessage],
    }));
    setDraft("");
  };

  return (
    <PageFrame title="Chat" subtitle="One-to-one conversations with persistent local message history.">
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="overflow-hidden p-2">
          {chatState.conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setActiveConversationId(conversation.id)}
              className={`block w-full rounded-lg px-3 py-3 text-left transition ${
                conversation.id === activeConversation?.id ? "bg-surfaceAlt text-text" : "text-textMuted hover:bg-surface"
              }`}
            >
              <span className="block font-semibold">{conversation.title}</span>
              <span className="mt-1 block truncate text-sm">{conversation.lastMessage}</span>
            </button>
          ))}
        </Card>

        <Card className="flex min-h-[520px] flex-col overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">{activeConversation?.title ?? "Messages"}</h2>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {activeMessages.map((message) => {
              const isOwn = message.senderId === userId;
              return (
                <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-lg px-4 py-2 text-sm ${isOwn ? "bg-accent text-white" : "bg-surfaceAlt text-text"}`}>
                    {message.body}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 border-t border-border p-4">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Message"
              className="min-w-0 flex-1 rounded-full border border-border bg-transparent px-4 py-2 text-sm outline-none focus:border-accent"
            />
            <Button type="button" onClick={sendMessage} disabled={!draft.trim()} className="gap-2">
              <Send size={16} />
              Send
            </Button>
          </div>
        </Card>
      </div>
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
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [claimedToday, setClaimedToday] = useState(false);
  const rewardKey = "pulsearc-daily-gems";

  useEffect(() => {
    setClaimedToday(window.localStorage.getItem(rewardKey) === new Date().toDateString());
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  const rewardAmount = getDailyGemReward(profile?.isPremium ?? false);

  return (
    <PageFrame title="Arcade" subtitle="Daily rewards and wager games.">
      <div className="space-y-5">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Daily gem reward</p>
              <p className="text-sm text-textMuted">
                {profile?.isPremium ? `Premium active: +${rewardAmount} gems per day.` : `Claim +${rewardAmount} gems once per day.`}
              </p>
            </div>
            <Button
              variant={claimedToday ? "secondary" : "primary"}
              disabled={claimedToday}
              onClick={async () => {
                if (!user) {
                  return;
                }

                await addGemsToUser(user.uid, rewardAmount);
                window.localStorage.setItem(rewardKey, new Date().toDateString());
                setClaimedToday(true);
                toast.success("Daily gems claimed", { description: `+${rewardAmount} gems added to your account` });
              }}
            >
              {claimedToday ? "Claimed" : `+${rewardAmount} Gems`}
            </Button>
          </div>
        </Card>
        <div className="space-y-5">
          <SlotMachine />
          <CoinToss />
          <DiceGame />
        </div>
      </div>
    </PageFrame>
  );
}

export function MarketPage() {
  const { user } = useAuth();
  const { setTheme } = useUiStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
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

          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Nameplates</h2>
            </div>
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
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Profile Borders</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {PROFILE_BORDER_OPTIONS.map((option) => {
                const owned = (profile.ownedProfileBorderIds ?? ["border-none"]).includes(option.id);
                const equipped = profile.equippedProfileBorderId === option.id;

                return (
                  <Card key={option.id} className="space-y-4 p-4">
                    <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-surfaceAlt/30 p-5 text-center">
                      <div className="rounded-[1.5rem] p-[4px]" style={getProfileBorderStyle(option.id)}>
                        <div className="flex h-20 w-20 items-center justify-center rounded-[1.25rem] bg-surface text-xl font-bold">
                          {profile.displayName.slice(0, 2).toUpperCase()}
                        </div>
                      </div>
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
          </div>

          <div className="space-y-3">
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
];

export function CryptoPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(users[0]);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [market, setMarket] = useState<CryptoMarketState>(() => createInitialCryptoMarketState());
  const [buyAmounts, setBuyAmounts] = useState<Record<CryptoCoinId, number>>({ wutax: 10, galaxy: 10, arc: 10, nebula: 10, spark: 10 });
  const [sellAmounts, setSellAmounts] = useState<Record<CryptoCoinId, number>>({ wutax: 0, galaxy: 0, arc: 0, nebula: 0, spark: 0 });
  const [isModeratorPanelOpen, setIsModeratorPanelOpen] = useState(false);
  const [isModeratorResetsOpen, setIsModeratorResetsOpen] = useState(false);
  const gems = profile?.gems ?? 0;
  const holdings = profile?.coinHoldings ?? { wutax: 0, galaxy: 0, arc: 0, nebula: 0, spark: 0 };
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
      const price = market.coins[coinId].currentValue;
      const roundedGemAmount = Number(gemAmount.toFixed(2));
      const coinAmount = Number((roundedGemAmount / price).toFixed(6));
      await investGemsInCoin(user.uid, coinId, roundedGemAmount, coinAmount);
      await updateCryptoMarketForTrade(coinId, 1, roundedGemAmount);
      toast.success("Investment confirmed", {
        description: `-${roundedGemAmount.toFixed(2)} gems invested into ${CRYPTO_COINS.find((coin) => coin.id === coinId)?.shortLabel}`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place that investment.");
    } finally {
      setPendingActionId(null);
    }
  };

  const sell = async (coinId: CryptoCoinId, coinAmount: number, gemValue: number) => {
    if (!user || pendingActionId || coinAmount <= 0) {
      return;
    }

    setPendingActionId(`${coinId}-sell-${coinAmount}`);
    try {
      const result = await sellCoinForGems(user.uid, coinId, coinAmount, gemValue);
      await updateCryptoMarketForTrade(coinId, -1, gemValue);
      if (result.profit > 0) {
        await addXpToUser(user.uid, Math.max(5, Math.floor(result.profit / 4)));
      }
      toast.success("Sale confirmed", { description: `+${gemValue.toFixed(2)} gems from ${CRYPTO_COINS.find((coin) => coin.id === coinId)?.name}` });
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
            <p className="mt-1 text-2xl font-bold tabular-nums">{gems}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surfaceAlt/40 px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-textMuted"><Sparkles size={16} /> Coins held</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{Object.values(holdings).reduce((sum, amount) => sum + amount, 0)}</p>
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
            const buyCoinAmount = Number((buyAmount / coinMarket.currentValue).toFixed(4));
            const chartStroke = chartDelta >= 0 ? "#4ade80" : "#f87171";

            return (
              <Card key={coin.id} className="space-y-4 border border-border bg-surface p-5">
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
                <div className="rounded-2xl border border-border bg-surfaceAlt/30 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Holding</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{holdings[coin.id].toFixed(2)} | ${holdingsValue.toFixed(2)} | {chartDelta >= 0 ? "+" : ""}{chartDelta.toFixed(0)}%</p>
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
                      {pendingActionId === `${coin.id}-${buyAmount}` ? "Buying..." : `Buy ${buyCoinAmount.toFixed(4)} ${coin.shortLabel}`}
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
                      onClick={() => void sell(coin.id, sellAmount, sellGemValue)}
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
            <div
              key={leader.uid}
              className="rounded-3xl p-px"
              style={leader.equippedProfileBorderId && leader.equippedProfileBorderId !== "border-none" ? getProfileBorderStyle(leader.equippedProfileBorderId) : undefined}
            >
            <Card className="overflow-hidden border border-border p-0">
              <div className="h-24 w-full" style={formatBannerStyle(leader)} />
              <div className="relative p-5">
                <div className="absolute -top-8 left-5 flex h-16 w-16 items-center justify-center rounded-[1.75rem] border-4 border-canvas bg-canvas">
                  <Avatar
                    name={leader.displayName}
                    src={leader.photoURL}
                    className="h-full w-full rounded-[1.2rem]"
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
                    <p className="mt-1 text-sm text-textMuted">@{leader.handle}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-textMuted">{leader.bio || "No bio yet."}</p>
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




