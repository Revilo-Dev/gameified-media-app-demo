import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Laugh, Lightbulb, MessageCircle, Repeat2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { users } from "@/lib/demo-data";
import type { Post, ReactionType } from "@/types/models";
import { Avatar } from "@/components/common/avatar";
import { Card } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { deleteDoc, doc, increment, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { addGemsToUser, addXpToUser, getDemoUserById, subscribeToUserProfileById } from "@/firebase/users";
import type { UserProfile } from "@/types/models";
import { useAuth } from "@/app/auth-provider";
import { setFollowingRelationship, subscribeToFollowRelationship } from "@/firebase/follows";

const reactionIcons: Record<ReactionType, typeof ThumbsUp> = {
  like: ThumbsUp,
  fire: ThumbsDown,
  insightful: Lightbulb,
  funny: Laugh,
  gg: Sparkles,
};

function formatPostTime(createdAt: Post["createdAt"]) {
  const parsedDate = new Date(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return "just now";
  }

  return formatDistanceToNow(parsedDate, { addSuffix: true });
}

export function PostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isFollowed, setIsFollowed] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [author, setAuthor] = useState(users.find((item) => item.uid === post.authorId) ?? null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [reactionType, setReactionType] = useState<ReactionType | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<ReactionType, number>>({
    like: post.reactionTypeCounts?.like ?? 0,
    fire: post.reactionTypeCounts?.fire ?? 0,
    insightful: post.reactionTypeCounts?.insightful ?? 0,
    funny: post.reactionTypeCounts?.funny ?? 0,
    gg: post.reactionTypeCounts?.gg ?? 0,
  });
  const LikeIcon = reactionIcons.like;
  const DislikeIcon = reactionIcons.fire;
  const profilePath = author ? `/profile/${author.handle}` : "/profile/novavale";

  useEffect(() => {
    if (!user) {
      setCurrentUserProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, setCurrentUserProfile);
  }, [user]);

  useEffect(() => {
    if (!currentUserProfile || !author || currentUserProfile.uid === author.uid) {
      setIsFollowed(false);
      return;
    }

    return subscribeToFollowRelationship(currentUserProfile.uid, author.uid, setIsFollowed);
  }, [author?.uid, currentUserProfile?.uid]);

  useEffect(() => {
    setAuthor(getDemoUserById(post.authorId) ?? null);

    return subscribeToUserProfileById(post.authorId, (profile) => {
      if (!profile) {
        console.warn("[post-card] missing author profile", { postId: post.id, authorId: post.authorId });
      }

      setAuthor(profile ?? getDemoUserById(post.authorId) ?? null);
    });
  }, [post.authorId, post.id]);

  const canDeletePost = Boolean(currentUserProfile && (currentUserProfile.uid === author?.uid || currentUserProfile.isModerator));

  async function handleReact(nextReaction: ReactionType) {
    const currentReaction = reactionType;
    const currentCount = reactionCounts[nextReaction];

    try {
      if (currentReaction === nextReaction) {
        setReactionType(null);
        setReactionCounts((counts) => ({ ...counts, [nextReaction]: Math.max(0, counts[nextReaction] - 1) }));
        await updateDoc(doc(db, "posts", post.id), {
          [`reactionTypeCounts.${nextReaction}`]: increment(-1),
          reactionCount: increment(-1),
        });
        if (nextReaction === "like" && author) {
          await addXpToUser(author.uid, -10);
          if (user?.uid === author.uid) {
            await addGemsToUser(author.uid, -1);
          }
        }
        if (nextReaction === "fire" && author) {
          await addXpToUser(author.uid, 5);
        }
        return;
      }

      setReactionType(nextReaction);
      setReactionCounts((counts) => ({
        ...counts,
        [nextReaction]: currentCount + 1,
        ...(currentReaction ? { [currentReaction]: Math.max(0, counts[currentReaction] - 1) } : {}),
      }));

      const updates: Record<string, unknown> = {
        [`reactionTypeCounts.${nextReaction}`]: increment(1),
      };

      if (currentReaction) {
        updates[`reactionTypeCounts.${currentReaction}`] = increment(-1);
      } else {
        updates.reactionCount = increment(1);
      }

      await updateDoc(doc(db, "posts", post.id), updates);

      if (nextReaction === "like" && author) {
        await addXpToUser(author.uid, currentReaction === "fire" ? 15 : 10);
        if (user?.uid === author.uid) {
          await addGemsToUser(author.uid, 1);
        }
      }

      if (nextReaction === "fire" && author) {
        await addXpToUser(author.uid, currentReaction === "like" ? -15 : -5);
      }
    } catch (error) {
      toast.error("Reaction failed");
      console.error("Failed to update reaction", error);
    }
  }

  return (
    <Card className="group relative cursor-pointer p-5" onClick={() => navigate(`/post/${post.id}`)}>
      <div className="flex gap-4">
        <Avatar name={author?.displayName ?? "Unknown"} src={author?.photoURL ?? null} />
        <div className="min-w-0 flex-1">
          <div className="relative flex flex-wrap items-center gap-2">
            <div className="group/name relative inline-flex items-center">
            <button
              type="button"
              className="font-semibold text-left hover:underline"
              onClick={(event) => {
                event.stopPropagation();
                navigate(profilePath);
              }}
              >
                {author?.displayName ?? "Unknown profile"}
                {author ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-[color:var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent)]">
                    Lv {author.level}
                  </span>
                ) : null}
                {author?.isModerator ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-500">
                    Moderator
                  </span>
                ) : null}
              </button>
            <div className="absolute left-0 top-full z-20 mt-2 hidden w-72 rounded-3xl border border-border bg-surface p-4 shadow-panel group-hover/name:block">
              <div className="flex items-start gap-3">
                <Avatar name={author?.displayName ?? "Unknown"} src={author?.photoURL ?? null} />
                <div className="min-w-0">
                  <p className="font-semibold">{author?.displayName ?? "Unknown"}</p>
                  <p className="text-sm text-textMuted">@{author?.handle ?? "unknown"}</p>
                  <p className="mt-2 text-sm text-textMuted">{author?.bio ?? "No bio available."}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant={isFollowed ? "secondary" : "primary"}
                  className="flex-1"
                  disabled={!author || isTogglingFollow}
                  onClick={async (event) => {
                    event.stopPropagation();
                    if (!currentUserProfile || !author) {
                      return;
                    }

                    setIsTogglingFollow(true);
                    try {
                      await setFollowingRelationship(currentUserProfile.uid, author.uid, !isFollowed);
                    } catch (error) {
                      console.error("Failed to toggle follow relationship", error);
                      toast.error("Follow action failed");
                    } finally {
                      setIsTogglingFollow(false);
                    }
                  }}
                >
                  {isTogglingFollow ? "Saving..." : isFollowed ? "Unfollow" : "Follow"}
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(profilePath);
                  }}
                  disabled={!author}
                >
                  Visit
                </Button>
              </div>
            </div>
            </div>
            <span className="text-sm text-textMuted">@{author?.handle ?? "unknown"}</span>
            <span className="text-sm text-textMuted">{formatPostTime(post.createdAt)}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text">{post.content}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-accent">
            {post.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-textMuted">
            <Button
              variant="ghost"
              className="gap-2 px-0"
              onClick={(event) => {
                event.stopPropagation();
                handleReact("like");
              }}
            >
              <LikeIcon size={16} /> {reactionCounts.like}
            </Button>
            <Button
              variant="ghost"
              className="gap-2 px-0"
              onClick={(event) => {
                event.stopPropagation();
                handleReact("fire");
              }}
            >
              <DislikeIcon size={16} /> {reactionCounts.fire}
            </Button>
            <Button
              variant="ghost"
              className="gap-2 px-0"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/post/${post.id}`);
              }}
            >
              <MessageCircle size={16} /> {post.replyCount}
            </Button>
            <Button
              variant="ghost"
              className="gap-2 px-0"
              onClick={(event) => event.stopPropagation()}
            >
              <Repeat2 size={16} /> {post.repostCount}
            </Button>
            {canDeletePost ? (
              <Button
                variant="ghost"
                className="gap-2 px-0 text-red-500"
                onClick={async (event) => {
                  event.stopPropagation();
                  await deleteDoc(doc(db, "posts", post.id));
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
