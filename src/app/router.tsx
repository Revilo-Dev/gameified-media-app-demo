import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { HomePage } from "@/pages/home-page";
import {
  AboutPage,
  ArcadePage,
  BookmarksPage,
  ChatPage,
  ExplorePage,
  LeaderboardPage,
  LoginPage,
  MarketPage,
  NotFoundPage,
  NotificationsPage,
  OnboardingPage,
  PostPage,
  ProfilePage,
  SettingsPage,
  ShopPage,
  SignupPage,
} from "@/pages/simple-pages";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    path: "/onboarding",
    element: <OnboardingPage />,
  },
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "profile/:handle", element: <ProfilePage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "post/:postId", element: <PostPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "bookmarks", element: <BookmarksPage /> },
      { path: "arcade", element: <ArcadePage /> },
      { path: "market", element: <MarketPage /> },
      { path: "shop", element: <ShopPage /> },
      { path: "leaderboard", element: <LeaderboardPage /> },
      { path: "about", element: <AboutPage /> },
    ],
  },
]);
