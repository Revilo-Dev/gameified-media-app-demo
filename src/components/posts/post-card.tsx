import { formatDistanceToNow } from "date-fns";
import { Flame, Laugh, Lightbulb, MessageCircle, Repeat2, Sparkles, ThumbsUp } from "lucide-react";
import { users } from "@/lib/demo-data";
import type { Post, ReactionType } from "@/types/models";
import { Avatar } from "@/components/common/avatar";
import { Card } from "@/components/common/card";
import { Button } from "@/components/common/button";

const reactionIcons: Record<ReactionType, typeof ThumbsUp> = {
  like: ThumbsUp,
  fire: Flame,
  insightful: Lightbulb,
  funny: Laugh,
  gg: Sparkles,
};

export function PostCard({ post }: { post: Post }) {
  const author = users.find((user) => user.uid === post.authorId) ?? users[0];
  const LikeIcon = reactionIcons.like;

  return (
    <Card className="p-5">
      <div className="flex gap-4">
        <Avatar name={author.displayName} src={author.photoURL} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{author.displayName}</span>
            <span className="text-sm text-textMuted">@{author.handle}</span>
            <span className="text-sm text-textMuted">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text">{post.content}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-accent">
            {post.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-textMuted">
            <Button variant="ghost" className="gap-2 px-0">
              <LikeIcon size={16} /> {post.reactionCount}
            </Button>
            <Button variant="ghost" className="gap-2 px-0">
              <MessageCircle size={16} /> {post.replyCount}
            </Button>
            <Button variant="ghost" className="gap-2 px-0">
              <Repeat2 size={16} /> {post.repostCount}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
