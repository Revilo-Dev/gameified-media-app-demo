import { PostComposer } from "@/components/posts/post-composer";
import { PostCard } from "@/components/posts/post-card";
import { PostSkeleton } from "@/components/posts/post-skeleton";
import { Card } from "@/components/common/card";
import { useUiStore } from "@/store/use-ui-store";
import { useEffect, useState } from "react";
import type { Post } from "@/types/models";
import { subscribeToPosts } from "@/firebase/posts";
import { useAuth } from "@/app/auth-provider";
import { Link } from "react-router-dom";
import { subscribeToFollowingIds } from "@/firebase/follows";

const TIMELINE_PAGE_SIZE = 50;

export function HomePage() {
  const { timelineTab, setTimelineTab } = useUiStore();
  const { user, isLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [visiblePostCount, setVisiblePostCount] = useState(TIMELINE_PAGE_SIZE);

  useEffect(() => {
    return subscribeToPosts((nextPosts) => {
      setPosts(nextPosts);
      setIsPostsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setFollowingIds([]);
      return;
    }

    return subscribeToFollowingIds(user.uid, setFollowingIds);
  }, [user]);

  const visiblePosts = posts
    .filter((post) => !post.parentPostId)
    .filter((post) => timelineTab === "for-you" || followingIds.includes(post.authorId));
  const pagedPosts = visiblePosts.slice(0, visiblePostCount);
  const canLoadMorePosts = visiblePosts.length > visiblePostCount;

  useEffect(() => {
    setVisiblePostCount(TIMELINE_PAGE_SIZE);
  }, [timelineTab, user?.uid]);

  return (
    <div className="space-y-5">
      <Card className="sticky top-0 z-10 border-0 bg-canvas p-3 shadow-none md:border md:border-border md:shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Home</h1>

          </div>
          <div className="flex items-center rounded-full bg-surfaceAlt p-1 shadow-sm">
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
          {isPostsLoading ? Array.from({ length: 3 }).map((_, index) => (
            <PostSkeleton key={`post-skeleton-${index}`} />
          )) : pagedPosts.map((post) => (
              <PostCard key={post.id} post={post} priority="high" />
            ))}
          {!isPostsLoading && canLoadMorePosts ? (
            <Card className="p-4">
              <button
                type="button"
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => setVisiblePostCount((current) => current + TIMELINE_PAGE_SIZE)}
              >
                Load more posts
              </button>
            </Card>
          ) : null}
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
