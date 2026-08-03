import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Crown,
  Gem,
  Gamepad2,
  Hammer,
  Home,
  LayoutGrid,
  Menu,
  MessageSquare,
  PlusSquare,
  Search,
  Settings,
  Trophy,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { PostComposer } from "@/components/posts/post-composer";
import { XpProgress } from "@/components/gamification/xp-progress";
import { useAuth } from "@/app/auth-provider";
import { logout } from "@/firebase/auth";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import { subscribeToFollowCounts } from "@/firebase/follows";
import { createNotification, subscribeToNotifications } from "@/firebase/notifications";
import { subscribeToLeaderboardRank } from "@/firebase/posts";
import { resetAllCrypto, resetAllGems } from "@/firebase/functions";
import { addGemsToUser, addXpToUser } from "@/firebase/users";
import { getNameColorStyle } from "@/constants/name-colors";
import { users } from "@/lib/demo-data";
import { readCache, writeCache } from "@/lib/persistent-cache";
import { useUiStore } from "@/store/use-ui-store";
import type { UserProfile } from "@/types/models";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Search },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/arcade", label: "Arcade", icon: Gamepad2 },
  { to: "/market", label: "Market", icon: LayoutGrid },
  { to: "/crypto", label: "Crypto", icon: Gem },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const mobilePrimaryNavItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Search },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/leaderboard", label: "Leaders", icon: Trophy },
];

const mobileSecondaryNavItems = [
  { to: "/arcade", label: "Arcade", icon: Gamepad2 },
  { to: "/market", label: "Market", icon: LayoutGrid },
  { to: "/crypto", label: "Crypto", icon: Gem },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: null, label: "Profile", icon: Bookmark },
  { to: "/premium", label: "Premium", icon: Crown },
  { to: "/settings", label: "Settings", icon: Settings },
];
const BASE_DAILY_GEM_REWARD = 25;
const PREMIUM_DAILY_GEM_MULTIPLIER = 2;

function getDailyGemReward(isPremium: boolean) {
  return BASE_DAILY_GEM_REWARD * (isPremium ? PREMIUM_DAILY_GEM_MULTIPLIER : 1);
}

