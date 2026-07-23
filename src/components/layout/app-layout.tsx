import {
  Bell,
  Bookmark,
  Gamepad2,
  Home,
  Info,
  LayoutGrid,
  MessageSquare,
  Settings,
  Trophy,
} from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { users } from "@/lib/demo-data";
import { useAuth } from "@/app/auth-provider";
import { logout } from "@/firebase/auth";
import { XpProgress } from "@/components/gamification/xp-progress";
import { subscribeToFollowCounts } from "@/firebase/follows";
import { COLLECTIONS } from "@/firebase/firestore";
import { db } from "@/firebase/config";
import type { UserProfile } from "@/types/models";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Info },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/arcade", label: "Arcade", icon: Gamepad2 },
  { to: "/market", label: "Market", icon: LayoutGrid },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>(users[0]);
  const [followCounts, setFollowCounts] = useState({ followers: users[0].followerCount, following: users[0].followingCount });
  const profileHandle = profile.handle;
  const profilePath = `/profile/${profileHandle}`;

  useEffect(() => {
    if (!user) {
      setProfile(users[0]);
      return;
    }

    const ref = doc(db, COLLECTIONS.users, user.uid);
    return onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        setProfile({ ...(snapshot.data() as UserProfile), uid: user.uid });
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setFollowCounts({ followers: profile.followerCount, following: profile.followingCount });
      return;
    }

    return subscribeToFollowCounts(user.uid, setFollowCounts);
  }, [profile.followerCount, profile.followingCount, user]);

  return (
    !user ? (
      <div className="mx-auto grid min-h-screen max-w-lg place-items-center px-4">
        <Card className="w-full p-6">
          <p className="mb-4 text-sm text-textMuted">Sign in to continue.</p>
          <Button className="w-full" onClick={() => navigate("/login")}>Go to login</Button>
        </Card>
      </div>
    ) : (
    <div className="mx-auto min-h-screen max-w-7xl px-3 pb-24 pt-3 sm:px-4 sm:pb-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_280px] lg:gap-6">
      <aside className="sticky top-6 hidden self-start lg:block">
        <Card className="space-y-4 p-5">
          <Link to={profilePath} className="flex items-center gap-4 transition hover:opacity-80">
            <Avatar name={profile.displayName} src={profile.photoURL} />
            <div>
              <p className="font-semibold">{profile.displayName}</p>
              <p className="text-sm text-textMuted">@{profile.handle}</p>
            </div>
          </Link>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-border p-3">
              <p className="text-textMuted">Followers</p>
              <p className="mt-1 font-semibold">{followCounts.followers}</p>
            </div>
            <div className="rounded-2xl border border-border p-3">
              <p className="text-textMuted">Following</p>
              <p className="mt-1 font-semibold">{followCounts.following}</p>
            </div>
          </div>
          <XpProgress xp={profile.xp} level={profile.level} />
          <div className="rounded-2xl border border-border bg-surface px-4 py-3">
            <p className="text-textMuted">Gems</p>
            <p className="mt-1 text-xl font-bold">{profile.gems}</p>
          </div>
          <NavLink
            to={profilePath}
            className="flex items-center justify-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold"
          >
            Edit profile
          </NavLink>
          <NavLink to="/bookmarks" className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm">
            <Bookmark size={16} /> Bookmarks
          </NavLink>
          <NavLink to="/settings" className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm">
            <Settings size={16} /> Settings
          </NavLink>
          <Button
            variant="ghost"
            className="w-full"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            Sign out
          </Button>
        </Card>
      </aside>

      <main className="min-w-0 pb-6 lg:pb-0">
        <Outlet />
      </main>

      <aside className="sticky top-6 hidden self-start lg:block">
        <Card className="space-y-3 p-4">
          <Button className="w-full">Create post</Button>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${isActive ? "bg-accent text-white" : "bg-surfaceAlt text-text"}`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </Card>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-canvas/95 px-3 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-7 gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                  isActive ? "bg-[color:var(--accent)] text-white shadow-lg" : "text-textMuted"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
    )
  );
}
