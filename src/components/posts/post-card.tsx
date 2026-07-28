import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { Bookmark, Flag, MessageCircle, MoreHorizontal, Send, Star, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/app/auth-provider";
import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { InlineEntities } from "@/components/common/inline-entities";
import { UserBadges } from "@/components/common/user-badges";
import { setPostBookmarked, subscribeToBookmarkedPostIds } from "@/firebase/bookmarks";
import { db } from "@/firebase/config";
import { setFollowingRelationship, subscribeToFollowRelationship } from "@/firebase/follows";
import { createNotification } from "@/firebase/notifications";
import { deletePostCascade, ratePost, removePostEmbed, subscribeToPostReactions, throwRottenTomato } from "@/firebase/posts";
import { getDemoUserById, subscribeToUserProfileById } from "@/firebase/users";
import type { Post, UserProfile } from "@/types/models";

function TomatoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 6c4.4 0 8 3.3 8 7.4 0 4.2-3.6 7.6-8 7.6s-8-3.4-8-7.6C4 9.3 7.6 6 12 6Z" fill="currentColor" />
      <path d="M9.2 5.8c.8-1.7 2-2.8 2.8-3 .8.2 2 1.3 2.8 3-1.3-.6-2-.8-2.8-.8s-1.5.2-2.8.8Z" fill="#6EBE4B" />
      <path d="M12 6c1.5-1.4 3.3-2.1 5.4-2-1 1.8-2.2 2.8-3.5 3.2M12 6c-1.5-1.4-3.3-2.1-5.4-2 1 1.8 2.2 2.8 3.5 3.2" stroke="#6EBE4B" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function formatPostTime(createdAt: string) {
  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return "just now";
  }

  return formatDistanceToNow(parsedDate, { addSuffix: true });
}

