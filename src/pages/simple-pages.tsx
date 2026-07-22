import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { XpProgress } from "@/components/gamification/xp-progress";
import { conversations, notifications, shopItems, triviaQuestions, users } from "@/lib/demo-data";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/firebase/auth";
import { useAuth } from "@/app/auth-provider";
import { ensureUserProfile } from "@/firebase/users";
import { createPost, subscribeToPosts } from "@/firebase/posts";
import type { Post } from "@/types/models";
import { Crown, MessageCircle, Palette } from "lucide-react";
import { doc, increment, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { auth } from "@/firebase/config";
import { linkGoogleAccount, changeUserPassword, updateDisplayName, uploadProfilePicture } from "@/firebase/auth";
import { Avatar } from "@/components/common/avatar";
import { setFollowingRelationship, subscribeToFollowCounts, subscribeToFollowRelationship } from "@/firebase/follows";
import { addGemsToUser, addXpToUser, getDemoUserByHandle, subscribeToUserProfileByHandle, subscribeToUserProfileById, subscribeToXpLeaderboard } from "@/firebase/users";
import { useUiStore } from "@/store/use-ui-store";
import { getXpProgress } from "@/constants/gamification";
import { deleteDoc } from "firebase/firestore";

function getFirebaseErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Unknown Firebase error.";
  }

  const firebaseError = error as { code?: string; message?: string };
  return `${firebaseError.code ?? "unknown-code"}: ${firebaseError.message ?? "Unknown Firebase error."}`;
}