export function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isComposerOpen, setComposerOpen } = useUiStore();
  const [profile, setProfile] = useState<UserProfile>(users[0]);
  const [followCounts, setFollowCounts] = useState({ followers: users[0].followerCount, following: users[0].followingCount });
  const [notificationCount, setNotificationCount] = useState(0);
  const [claimedToday, setClaimedToday] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isModeratorPanelOpen, setIsModeratorPanelOpen] = useState(false);
  const [isModeratorResetOpen, setIsModeratorResetOpen] = useState(false);
  const [displayedGems, setDisplayedGems] = useState(users[0].gems);
  const [gemDelta, setGemDelta] = useState(0);
  const [gemFlash, setGemFlash] = useState<"gain" | "spend" | null>(null);
  const previousRankRef = useRef<number | null>(null);
  const seenNotificationIdsRef = useRef<string[] | null>(null);
  const previousGemsRef = useRef<number | null>(null);
  const profilePath = `/profile/${profile.handle}`;
  const rewardKey = "pulsearc-daily-gems";
  const profileCacheKey = user ? `cache:sidebar-profile:${user.uid}` : null;
  const followCacheKey = user ? `cache:sidebar-follows:${user.uid}` : null;
  const dailyGemReward = getDailyGemReward(profile.isPremium);

  useEffect(() => {
    if (!profileCacheKey || !followCacheKey) {
      return;
    }

    const cachedProfile = readCache<UserProfile>(profileCacheKey);
    const cachedFollows = readCache<{ followers: number; following: number }>(followCacheKey);
    if (cachedProfile) {
      setProfile(cachedProfile);
    }
    if (cachedFollows) {
      setFollowCounts(cachedFollows);
    }
  }, [followCacheKey, profileCacheKey]);

  useEffect(() => {
    if (!user) {
      setProfile(users[0]);
      setDisplayedGems(users[0].gems);
      previousGemsRef.current = users[0].gems;
      return;
    }

    return onSnapshot(doc(db, COLLECTIONS.users, user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const nextProfile = { ...(snapshot.data() as UserProfile), uid: user.uid };
        setProfile(nextProfile);
        writeCache(`cache:sidebar-profile:${user.uid}`, nextProfile);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setFollowCounts({ followers: profile.followerCount, following: profile.followingCount });
      return;
    }

    return subscribeToFollowCounts(user.uid, (nextCounts) => {
      setFollowCounts(nextCounts);
      writeCache(`cache:sidebar-follows:${user.uid}`, nextCounts);
    });
  }, [profile.followerCount, profile.followingCount, user]);

  useEffect(() => {
    setClaimedToday(window.localStorage.getItem(rewardKey) === new Date().toDateString());
  }, []);

  useEffect(() => {
    if (!user) {
      setNotificationCount(0);
      seenNotificationIdsRef.current = null;
      return;
    }

    return subscribeToNotifications(user.uid, (notifications) => {
      setNotificationCount(notifications.filter((item) => !item.read).length);

      const previousIds = seenNotificationIdsRef.current;
      const nextIds = notifications.map((item) => item.id);
      if (previousIds) {
        const newestNotification = notifications.find((item) => !previousIds.includes(item.id));
        if (newestNotification) {
          toast(newestNotification.title, { description: newestNotification.body });
        }
      }
      seenNotificationIdsRef.current = nextIds;
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      previousRankRef.current = null;
      return;
    }

    return subscribeToLeaderboardRank(user.uid, (rank) => {
      if (rank !== null && previousRankRef.current !== null && rank < previousRankRef.current) {
        void createNotification({
          type: "leaderboard",
          title: "Leaderboard climb",
          body: `You moved from #${previousRankRef.current} to #${rank} on the leaderboard.`,
          actorId: user.uid,
          userId: user.uid,
          postId: null,
        });
      }

      previousRankRef.current = rank;
    });
  }, [user]);

  useEffect(() => {
    setComposerOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, setComposerOpen]);

  useEffect(() => {
    const nextGems = profile.gems;
    const previousGems = previousGemsRef.current;

    if (previousGems === null) {
      previousGemsRef.current = nextGems;
      setDisplayedGems(nextGems);
      return;
    }

    if (nextGems === previousGems) {
      setDisplayedGems(nextGems);
      return;
    }

    const delta = nextGems - previousGems;
    setGemDelta(delta);
    setGemFlash(delta > 0 ? "gain" : "spend");
    previousGemsRef.current = nextGems;

    const flashTimeout = window.setTimeout(() => {
      setGemFlash(null);
      setGemDelta(0);
    }, 1400);

    const duration = 700;
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const nextValue = Math.round(previousGems + delta * progress);
      setDisplayedGems(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setDisplayedGems(nextGems);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.clearTimeout(flashTimeout);
      window.cancelAnimationFrame(frameId);
    };
  }, [profile.gems]);

  if (!user) {
    return (
      <div className="mx-auto grid min-h-screen max-w-lg place-items-center px-4">
        <Card className="w-full p-6">
          <p className="mb-4 text-sm text-textMuted">Sign in to continue.</p>
          <Button className="w-full" onClick={() => navigate("/login")}>Go to login</Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto min-h-screen max-w-7xl px-3 pb-24 pt-3 sm:px-4 sm:pb-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_280px] lg:gap-6">
        <aside className="sticky top-6 hidden self-start lg:block">
          <Card className="space-y-4 p-5">
            <Link to={profilePath} className="flex items-center gap-4 transition hover:opacity-80">
              <Avatar name={profile.displayName} src={profile.photoURL} />
              <div>
                <p className="font-semibold" style={getNameColorStyle(profile.equippedNameColorId)}>{profile.displayName}</p>
                <p className="text-sm text-textMuted">@{profile.handle}</p>
              </div>
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-sm text-textMuted">
              <span>Following <span className="font-semibold text-text">{followCounts.following}</span></span>
              <span>|</span>
              <span>Followers <span className="font-semibold text-text">{followCounts.followers}</span></span>
            </div>
            <XpProgress xp={profile.xp} level={profile.level} />
            <div className={`rounded-2xl border border-border bg-surface px-4 py-3 transition-all duration-500 ${
              gemFlash === "gain" ? "gem-flash-gain" : gemFlash === "spend" ? "gem-flash-spend" : ""
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-textMuted">Gems</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{displayedGems}</p>
                </div>
                {gemDelta !== 0 ? (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                    gemDelta > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-[color:var(--error)]/15 text-[color:var(--error)]"
                  }`}>
                    {gemDelta > 0 ? `+${gemDelta}` : gemDelta}
                  </span>
                ) : null}
              </div>
            </div>
            <Button
              variant={claimedToday ? "secondary" : "primary"}
              disabled={claimedToday}
              className="w-full"
              onClick={async () => {
                await addGemsToUser(user.uid, dailyGemReward);
                window.localStorage.setItem(rewardKey, new Date().toDateString());
                setClaimedToday(true);
              }}
            >
              <Gem size={16} />
              {claimedToday ? "Daily gems claimed" : `Redeem +${dailyGemReward} gems`}
            </Button>
            <NavLink to="/premium" className="flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-panel">
              <Crown size={16} /> Go Premium
            </NavLink>
            <NavLink to="/notifications" className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm">
              <Bell size={16} /> Notifications
              {notificationCount ? <span className="ml-auto rounded-full bg-[color:var(--error)] px-2 py-0.5 text-xs font-semibold text-white">{notificationCount}</span> : null}
            </NavLink>
            <NavLink to="/bookmarks" className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm">
              <Bookmark size={16} /> Bookmarks
            </NavLink>
            <NavLink to="/settings" className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm">
              <Settings size={16} /> Settings
            </NavLink>
            {profile.isModerator ? (
              <div className="space-y-2 rounded-2xl border border-border bg-surfaceAlt/50 p-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setIsModeratorPanelOpen((current) => !current)}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    <Hammer size={16} />
                    Moderator panel
                  </span>
                  {isModeratorPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isModeratorPanelOpen ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="secondary" onClick={() => void addXpToUser(profile.uid, 50)}>+50 XP</Button>
                      <Button type="button" variant="secondary" onClick={() => void addGemsToUser(profile.uid, 50)}>+50 gems</Button>
                      <Button type="button" variant="secondary" onClick={() => void addXpToUser(profile.uid, -profile.xp)}>Reset level</Button>
                      <Button type="button" variant="secondary" onClick={() => void addGemsToUser(profile.uid, -profile.gems)}>Reset gems</Button>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface/60 p-3">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-left text-sm font-semibold"
                        onClick={() => setIsModeratorResetOpen((current) => !current)}
                      >
                        <span>Global resets</span>
                        {isModeratorResetOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {isModeratorResetOpen ? (
                        <div className="mt-3 grid gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={async () => {
                              if (!window.confirm("Reset every user's gems to 500?")) {
                                return;
                              }
                              await resetAllGems();
                              toast.success("All gems reset to 500");
                            }}
                          >
                            Reset all gems to 500
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={async () => {
                              if (!window.confirm("Reset all crypto holdings?")) {
                                return;
                              }
                              await resetAllCrypto();
                              toast.success("All crypto reset");
                            }}
                          >
                            Reset all crypto
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <Button variant="ghost" className="w-full border border-[color:var(--error)] text-[color:var(--error)]" onClick={async () => {
              await logout();
              navigate("/login");
            }}>
              Sign out
            </Button>
          </Card>
        </aside>

        <main className="min-w-0 pb-6 lg:pb-0">
          <Outlet />
        </main>

        <aside className="sticky top-6 hidden self-start lg:block">
          <Card className="space-y-3 p-4">
            <Button className="w-full gap-2" onClick={() => setComposerOpen(true)}>
              <PlusSquare size={16} />
              Create post
            </Button>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${isActive ? "bg-accent text-white" : "bg-surfaceAlt text-text"}`}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </Card>
        </aside>

        <button
          type="button"
          className="fixed bottom-24 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-panel lg:hidden"
          onClick={() => setComposerOpen(true)}
        >
          <PlusSquare size={22} />
        </button>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-canvas/95 px-3 py-2 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
            {mobilePrimaryNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${isActive ? "bg-[color:var(--accent)] text-white shadow-lg" : "text-textMuted"}`}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${mobileMenuOpen ? "bg-[color:var(--accent)] text-white shadow-lg" : "text-textMuted"}`}
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              <Menu size={18} />
              Menu
            </button>
          </div>
        </nav>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 px-3 pb-24 pt-20 backdrop-blur-sm lg:hidden">
          <div className="ml-auto h-full max-w-sm rounded-l-[2rem] border-l border-t border-border bg-canvas p-4 shadow-panel">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">More</p>
                <p className="text-sm text-textMuted">Shortcuts to the rest of the app.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                <X size={16} />
              </Button>
            </div>
            <div className="space-y-2">
              {mobileSecondaryNavItems.map((item) => {
                const destination = item.to ?? profilePath;
                return (
                  <NavLink
                    key={`${item.label}-${destination}`}
                    to={destination}
                    className={({ isActive }) => `relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      isActive ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-text" : "border-border bg-surface text-text"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} />
                    </div>
                    <span className="flex-1 text-sm font-semibold">{item.label}</span>
                    {item.label === "Notifications" && notificationCount ? (
                      <span className="rounded-full bg-[color:var(--error)] px-2 py-0.5 text-[10px] font-semibold text-white">
                        {notificationCount}
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {isComposerOpen ? (
        <div className="fixed inset-0 z-50 bg-black/50 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto max-w-2xl rounded-[2rem] border border-border bg-canvas p-4 shadow-panel">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create post</h2>
              <Button variant="ghost" size="sm" onClick={() => setComposerOpen(false)}>
                <X size={16} />
              </Button>
            </div>
            <PostComposer
              mode="modal"
              onPosted={() => setComposerOpen(false)}
              onCancel={() => setComposerOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
