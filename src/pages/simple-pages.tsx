import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Crown, Gem, Globe2, ImagePlus, Lock, MapPin, MessageCircle, Palette, Search, Send, Trash2, Unlock } from "lucide-react";
import { deleteDoc, doc, increment, updateDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { Card } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { XpProgress } from "@/components/gamification/xp-progress";
import { SlotMachine } from "@/components/gamification/slot-machine";
import { conversations, messages, notifications, shopItems, users } from "@/lib/demo-data";
import { bannerPresets } from "@/lib/banner-presets";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/firebase/auth";
import { useAuth } from "@/app/auth-provider";
import { addGemsToUser, addXpToUser, ensureUserProfile, getDemoUserByHandle, subscribeToUserProfileByHandle, subscribeToUserProfileById, subscribeToXpLeaderboard, updateUserProfile } from "@/firebase/users";
import { changeUserPassword, linkGoogleAccount, updateDisplayName, uploadProfileBanner, uploadProfilePicture } from "@/firebase/auth";
import { deletePostCascade, subscribeToPosts, subscribeToPostsByAuthor } from "@/firebase/posts";
import { InlineEntities } from "@/components/common/inline-entities";
import { Avatar } from "@/components/common/avatar";
import { setFollowingRelationship, subscribeToFollowerIds, subscribeToFollowCounts, subscribeToFollowRelationship, subscribeToFollowingIds } from "@/firebase/follows";
import { useUiStore } from "@/store/use-ui-store";
import { getXpProgress } from "@/constants/gamification";
import { themePresets } from "@/lib/theme-presets";
import { readCache, writeCache } from "@/lib/persistent-cache";
import { banUserAccount } from "@/firebase/functions";
import { subscribeToBookmarkedPosts } from "@/firebase/bookmarks";
import { markNotificationRead, subscribeToNotifications } from "@/firebase/notifications";
import { UserBadges } from "@/components/common/user-badges";
import { PostCard } from "@/components/posts/post-card";
import { PostComposer } from "@/components/posts/post-composer";
import type { Conversation, Message, NotificationItem, Post, UserProfile } from "@/types/models";

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

const changelogEntries = [
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
  displayName: z.string().min(2).max(40),
});

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
            <p className="font-semibold">{author?.displayName ?? "Unknown profile"}</p>
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
  return (
    <PageFrame title="Explore" subtitle="Search, trends, suggested users, and popular posts are composed into one discovery surface for the demo." titleIcon={Search}>
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Search size={16} />
              <p className="font-semibold">Search</p>
            </div>
            <p className="text-sm text-textMuted">Search is not functional in the demo, but this surface would normally show search results for posts and users.</p>
          </div>
        </div>
      </Card>
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
  const [profileTab, setProfileTab] = useState<"posts" | "replies">("posts");
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [parentAuthors, setParentAuthors] = useState<Record<string, (typeof users)[number] | null>>({});
  const [followModalTab, setFollowModalTab] = useState<"followers" | "following" | null>(null);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followProfiles, setFollowProfiles] = useState<Record<string, UserProfile | null>>({});

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

  if (!user) {
    return (
      <PageFrame title="Profile not found" subtitle="This profile is not available in the current demo dataset.">
        <Card className="p-6 text-sm text-textMuted">We could not find a profile for @{handle ?? "unknown"}.</Card>
      </PageFrame>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden p-0">
        <div className="h-36 w-full sm:h-44" style={formatBannerStyle(user)} />
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="-mt-16 shrink-0 rounded-[1.75rem] border-4 border-canvas bg-canvas sm:-mt-20">
                <Avatar name={user.displayName} src={user.photoURL} className="h-20 w-20 rounded-3xl sm:h-24 sm:w-24" />
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-2xl font-bold">{user.displayName}</p>
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
                  {currentUserId && !isOwnProfile ? <ModeratorBanButton targetUserId={user.uid} /> : null}
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
                <p className="mt-1 inline-flex items-center gap-1 font-semibold"><Gem size={14} /> {user.gems}</p>
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
        </div>

        {!canViewPosts ? (
          <Card className="space-y-2 p-6 text-sm text-textMuted">
            <p className="inline-flex items-center gap-2 font-semibold text-text"><Lock size={16} /> Private profile</p>
            <p>Only mutual follows can view this user&apos;s posts and replies.</p>
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
  const { theme, textScale, setTheme, setTextScale } = useUiStore();
  const availableThemes = Object.entries(themePresets);

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
                      onClick={(event) => {
                        event.preventDefault();
                        setTheme(themeKey as keyof typeof themePresets);
                      }}
                    >
                      {isActive ? "Active theme" : "Use theme"}
                    </Button>
                  </summary>
                </details>
              );
            })}
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
      setBio(profile.bio);
      setLocation(profile.location);
      setBannerColor(profile.bannerColor ?? bannerPresets[0]);
      setIsPrivate(profile.isPrivate);
    }
  }, [open, profile.bannerColor, profile.bio, profile.displayName, profile.isPrivate, profile.location]);

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
                          <p className="text-sm text-textMuted">@{profile.handle}</p>
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
                      className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Location</label>
                    <input
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder="City, country, or remote"
                      className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    rows={4}
                    maxLength={180}
                    placeholder="Tell people what you're about."
                    className="w-full rounded-3xl border border-border bg-transparent px-4 py-3 text-sm outline-none"
                  />
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
                        if (displayName.trim() && displayName.trim() !== profile.displayName) {
                          await updateDisplayName(displayName.trim());
                        }
                        await updateUserProfile(profile.uid, {
                          bio: bio.trim(),
                          location: location.trim(),
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
      className="gap-2 text-red-500"
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
      {isBanning ? "Banning..." : "Ban user"}
    </Button>
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
            await signInWithEmail(values.email, values.password);
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
            await signUpWithEmail(values.email, values.password, values.displayName);
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

  function renderReplies(parentId: string, depth = 0): ReactNode {
    const children = groupedReplies.get(parentId) ?? [];
    if (!children.length) {
      return null;
    }

    return (
      <div className="space-y-3">
        {children.map((reply) => (
          <div key={reply.id} className={depth ? "ml-4 border-l border-border pl-4 sm:ml-6 sm:pl-5" : ""}>
            <PostCard
              post={reply}
              replyContextLabel={getReplyContextLabel(reply)}
              onReply={() => setReplyTargetId(reply.id)}
            />
            <div className="mt-3">
              {renderReplies(reply.id, depth + 1)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <PageFrame title="Post Thread" subtitle="Threaded replies, ratings, polls, and media all run through the same shared post system here.">
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
              Thread
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
  const [items, setItems] = useState<NotificationItem[]>([]);
  const unreadCount = items.filter((item) => !item.read).length;

  async function handleMarkRead(notificationId: string, read: boolean) {
    if (read) {
      return;
    }

    await markNotificationRead(notificationId);
  }

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    return subscribeToNotifications(user.uid, setItems);
  }, [user]);

  return (
    <PageFrame title="Notifications" subtitle="Replies, ratings, rotten tomatoes, level-ups, rewards, follows, and moderator reports all land here.">
      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="space-y-3 p-5">
          <div>
            <p className="font-semibold">Inbox</p>
            <p className="text-sm text-textMuted">Unread: {unreadCount}</p>
          </div>
          <div className="space-y-2 text-sm text-textMuted">
            <p>Total notifications: {items.length}</p>
            <p>{items.some((item) => item.type === "report") ? "Moderator reports available" : "No moderator reports right now"}</p>
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          {(items.length ? items : notifications).length ? (items.length ? items : notifications).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`block w-full rounded-2xl border p-4 text-left transition ${item.read ? "border-border bg-surface" : "border-[color:var(--accent)]/35 bg-[color:var(--accent)]/6"}`}
              onClick={() => void handleMarkRead(item.id, item.read)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-textMuted">{item.body}</p>
                </div>
                {!item.read ? <span className="rounded-full bg-[color:var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white">New</span> : null}
              </div>
              <p className="mt-3 text-xs text-textMuted">{new Date(item.createdAt).toLocaleString()}</p>
            </button>
          )) : (
            <div className="rounded-2xl border border-border p-6 text-sm text-textMuted">No notifications yet.</div>
          )}
        </Card>
      </div>
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
  const [claimedToday, setClaimedToday] = useState(false);
  const rewardKey = "pulsearc-daily-gems";

  useEffect(() => {
    setClaimedToday(window.localStorage.getItem(rewardKey) === new Date().toDateString());
  }, []);

  return (
    <PageFrame title="Arcade" subtitle="Gambling, slot machines, and daily rewards. Big Payouts, Bigger rewards">
      <div className="space-y-5">
        <Card className="flex items-center justify-between gap-4 p-6">
          <div>
            <p className="font-semibold">Daily gem reward</p>
          </div>
          <Button
            variant={claimedToday ? "secondary" : "primary"}
            disabled={claimedToday}
            onClick={async () => {
              if (!user) {
                return;
              }

              await addGemsToUser(user.uid, 10);
              window.localStorage.setItem(rewardKey, new Date().toDateString());
              setClaimedToday(true);
              toast.success("Daily gems claimed", { description: "+10 gems added to your account" });
            }}
          >
            {claimedToday ? "Claimed" : "+10 Gems"}
          </Button>
        </Card>
        <SlotMachine />
      </div>
    </PageFrame>
  );
}

export function MarketPage() {
  return <PageFrame title="Market" subtitle="Coming soon. Spend your gems on cosmetics, themes, badges, and more" />;
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
  const [leaders, setLeaders] = useState(users);

  useEffect(() => subscribeToXpLeaderboard(setLeaders), []);

  return (
    <PageFrame title="Leaderboard" subtitle="Global, weekly, XP, level, arcade, and badge leaderboards are ready for live data bindings.">
      <Card className="space-y-3 p-6">
        {leaders.map((leader, index) => {
          const progress = getXpProgress(leader.xp, leader.level);

          return (
            <div key={leader.uid} className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--accent)]/15 text-sm font-bold text-[color:var(--accent)]">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {index === 0 ? <Crown size={16} className="text-[color:var(--accent)]" /> : null}
                    <span className="font-semibold">{leader.displayName}</span>
                  </div>
                  <p className="text-sm text-textMuted">@{leader.handle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">Level {leader.level}</p>
                <p className="text-sm text-textMuted">{leader.xp} XP</p>
                <p className="text-xs text-textMuted">{progress.earned}/{progress.needed} to next level</p>
              </div>
            </div>
          );
        })}
      </Card>
    </PageFrame>
  );
}

export function AboutPage() {
  return <PageFrame title="About PulseArc" subtitle="Coming soon. PulseArc is an original social sandbox built around playful progression, healthier engagement loops, and portfolio-ready Firebase architecture." />;
}

export function NotFoundPage() {
  return <PageFrame title="Page Not Found" subtitle="The route does not exist in this demo." />;
}
