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
import { firebaseConfig } from "@/firebase/config";
import { createPost, subscribeToPosts } from "@/firebase/posts";
import type { Post } from "@/types/models";
import { MessageCircle } from "lucide-react";
import { doc, increment, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { auth } from "@/firebase/config";
import { linkGoogleAccount, changeUserPassword, updateDisplayName, uploadProfilePicture } from "@/firebase/auth";
import { Avatar } from "@/components/common/avatar";

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
  const user = users.find((profile) => profile.handle === handle) ?? users[0];
  const isOwnProfile = handle === currentUserHandle || (!handle && currentUserHandle === user.handle);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
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
                  <strong>{user.followerCount}</strong> Followers
                </span>
                <span className="rounded-2xl border border-border px-3 py-2">
                  <strong>{user.followingCount}</strong> Following
                </span>
              </div>
              <XpProgress xp={user.xp} level={user.level} />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              if (isOwnProfile) {
                setIsEditorOpen(true);
              }
            }}
          >
            {isOwnProfile ? "Edit profile" : "Follow"}
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
  return <PageFrame title="Settings" subtitle="Account, privacy, notifications, appearance, and connected accounts are laid out here for the demo." />;
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
    <div className="mx-auto grid min-h-screen max-w-5xl place-items-center px-4 py-10">
      <Card className="w-full max-w-lg space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-textMuted">{subtitle}</p>
        </div>
        {children}
      </Card>
    </div>
  );
}

function AuthDiagnostics() {
  return (
    <Card className="space-y-2 border-dashed p-4 text-xs text-textMuted">
      <p className="font-semibold text-text">Auth diagnostics</p>
      <p>Project: {firebaseConfig.projectId || "missing"}</p>
      <p>Auth domain: {firebaseConfig.authDomain || "missing"}</p>
      <p>API key: {firebaseConfig.apiKey ? "present" : "missing"}</p>
    </Card>
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
    <AuthShell title="Login" subtitle="Sign in with email/password or Google. Your profile doc is created automatically after first login.">
      <AuthDiagnostics />
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
    <AuthShell title="Sign Up" subtitle="Create your account with email/password or Google. The user document is created for you.">
      <AuthDiagnostics />
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [replyText, setReplyText] = useState("");

  useEffect(() => subscribeToPosts(setPosts), []);

  const post = posts.find((item: Post) => item.id === postId);
  const replies = posts.filter((item: Post) => item.parentPostId === postId);

  return (
    <PageFrame title="Post Thread" subtitle="Thread view, nested replies, quoted repost context, and moderation actions.">
      {!post ? (
        <Card className="p-6 text-sm text-textMuted">Post not found.</Card>
      ) : (
        <div className="space-y-5">
          <Card className="space-y-4 p-6">
            <p className="text-sm text-textMuted">@{users.find((profile) => profile.uid === post.authorId)?.handle ?? "unknown"}</p>
            <p className="text-lg font-semibold">{post.content}</p>
          </Card>
          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-2 font-semibold">
              <MessageCircle size={18} />
              Comments
            </div>
            {replies.length ? (
              <div className="space-y-3">
                {replies.map((reply: Post) => (
                  <div key={reply.id} className="rounded-2xl border border-border p-4 text-sm">
                    <p className="text-textMuted">@{users.find((profile) => profile.uid === reply.authorId)?.handle ?? "unknown"}</p>
                    <p className="mt-1">{reply.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-textMuted">No comments yet.</p>
            )}
            <div className="flex gap-2">
              <input
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
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
  return (
    <PageFrame title="Arcade" subtitle="Daily trivia, one reward claim per day, and badge progress fit into a lightweight game layer.">
      <Card className="p-6">
        <p className="font-semibold">{question.prompt}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {question.choices.map((choice) => (
            <div key={choice} className="rounded-2xl border border-border p-4 text-sm">
              {choice}
            </div>
          ))}
        </div>
      </Card>
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
  return (
    <PageFrame title="Leaderboard" subtitle="Global, weekly, XP, level, arcade, and badge leaderboards are ready for live data bindings.">
      <Card className="space-y-3 p-6">
        {users.map((user, index) => (
          <div key={user.uid} className="flex items-center justify-between rounded-2xl border border-border p-4">
            <span>
              #{index + 1} {user.displayName}
            </span>
            <span className="text-sm text-textMuted">
              Level {user.level} • {user.xp} XP
            </span>
          </div>
        ))}
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
