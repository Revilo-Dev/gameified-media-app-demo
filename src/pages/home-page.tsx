import { PostComposer } from "@/components/posts/post-composer";
import { PostCard } from "@/components/posts/post-card";
import { Card } from "@/components/common/card";
import { posts } from "@/lib/demo-data";
import { useUiStore } from "@/store/use-ui-store";

export function HomePage() {
  const { timelineTab, setTimelineTab } = useUiStore();

  return (
    <div className="space-y-5">
      <Card className="sticky top-0 z-10 border border-border/80 bg-canvas/90 p-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Home</h1>
          <div className="rounded-full bg-surfaceAlt p-1">
            <button
              className={`rounded-full px-4 py-2 text-sm ${timelineTab === "for-you" ? "bg-accent text-white" : ""}`}
              onClick={() => setTimelineTab("for-you")}
            >
              For You
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm ${timelineTab === "following" ? "bg-accent text-white" : ""}`}
              onClick={() => setTimelineTab("following")}
            >
              Following
            </button>
          </div>
        </div>
      </Card>
      <PostComposer />
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
