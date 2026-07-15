import type { ReactNode } from "react";
import { Card } from "@/components/common/card";
import { conversations, notifications, shopItems, triviaQuestions, users } from "@/lib/demo-data";
import { XpProgress } from "@/components/gamification/xp-progress";

function PageFrame({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-textMuted">{subtitle}</p>
      </Card>
      {children}
    </div>
  );
}

export function ExplorePage() {
  return (
    <PageFrame title="Explore" subtitle="Search, trends, suggested users, and popular posts are composed into one discovery surface for the demo.">
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-semibold">Trending topics</p>
            <p className="mt-2 text-sm text-textMuted">#community-design, #oled-mode, #daily-trivia</p>
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
  const user = users[0];
  return (
    <PageFrame title={user.displayName} subtitle={user.bio}>
      <Card className="space-y-4 p-6">
        <p className="text-sm text-textMuted">@{user.handle} • {user.location}</p>
        <XpProgress xp={user.xp} level={user.level} />
      </Card>
    </PageFrame>
  );
}

export function SettingsPage() {
  return <PageFrame title="Settings" subtitle="Account, privacy, notifications, appearance, and connected accounts are laid out here for the demo." />;
}

export function LoginPage() {
  return <PageFrame title="Login" subtitle="Email/password, Google sign-in, reset flow, and persistent session hooks belong here." />;
}

export function SignupPage() {
  return <PageFrame title="Sign Up" subtitle="Validated registration flow with handle reservation, password confirmation, and terms acceptance." />;
}

export function OnboardingPage() {
  return <PageFrame title="Onboarding" subtitle="Multi-step setup for avatar, bio, interests, accent color, and starter follows." />;
}

export function PostPage() {
  return <PageFrame title="Post Thread" subtitle="Thread view, nested replies, quoted repost context, and moderation actions." />;
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
            <div key={choice} className="rounded-2xl border border-border p-4 text-sm">{choice}</div>
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
            <span>#{index + 1} {user.displayName}</span>
            <span className="text-sm text-textMuted">Level {user.level} • {user.xp} XP</span>
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
