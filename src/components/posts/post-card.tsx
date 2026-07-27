import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, Laugh, Lightbulb, MessageCircle, Sparkles, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { arrayRemove, arrayUnion, deleteDoc, doc, increment, updateDoc } from "firebase/firestore";
import { users } from "@/lib/demo-data";
import type { Post, ReactionType, UserProfile } from "@/types/models";
import { Avatar } from "@/components/common/avatar";
import { Card } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { InlineEntities } from "@/components/common/inline-entities";
import { db } from "@/firebase/config";
import { addGemsToUser, addXpToUser, getDemoUserById, subscribeToUserProfileById } from "@/firebase/users";
import { useAuth } from "@/app/auth-provider";
import { setFollowingRelationship, subscribeToFollowRelationship } from "@/firebase/follows";
import { setPostBookmarked, subscribeToBookmarkedPostIds } from "@/firebase/bookmarks";
import { UserBadges } from "@/components/common/user-badges";
import { createNotification } from "@/firebase/notifications";

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
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [author, setAuthor] = useState<UserProfile | null>(users.find((item) => item.uid === post.authorId) ?? null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [reactionType, setReactionType] = useState<ReactionType | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<ReactionType, number>>({
    like: post.reactionTypeCounts?.like ?? 0,
    fire: post.reactionTypeCounts?.fire ?? 0,
    insightful: post.reactionTypeCounts?.insightful ?? 0,
    funny: post.reactionTypeCounts?.funny ?? 0,
    gg: post.reactionTypeCounts?.gg ?? 0,
  });
  const profilePath = author ? `/profile/${author.handle}` : "/profile/novavale";
  const poll = post.poll ?? null;
  const pollEnded = poll ? new Date(poll.endsAt).getTime() <= Date.now() : false;
  const currentPollVote = poll && currentUserProfile ? poll.options.find((option) => poll.votes?.[option]?.includes(currentUserProfile.uid)) ?? null : null;
  const bookmarkCount = useMemo(() => post.bookmarkCount, [post.bookmarkCount]);

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
    if (!user) {
      setIsBookmarked(false);
      return;
    }

    return subscribeToBookmarkedPostIds(user.uid, (postIds) => {
      setIsBookmarked(postIds.includes(post.id));
    });
  }, [post.id, user]);

  useEffect(() => {
    setAuthor(getDemoUserById(post.authorId) ?? null);

    return subscribeToUserProfileById(post.authorId, (profile) => {
      if (!profile) {
        console.warn("[post-card] missing author profile", { postId: post.id, authorId: post.authorId });
      }

      setAuthor(profile ?? getDemoUserById(post.authorId) ?? null);
    });
  }, [post.authorId, post.id]);

  async function handlePollVote(option: string) {
    if (!poll || !currentUserProfile || pollEnded) {
      return;
    }

    const previousChoice = poll.options.find((candidate) => poll.votes?.[candidate]?.includes(currentUserProfile.uid));
    const updates: Record<string, unknown> = {
      [`poll.votes.${option}`]: arrayUnion(currentUserProfile.uid),
    };

    if (previousChoice && previousChoice !== option) {
      updates[`poll.votes.${previousChoice}`] = arrayRemove(currentUserProfile.uid);
    }

    await updateDoc(doc(db, "posts", post.id), updates);
  }

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
        if (user?.uid && user.uid !== author.uid) {
          await createNotification({
            type: "reaction",
            title: "Your post got a like",
            body: `${currentUserProfile?.displayName ?? "Someone"} liked your post.`,
            actorId: user.uid,
            userId: author.uid,
            postId: post.id,
          });
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

  const canDeletePost = Boolean(currentUserProfile && (currentUserProfile.uid === author?.uid || currentUserProfile.isModerator));

  return (
    <Card className="group relative cursor-pointer p-4 transition hover:border-[color:var(--accent)]/30" onClick={() => navigate(`/post/${post.id}`)}>
      <div className="flex gap-3">
        <Avatar name={author?.displayName ?? "Unknown"} src={author?.photoURL ?? null} className="h-11 w-11 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="font-semibold text-left hover:underline"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(profilePath);
                  }}
                >
                  {author?.displayName ?? "Unknown profile"}
                </button>
                {author ? <span className="rounded-full bg-[color:var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent)]">Lv {author.level}</span> : null}
                {author ? <UserBadges user={author} /> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-textMuted">
                <span>@{author?.handle ?? "unknown"}</span>
                <span>{formatPostTime(post.createdAt)}</span>
              </div>
            </div>
            {author && currentUserProfile?.uid !== author.uid ? (
              <Button
                variant={isFollowed ? "secondary" : "ghost"}
                size="sm"
                className="shrink-0"
                disabled={isTogglingFollow}
                onClick={async (event) => {
                  event.stopPropagation();
                  if (!currentUserProfile) {
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
                {isTogglingFollow ? "..." : isFollowed ? "Following" : "Follow"}
              </Button>
            ) : null}
          </div>

          <p className="text-sm leading-6 text-text">
            <InlineEntities text={post.content} />
          </p>

          {post.gifURL ? (
            <img
              src={post.gifURL}
              alt="Attached GIF"
              className="max-h-[24rem] w-full rounded-3xl border border-border object-cover"
            />
          ) : null}
          {post.imageURL ? (
            <img
              src={post.imageURL}
              alt="Post attachment"
              className="max-h-[24rem] w-full rounded-3xl border border-border object-cover"
            />
          ) : null}
          {poll ? (
            <div className="space-y-3 rounded-3xl border border-border bg-surfaceAlt/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{poll.question}</p>
                <span className="text-xs text-textMuted">{pollEnded ? "Ended" : `Ends ${formatDistanceToNow(new Date(poll.endsAt), { addSuffix: true })}`}</span>
              </div>
              <div className="space-y-2">
                {poll.options.map((option) => {
                  const voteCount = poll.votes?.[option]?.length ?? 0;
                  const totalVotes = poll.options.reduce((count, candidate) => count + (poll.votes?.[candidate]?.length ?? 0), 0) || 1;
                  const percentage = Math.round((voteCount / totalVotes) * 100);

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={pollEnded || !currentUserProfile}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handlePollVote(option);
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        currentPollVote === option ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10" : "border-border bg-surface"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{option}</span>
                        <span className="text-xs text-textMuted">{voteCount} votes</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-surfaceAlt">
                        <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${percentage}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs text-accent">
            {post.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 text-textMuted">
            {(Object.keys(reactionIcons) as ReactionType[]).map((type) => {
              const Icon = reactionIcons[type];
              return (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  className={`gap-2 ${reactionType === type ? "text-accent" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleReact(type);
                  }}
                >
                  <Icon size={15} />
                  {reactionCounts[type]}
                </Button>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/post/${post.id}`);
              }}
            >
              <MessageCircle size={15} />
              {post.replyCount}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 ${isBookmarked ? "text-amber-400" : ""}`}
              onClick={async (event) => {
                event.stopPropagation();
                if (!user) {
                  navigate("/login");
                  return;
                }

                try {
                  await setPostBookmarked(user.uid, post.id, !isBookmarked);
                  setIsBookmarked(!isBookmarked);
                } catch (error) {
                  console.error("Failed to toggle bookmark", error);
                  toast.error("Bookmark action failed");
                }
              }}
            >
              <Bookmark size={15} fill={isBookmarked ? "currentColor" : "none"} />
              {bookmarkCount}
            </Button>
            {canDeletePost ? (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto gap-2 text-red-500"
                onClick={async (event) => {
                  event.stopPropagation();
                  await deleteDoc(doc(db, "posts", post.id));
                }}
              >
                <Trash2 size={15} />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
