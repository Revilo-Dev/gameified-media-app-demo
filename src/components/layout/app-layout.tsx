import { Bell, Bookmark, Gamepad2, Home, Info, MessageSquare, Settings, ShoppingBag, Store, Trophy } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { users } from "@/lib/demo-data";
import { useUiStore } from "@/store/use-ui-store";
import type { ThemeMode } from "@/types/models";
import { useAuth } from "@/app/auth-provider";
import { logout } from "@/firebase/auth";
import { XpProgress } from "@/components/gamification/xp-progress";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Info },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/arcade", label: "Arcade", icon: Gamepad2 },
  { to: "/market", label: "Market", icon: Store },
  { to: "/shop", label: "Shop", icon: ShoppingBag },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/about", label: "About", icon: Info },
];

const themeModes: ThemeMode[] = ["light", "dark"];

export function AppLayout() {
  const profile = users[0];
  const { theme, setTheme } = useUiStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const profileHandle = user?.email?.split("@")[0] ?? profile.handle;
  const profilePath = `/profile/${profileHandle}`;

  return (
    <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
      <aside className="sticky top-6 hidden self-start lg:block">
        <Card className="space-y-4 p-5">
          <Link to={profilePath} className="flex items-center gap-4 transition hover:opacity-80">
            <Avatar name={profile.displayName} />
            <div>
              <p className="font-semibold">{user?.displayName ?? profile.displayName}</p>
              <p className="text-sm text-textMuted">@{user?.email?.split("@")[0] ?? profile.handle}</p>
            </div>
          </Link>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-border p-3">
              <p className="text-textMuted">Followers</p>
              <p className="mt-1 font-semibold">{profile.followerCount}</p>
            </div>
            <div className="rounded-2xl border border-border p-3">
              <p className="text-textMuted">Following</p>
              <p className="mt-1 font-semibold">{profile.followingCount}</p>
            </div>
          </div>
          <XpProgress xp={profile.xp} level={profile.level} />
          <NavLink
            to={profilePath}
            className="flex items-center justify-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold"
          >
            Edit profile
          </NavLink>
          <div className="flex flex-wrap gap-2">
            {themeModes.map((mode) => (
              <Button key={mode} variant={theme === mode ? "primary" : "secondary"} onClick={() => setTheme(mode)}>
                {mode}
              </Button>
            ))}
          </div>
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

      <main className="min-w-0">
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
    </div>
  );
}