function PageFrame({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="space-y-5">
      {children}
    </div>
  );
}

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
  canDelete,
  onDelete,
}: {
  reply: Post;
  author: (typeof users)[number] | null;
  canDelete: boolean;
  onDelete: () => Promise<void>;
}) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start gap-4">
        <Avatar name={author?.displayName ?? "Unknown"} src={author?.photoURL ?? null} className="h-12 w-12 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{author?.displayName ?? "Unknown profile"}</p>
            {author ? <span className="rounded-full bg-[color:var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent)]">Lv {author.level}</span> : null}
            {author?.isPremium ? <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-500">Premium</span> : null}
            {author?.isModerator ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-500">Moderator</span> : null}
          </div>
          <p className="text-sm text-textMuted">@{author?.handle ?? reply.authorId}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text">{reply.content}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-textMuted">
        <span>{reply.replyCount} replies</span>
        <span>{reply.reactionCount} reactions</span>
        <span>{reply.repostCount} reposts</span>
        {canDelete ? (
          <Button
            variant="ghost"
            className="ml-auto px-0 text-red-500"
            onClick={onDelete}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function ExplorePage() {
  return (
    <PageFrame title="Explore" subtitle="Search, trends, suggested users, and popular posts are composed into one discovery surface for the demo.">
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-semibold">Trending topics</p>
            <p className="mt-2 text-sm text-textMuted">#community-design, #dark-mode, #daily-trivia</p>
          </div>
          <div>
            <p className="font-semibold">Suggested users</p>
            <p className="mt-2 text-sm text-textMuted">{users.map((user) => `@${user.handle}`).join(", ")}</p>
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
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

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
      return;
    }

    const unsubscribeCounts = subscribeToFollowCounts(user.uid, setFollowCounts);
    const unsubscribeRelationship = subscribeToFollowRelationship(currentUserId, user.uid, setIsFollowing);

    return () => {
      unsubscribeCounts();
      unsubscribeRelationship();
    };
  }, [currentUserId, user?.followingCount, user?.followerCount, user?.uid]);

  if (!user) {
    return (
      <PageFrame title="Profile not found" subtitle="This profile is not available in the current demo dataset.">
        <Card className="p-6 text-sm text-textMuted">We could not find a profile for @{handle ?? "unknown"}.</Card>
      </PageFrame>
    );
  }

  return (
    <PageFrame title={user.displayName} subtitle={user.bio}>
      <Card className="space-y-5 p-6">
        <div className="flex items-start gap-4">
          <Avatar name={user.displayName} src={user.photoURL} className="h-20 w-20 rounded-3xl" />
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold">{user.displayName}</p>
            <p className="mt-1 text-sm text-textMuted">@{user.handle} • {user.location}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-2xl border border-border px-3 py-2">
                  <strong>{followCounts.followers}</strong> Followers
                </span>
                <span className="rounded-2xl border border-border px-3 py-2">
                  <strong>{followCounts.following}</strong> Following
                </span>
              </div>
              <XpProgress xp={user.xp} level={user.level} />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="secondary"
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
            {isOwnProfile ? "Edit profile" : isTogglingFollow ? "Saving..." : isFollowing ? "Unfollow" : "Follow"}
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl border border-border p-4">
            <p className="text-textMuted">Posts</p>
            <p className="mt-1 font-semibold">{user.postCount}</p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-textMuted">Badges</p>
            <p className="mt-1 font-semibold">{user.badgeCount}</p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-textMuted">Level</p>
            <p className="mt-1 font-semibold">{user.level}</p>
          </div>
        </div>
      </Card>
      {isOwnProfile ? <EditProfileModal open={isEditorOpen} onClose={() => setIsEditorOpen(false)} profile={user} /> : null}
    </PageFrame>
  );
}

export function SettingsPage() {
  const { theme, accentColor, textScale, setTheme, setAccentColor, setTextScale } = useUiStore();

  const accentPresets = [
    { label: "Purple", value: "#8b5cf6" },
    { label: "Orange", value: "#ff8a3d" },
    { label: "Dark Blue", value: "#123b8f" },
    { label: "Aqua", value: "#20c7c6" },
    { label: "Red", value: "#ef4444" },
  ] as const;

  return (
    <PageFrame title="Settings" subtitle="Appearance and account options live here.">
      <div className="space-y-5">
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Palette size={18} />
            <h2 className="text-lg font-semibold">Appearance</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant={theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")}>
              Dark mode
            </Button>
            <Button variant={theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")}>
              Light mode
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Theme color</p>
            <div className="flex flex-wrap gap-2">
              {accentPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  aria-label={preset.label}
                  title={preset.label}
                  onClick={() => setAccentColor(preset.value)}
                  className={`h-11 w-11 rounded-full border-2 transition ${
                    accentColor === preset.value ? "scale-110 border-text" : "border-transparent"
                  }`}
                  style={{ backgroundColor: preset.value }}
                />
              ))}
            </div>
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
          <p className="text-sm text-textMuted">Profile and connection tools stay in the main profile flow.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary">Manage profile</Button>
            <Button variant="secondary">Privacy</Button>
            <Button variant="secondary">Notifications</Button>
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");

  useEffect(() => {
    if (open) {
      setDisplayName(profile.displayName);
    }
  }, [open, profile.displayName]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
      <Card className="w-full max-w-xl space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Edit profile</h2>
            <p className="text-sm text-textMuted">Update your profile picture, display name, Google link, and password.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar name={profile.displayName} src={profile.photoURL} />
          <div className="space-y-2">
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

        <div className="space-y-3">
          <label className="block text-sm font-semibold">Display name</label>
          <div className="flex gap-2">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="min-w-0 flex-1 rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none"
            />
            <Button
              onClick={async () => {
                try {
                  await updateDisplayName(displayName.trim());
                  toast.success("Display name updated");
                } catch (error) {
                  console.error("Failed to update display name", error);
                  toast.error(getFirebaseErrorMessage(error));
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
        </div>
      </Card>
    </div>
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
  return <PageFrame title="Onboarding" subtitle="Multi-step setup for avatar, bio, interests, accent color, and starter follows." />;
}

export function PostPage() {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [author, setAuthor] = useState<ReturnType<typeof getDemoUserByHandle> | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<ReturnType<typeof getDemoUserByHandle> | null>(null);
  const [replyAuthors, setReplyAuthors] = useState<Record<string, (typeof users)[number] | null>>({});

  useEffect(() => subscribeToPosts(setPosts), []);

  const post = posts.find((item: Post) => item.id === postId);
  const replies = posts.filter((item: Post) => item.parentPostId === postId);

  useEffect(() => {
    if (!user) {
      setCurrentUserProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, (profile) => {
      setCurrentUserProfile(profile);
    });
  }, [user]);

  useEffect(() => {
    if (!post) {
      return;
    }

    const demoProfile = users.find((profile) => profile.uid === post.authorId) ?? null;
    setAuthor(demoProfile);

    return subscribeToUserProfileById(post.authorId, (profile) => {
      setAuthor(profile ?? demoProfile);
      if (!profile) {
        console.warn("[post-page] missing author profile", { postId: post.id, authorId: post.authorId });
      }
    });
  }, [post?.authorId, post?.id]);

  useEffect(() => {
    if (!replies.length) {
      setReplyAuthors({});
      return;
    }

    setReplyAuthors(
      Object.fromEntries(
        replies.map((reply) => [reply.id, users.find((profile) => profile.uid === reply.authorId) ?? null]),
      ),
    );
  }, [replies.length, post?.id]);

  useEffect(() => {
    if (!user || !author || author.uid === user.uid) {
      return;
    }

    return subscribeToFollowRelationship(user.uid, author.uid, setIsFollowingAuthor);
  }, [author?.uid, user?.uid]);

  return (
    <PageFrame title="Post Thread" subtitle="Thread view, nested replies, quoted repost context, and moderation actions.">
      {!post ? (
        <Card className="p-6 text-sm text-textMuted">Post not found.</Card>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
            <p className="text-sm text-textMuted">{replies.length} comments</p>
          </div>
          <Card className="space-y-4 p-6">
            <div className="flex items-start gap-4">
              <Avatar name={author?.displayName ?? "Unknown"} src={author?.photoURL ?? null} className="h-16 w-16 rounded-3xl" />
              <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold">{author?.displayName ?? "Unknown profile"}</p>
                  {author ? <span className="rounded-full bg-[color:var(--accent)]/15 px-2 py-0.5 text-xs font-semibold text-[color:var(--accent)]">Lv {author.level}</span> : null}
                  {author?.isModerator ? <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-500">Moderator</span> : null}
                </div>
                <p className="text-sm text-textMuted">@{author?.handle ?? "unknown"} • {author?.location ?? "No location"}</p>
                <p className="mt-2 text-sm text-textMuted">{author?.bio ?? "No bio available."}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-textMuted">
                  <span className="rounded-full border border-border px-3 py-1">{author?.followerCount ?? 0} followers</span>
                  <span className="rounded-full border border-border px-3 py-1">{author?.followingCount ?? 0} following</span>
                  <span className="rounded-full border border-border px-3 py-1">{author?.badgeCount ?? 0} badges</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {author && user?.uid !== author.uid ? (
                  <Button
                    variant={isFollowingAuthor ? "secondary" : "primary"}
                    onClick={async () => {
                      if (!user) {
                        return;
                      }
                      await setFollowingRelationship(user.uid, author.uid, !isFollowingAuthor);
                    }}
                  >
                    {isFollowingAuthor ? "Unfollow" : "Follow"}
                  </Button>
                ) : null}
                {currentUserProfile && (currentUserProfile.uid === author?.uid || currentUserProfile.isModerator) ? (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await deleteDoc(doc(db, "posts", post.id));
                      navigate("/");
                    }}
                  >
                    Delete post
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-lg font-semibold">{post.content}</p>
          </Card>
          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-2 font-semibold">
              <MessageCircle size={18} />
              Comments
              <span className="rounded-full bg-surfaceAlt px-2 py-0.5 text-xs font-medium text-textMuted">{replies.length}</span>
            </div>
            {replies.length ? (
              <div className="space-y-3">
                {replies.map((reply: Post) => {
                  const replyAuthor = replyAuthors[reply.id] ?? null;
                  const canDeleteReply = Boolean(currentUserProfile && (currentUserProfile.uid === reply.authorId || currentUserProfile.isModerator));

                  if (!replyAuthor) {
                    console.warn("[post-page] missing reply author profile", { replyId: reply.id, authorId: reply.authorId });
                  }

                  return (
                    <ReplyCard
                      key={reply.id}
                      reply={reply}
                      author={replyAuthor}
                      canDelete={canDeleteReply}
                      onDelete={async () => {
                        await deleteDoc(doc(db, "posts", reply.id));
                        await updateDoc(doc(db, "posts", post.id), { replyCount: increment(-1) });
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-textMuted">No comments yet.</p>
            )}
            <div className="flex gap-2">
              <input
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                maxLength={280}
                placeholder="Write a reply..."
                className="min-w-0 flex-1 rounded-full border border-border bg-transparent px-4 py-2 text-sm outline-none"
              />
              <Button
                onClick={async () => {
                  if (!user || !post || !replyText.trim()) {
                    return;
                  }

                  await createPost({
                    authorId: user.uid,
                    content: replyText.trim(),
                    imageURL: null,
                    parentPostId: post.id,
                    repostedPostId: null,
                    quotedPostId: null,
                    tags: [],
                    visibility: "public",
                  });
                  await updateDoc(doc(db, "posts", post.id), { replyCount: increment(1) });
                  await addXpToUser(user.uid, 2);
                  setReplyText("");
                }}
              >
                Reply
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageFrame>
  );
}

export function ChatPage() {
  return (
    <PageFrame title="Chat" subtitle="One-to-one conversations with unread indicators and responsive message panes.">
      <Card className="p-6">
        {conversations.map((conversation) => (
          <div key={conversation.id} className="rounded-2xl border border-border p-4">
            <p className="font-semibold">{conversation.title}</p>
            <p className="text-sm text-textMuted">{conversation.lastMessage}</p>
          </div>
        ))}
      </Card>
    </PageFrame>
  );
}

export function NotificationsPage() {
  return (
    <PageFrame title="Notifications" subtitle="Reward, follow, mention, reply, and badge events with read states and filtering.">
      <Card className="space-y-3 p-6">
        {notifications.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border p-4">
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-textMuted">{item.body}</p>
          </div>
        ))}
      </Card>
    </PageFrame>
  );
}

export function BookmarksPage() {
  return <PageFrame title="Bookmarks" subtitle="Private saved posts are exposed only to the authenticated user in Firebase rules." />;
}

export function ArcadePage() {
  const question = triviaQuestions[0];
  const { user } = useAuth();
  const [claimedToday, setClaimedToday] = useState(false);
  const rewardKey = "pulsearc-daily-gems";

  useEffect(() => {
    setClaimedToday(window.localStorage.getItem(rewardKey) === new Date().toDateString());
  }, []);

  return (
    <PageFrame title="Arcade" subtitle="Daily trivia, one reward claim per day, and badge progress fit into a lightweight game layer.">
      <div className="space-y-5">
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{question.prompt}</p>
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
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {question.choices.map((choice) => (
              <div key={choice} className="rounded-2xl border border-border p-4 text-sm">
                {choice}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageFrame>
  );
}

export function MarketPage() {
  return <PageFrame title="Market" subtitle="Fictional collectible listings, rarity filters, inventory, and transaction history stay strictly in-app." />;
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
  return <PageFrame title="About PulseArc" subtitle="PulseArc is an original social sandbox built around playful progression, healthier engagement loops, and portfolio-ready Firebase architecture." />;
}

export function NotFoundPage() {
  return <PageFrame title="Page Not Found" subtitle="The route does not exist in this demo." />;
}