export function PostCard({
  post,
  replyContextLabel,
  onReply,
}: {
  post: Post;
  replyContextLabel?: string | null;
  onReply?: (() => void) | null;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(getDemoUserById(post.authorId) ?? null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submittingStar, setSubmittingStar] = useState(false);
  const [submittingRottenTomato, setSubmittingRottenTomato] = useState(false);
  const [currentUserStars, setCurrentUserStars] = useState(0);
  const [hasThrownRottenTomato, setHasThrownRottenTomato] = useState(false);
  const poll = post.poll ?? null;
  const pollEnded = poll ? new Date(poll.endsAt).getTime() <= Date.now() : false;
  const currentPollVote = poll && currentUserProfile ? poll.options.find((option) => poll.votes?.[option]?.includes(currentUserProfile.uid)) ?? null : null;
  const canDeletePost = Boolean(currentUserProfile && (currentUserProfile.uid === post.authorId || currentUserProfile.isModerator));
  const canDeleteEmbed = Boolean(currentUserProfile?.isModerator && (post.imageURL || post.gifURL || post.poll));
  const profilePath = author ? `/profile/${author.handle}` : "/";

  useEffect(() => {
    if (!user) {
      setCurrentUserProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, setCurrentUserProfile);
  }, [user]);

  useEffect(() => {
    return subscribeToUserProfileById(post.authorId, (profile) => {
      setAuthor(profile ?? getDemoUserById(post.authorId) ?? null);
    });
  }, [post.authorId]);

  useEffect(() => {
    if (!currentUserProfile || !author || currentUserProfile.uid === author.uid) {
      setIsFollowed(false);
      return;
    }

    return subscribeToFollowRelationship(currentUserProfile.uid, author.uid, setIsFollowed);
  }, [author, currentUserProfile]);

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
    if (!user) {
      setCurrentUserStars(0);
      setHasThrownRottenTomato(false);
      return;
    }

    return subscribeToPostReactions(post.id, user.uid, ({ stars, hasRottenTomato }) => {
      setCurrentUserStars(stars);
      setHasThrownRottenTomato(hasRottenTomato);
    });
  }, [post.id, user]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  const totalPollVotes = useMemo(() => {
    if (!poll) {
      return 0;
    }

    return poll.options.reduce((count, option) => count + (poll.votes?.[option]?.length ?? 0), 0);
  }, [poll]);

  async function handlePollVote(option: string) {
    if (!currentUserProfile || !poll || pollEnded || currentPollVote) {
      return;
    }

    await updateDoc(doc(db, "posts", post.id), {
      [`poll.votes.${option}`]: arrayUnion(currentUserProfile.uid),
    });
  }

  async function handleStar(stars: number) {
    if (!currentUserProfile) {
      navigate("/login");
      return;
    }

    setSubmittingStar(true);
    try {
      await ratePost(post.id, currentUserProfile, stars);
      toast.success(`Rated ${stars}/5 stars`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rating failed");
    } finally {
      setSubmittingStar(false);
    }
  }

  async function handleRottenTomato() {
    if (!currentUserProfile) {
      navigate("/login");
      return;
    }

    setSubmittingRottenTomato(true);
    try {
      const result = await throwRottenTomato(post.id, currentUserProfile);
      toast.success(result.deleted ? "The post was deleted after 5 rotten tomatoes." : "Rotten tomato thrown");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rotten tomato failed");
    } finally {
      setSubmittingRottenTomato(false);
    }
  }

  return (
    <Card className="relative p-3 sm:p-4">
      <div className="flex gap-3">
        <Avatar name={author?.displayName ?? "Unknown"} src={author?.photoURL ?? null} className="h-10 w-10 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="text-left text-sm font-semibold hover:underline" onClick={() => navigate(profilePath)}>
                  {author?.displayName ?? "Unknown profile"}
                </button>
                {author ? <span className="rounded-full bg-[color:var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent)]">Lv {author.level}</span> : null}
                {author ? <UserBadges user={author} /> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-textMuted">
                <span>@{author?.handle ?? "unknown"}</span>
                <span>{formatPostTime(post.createdAt)}</span>
              </div>
              {replyContextLabel ? <div className="mt-1 text-xs text-[color:var(--accent)]">Replying to {replyContextLabel}</div> : null}
            </div>
            <div className="flex items-center gap-2">
              {author && currentUserProfile?.uid !== author.uid ? (
                <Button
                  variant={isFollowed ? "secondary" : "ghost"}
                  size="sm"
                  onClick={async () => {
                    if (!currentUserProfile) {
                      return;
                    }

                    try {
                      await setFollowingRelationship(currentUserProfile.uid, author.uid, !isFollowed);
                    } catch (error) {
                      console.error(error);
                      toast.error("Follow action failed");
                    }
                  }}
                >
                  {isFollowed ? "Following" : "Follow"}
                </Button>
              ) : null}
              <div ref={menuRef} className="relative">
                <Button type="button" variant="ghost" size="sm" onClick={() => setMenuOpen((value) => !value)}>
                  <MoreHorizontal size={16} />
                </Button>
                {menuOpen ? (
                  <div className="absolute right-0 top-10 z-20 w-44 rounded-2xl border border-border bg-canvas p-2 shadow-panel">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surfaceAlt"
                      onClick={async () => {
                        if (!currentUserProfile) {
                          navigate("/login");
                          return;
                        }

                        const moderators = ["demo-user"];
                        await Promise.all(moderators.map((moderatorId) => createNotification({
                          type: "report",
                          title: "Post reported",
                          body: `${currentUserProfile.displayName} reported a post for moderator review.`,
                          actorId: currentUserProfile.uid,
                          userId: moderatorId,
                          postId: post.id,
                        })));
                        setMenuOpen(false);
                        toast.success("Reported to moderators");
                      }}
                    >
                      <Flag size={15} />
                      Report
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surfaceAlt"
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                        setMenuOpen(false);
                        toast.success("Post link copied");
                      }}
                    >
                      <Send size={15} />
                      Share
                    </button>
                    {canDeleteEmbed ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surfaceAlt disabled:opacity-50"
                        onClick={async () => {
                          try {
                            await removePostEmbed(post.id);
                            setMenuOpen(false);
                            toast.success("Post embed removed");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Embed removal failed");
                          }
                        }}
                      >
                        <Trash2 size={15} />
                        Delete embed
                      </button>
                    ) : null}
                    {canDeletePost ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-500 hover:bg-surfaceAlt"
                        onClick={async () => {
                          try {
                            await deletePostCascade(post.id);
                            setMenuOpen(false);
                            toast.success("Post deleted");
                          } catch (error) {
                            console.error(error);
                            toast.error(error instanceof Error ? error.message : "Delete failed");
                          }
                        }}
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <button type="button" className="block w-full text-left" onClick={() => navigate(`/post/${post.id}`)}>
            <p className="text-sm leading-6 text-text">
              <InlineEntities text={post.content} />
            </p>
          </button>

          {post.gifURL ? <img src={post.gifURL} alt="Attached GIF" className="max-h-[20rem] w-full rounded-3xl border border-border object-cover" /> : null}
          {post.imageURL ? <img src={post.imageURL} alt="Post attachment" className="max-h-[20rem] w-full rounded-3xl border border-border object-cover" /> : null}

          {poll ? (
            <div className="space-y-3 rounded-3xl border border-border bg-surfaceAlt/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{poll.question}</p>
                <span className="text-xs text-textMuted">{pollEnded ? "Ended" : `Ends ${formatDistanceToNow(new Date(poll.endsAt), { addSuffix: true })}`}</span>
              </div>
              <div className="space-y-2">
                {poll.options.map((option) => {
                  const voteCount = poll.votes?.[option]?.length ?? 0;
                  const percentage = totalPollVotes ? Math.round((voteCount / totalPollVotes) * 100) : 0;

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={pollEnded || !currentUserProfile || Boolean(currentPollVote)}
                      onClick={() => void handlePollVote(option)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${
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

          <div className="flex flex-wrap items-center gap-2 text-xs text-textMuted">
            <div className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= currentUserStars;
                return (
                  <button
                    key={star}
                    type="button"
                    disabled={submittingStar}
                    className="rounded-full p-0.5 transition hover:scale-105"
                    aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                    onClick={() => void handleStar(star)}
                  >
                    <Star
                      size={14}
                      className={filled ? "text-[color:var(--accent)]" : "text-textMuted/50"}
                      fill={filled ? "currentColor" : "none"}
                    />
                  </button>
                );
              })}
              <span className="ml-1 text-text">{post.averageRating.toFixed(1)}</span>
              <span>({post.starRatingCount})</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={submittingRottenTomato || hasThrownRottenTomato}
              className={`gap-2 ${hasThrownRottenTomato ? "text-red-500" : "text-textMuted hover:text-red-500"}`}
              title={hasThrownRottenTomato ? "You already threw a rotten tomato" : "Costs 5 gems"}
              onClick={() => void handleRottenTomato()}
            >
              <TomatoIcon className="h-4 w-4" />
              <span>{post.rottenTomatoCount}</span>
            </Button>
            <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => (onReply ? onReply() : navigate(`/post/${post.id}`))}>
              <MessageCircle size={15} />
              {post.replyCount}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`gap-2 ${isBookmarked ? "text-amber-400" : ""}`}
              onClick={async () => {
                if (!user) {
                  navigate("/login");
                  return;
                }

                try {
                  await setPostBookmarked(user.uid, post.id, !isBookmarked);
                } catch (error) {
                  console.error(error);
                  toast.error("Bookmark action failed");
                }
              }}
            >
              <Bookmark size={15} fill={isBookmarked ? "currentColor" : "none"} />
              {post.bookmarkCount}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
