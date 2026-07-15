import { Bell, Bookmark, Gamepad2, Home, Info, MessageSquare, Settings, ShoppingBag, Store, Trophy } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { XpProgress } from "@/components/gamification/xp-progress";
import { users } from "@/lib/demo-data";
import { useUiStore } from "@/store/use-ui-store";
import type { ThemeMode } from "@/types/models";

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

const themeModes: ThemeMode[] = ["light", "dark", "oled"];

export function AppLayout() {
  const profile = users[0];
  const { theme, setTheme } = useUiStore();

  return (
    <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
      <aside className="sticky top-6 hidden self-start lg:block">
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-4">
            <Avatar name={profile.displayName} />
            <div>
              <p className="font-semibold">{profile.displayName}</p>
              <p className="text-sm text-textMuted">@{profile.handle}</p>
            </div>
          </div>
          <XpProgress xp={profile.xp} level={profile.level} />
          <div className="flex flex-wrap gap-2">
            {themeModes.map((mode) => (
              <Button key={mode} variant={theme === mode ? "primary" : "secondary"} onClick={() => setTheme(mode)}>
                {mode}
              </Button>
            ))}
          </div>
          <Button variant="secondary" className="w-full justify-start gap-2">
            <Bookmark size={16} /> Bookmarks
          </Button>
          <Button variant="secondary" className="w-full justify-start gap-2">
            <Settings size={16} /> Settings
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
