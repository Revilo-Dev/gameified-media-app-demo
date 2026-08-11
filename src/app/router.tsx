import { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/app/auth-provider";

function RouteFallback() {
  return <div className="p-6 text-sm text-textMuted">Loading page...</div>;
}

function BanGuard({ children }: { children: React.ReactNode }) {
  const { isBanned, isBanStatusLoading, isTimedOut } = useAuth();
  if (isBanStatusLoading) {
    return <RouteFallback />;
  }
  if (isBanned) return <Navigate to="/banned" replace />;
  return isTimedOut ? <Navigate to="/timed-out" replace /> : children;
}

function lazyElement<T extends Record<string, React.ComponentType>>(loader: () => Promise<T>, exportName: keyof T) {
  const Component = lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as React.ComponentType };
  });

  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <BanGuard>{lazyElement(() => import("@/pages/simple-pages"), "LoginPage")}</BanGuard>,
  },
  {
    path: "/signup",
    element: <BanGuard>{lazyElement(() => import("@/pages/simple-pages"), "SignupPage")}</BanGuard>,
  },
  {
    path: "/onboarding",
    element: <BanGuard>{lazyElement(() => import("@/pages/simple-pages"), "OnboardingPage")}</BanGuard>,
  },
  {
    path: "/banned",
    element: lazyElement(() => import("@/pages/simple-pages"), "BannedPage"),
  },
  {
    path: "/timed-out",
    element: lazyElement(() => import("@/pages/simple-pages"), "TimedOutPage"),
  },
  {
    path: "/",
    element: <BanGuard><AppLayout /></BanGuard>,
    errorElement: lazyElement(() => import("@/pages/simple-pages"), "NotFoundPage"),
    children: [
      { index: true, element: lazyElement(() => import("@/pages/home-page"), "HomePage") },
      { path: "explore", element: lazyElement(() => import("@/pages/simple-pages"), "ExplorePage") },
      { path: "profile/:handle", element: lazyElement(() => import("@/pages/simple-pages"), "ProfilePage") },
      { path: "settings", element: lazyElement(() => import("@/pages/simple-pages"), "SettingsPage") },
      { path: "post/:postId", element: lazyElement(() => import("@/pages/simple-pages"), "PostPage") },
      { path: "chat", element: lazyElement(() => import("@/pages/simple-pages"), "ChatPage") },
      { path: "notifications", element: lazyElement(() => import("@/pages/simple-pages"), "NotificationsPage") },
      { path: "premium", element: lazyElement(() => import("@/pages/simple-pages"), "PremiumPage") },
      { path: "bookmarks", element: lazyElement(() => import("@/pages/simple-pages"), "BookmarksPage") },
      { path: "arcade", element: lazyElement(() => import("@/pages/simple-pages"), "ArcadePage") },
      { path: "market", element: lazyElement(() => import("@/pages/simple-pages"), "MarketPage") },
      { path: "crypto", element: lazyElement(() => import("@/pages/simple-pages"), "CryptoPage") },
      { path: "shop", element: lazyElement(() => import("@/pages/simple-pages"), "ShopPage") },
      { path: "leaderboard", element: lazyElement(() => import("@/pages/simple-pages"), "LeaderboardPage") },
      { path: "about", element: lazyElement(() => import("@/pages/simple-pages"), "AboutPage") },
    ],
  },
]);
