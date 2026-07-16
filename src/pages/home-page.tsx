import { PostComposer } from "@/components/posts/post-composer";
import { PostCard } from "@/components/posts/post-card";
import { Card } from "@/components/common/card";
import { useUiStore } from "@/store/use-ui-store";
import { useEffect, useState } from "react";
import type { Post } from "@/types/models";
import { subscribeToPosts } from "@/firebase/posts";
import { useAuth } from "@/app/auth-provider";
import { Link } from "react-router-dom";

export function HomePage() {
  const { timelineTab, setTimelineTab } = useUiStore();
  const { user, isLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    return subscribeToPosts(setPosts);
  }, []);

  return (
    <div className="space-y-5">
      <Card className="sticky top-0 z-10 border-0 bg-canvas/85 p-3 shadow-none backdrop-blur md:border md:border-border/60 md:shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Home</h1>
          <div className="flex items-center rounded-full bg-surfaceAlt/90 p-1 shadow-sm">
            <button
              className={`rounded-full px-4 py-2 text-sm transition ${timelineTab === "for-you" ? "bg-[color:var(--accent)] text-white shadow-sm" : "text-textMuted"}`}
              onClick={() => setTimelineTab("for-you")}
            >
              For You
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm transition ${timelineTab === "following" ? "bg-[color:var(--accent)] text-white shadow-sm" : "text-textMuted"}`}
              onClick={() => setTimelineTab("following")}
            >
              Following
            </button>
          </div>
        </div>
      </Card>
      {isLoading ? (
        <Card className="p-6 text-sm text-textMuted">Loading session...</Card>
      ) : user ? (
        <>
          <PostComposer />
          {posts
            .filter((post) => !post.parentPostId)
            .map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
        </>
      ) : (
        <Card className="space-y-4 p-6">
          <p className="text-sm text-textMuted">Sign in to see your feed and publish posts.</p>
          <Link
            to="/login"
            className="inline-flex w-fit items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Go to login
          </Link>
        </Card>
      )}
    </div>
  );
}
