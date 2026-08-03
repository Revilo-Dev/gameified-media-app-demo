import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ImagePlus, ListFilter, Plus, Send, SmilePlus, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { useAuth } from "@/app/auth-provider";
import { createNotification, getUserProfile } from "@/firebase/notifications";
import { createPost, createReply, extractMentions } from "@/firebase/posts";
import { addXpToUser, subscribeToUserProfileByHandle, subscribeToUserProfileById } from "@/firebase/users";
import { uploadPostImage } from "@/firebase/storage";
import { getPostingCooldownRemainingSeconds } from "@/features/gamification/anti-abuse";
import { UserBadges } from "@/components/common/user-badges";
import type { Post, UserProfile } from "@/types/models";

const POST_COOLDOWN_STORAGE_KEY = "pulsearc-last-post-at";
const REPLY_COOLDOWN_STORAGE_KEY = "pulsearc-last-reply-at";
const POLL_DURATION_OPTIONS = [
  { label: "1H", hours: 1 },
  { label: "5H", hours: 5 },
  { label: "10H", hours: 10 },
  { label: "1D", hours: 24 },
  { label: "3D", hours: 72 },
  { label: "1WK", hours: 168 },
] as const;

const postSchema = z.object({
  content: z.string().trim().min(1).max(300),
  pollQuestion: z.string().trim().max(120).optional(),
  pollOptionOne: z.string().trim().max(60).optional(),
  pollOptionTwo: z.string().trim().max(60).optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

interface GifResult {
  id: string;
  preview: string;
  url: string;
}

async function searchGifs(queryText: string): Promise<GifResult[]> {
  const apiKey = import.meta.env.VITE_TENOR_API_KEY;
  if (!apiKey) {
    throw new Error("Add VITE_TENOR_API_KEY to enable GIF search.");
  }

  const response = await fetch(`https://tenor.googleapis.com/v2/search?key=${apiKey}&q=${encodeURIComponent(queryText)}&limit=8&media_filter=gif,tinygif`);
  if (!response.ok) {
    throw new Error("GIF search failed.");
  }

  const payload = await response.json() as {
    results?: Array<{
      id?: string;
      media_formats?: {
        gif?: { url?: string };
        tinygif?: { url?: string };
      };
    }>;
  };

  return (payload.results ?? [])
    .map((item) => ({
      id: String(item.id ?? ""),
      preview: item.media_formats?.tinygif?.url ?? item.media_formats?.gif?.url ?? "",
      url: item.media_formats?.gif?.url ?? item.media_formats?.tinygif?.url ?? "",
    }))
    .filter((item) => item.id && item.preview && item.url);
}

export function PostComposer({
  parentPost,
  replyToPost,
  onPosted,
  onCancel,
  mode = "card",
}: {
  parentPost?: Post | null;
  replyToPost?: Post | null;
  onPosted?: () => void;
  onCancel?: () => void;
  mode?: "card" | "modal" | "reply";
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingImages, setPendingImages] = useState<Array<{ url: string; storagePath: string }>>([]);
  const [pendingGifURL, setPendingGifURL] = useState<string | null>(null);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [mediaMenuOpen, setMediaMenuOpen] = useState(false);
  const [pollDuration, setPollDuration] = useState<(typeof POLL_DURATION_OPTIONS)[number]>(POLL_DURATION_OPTIONS[0]);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [isGifLoading, setIsGifLoading] = useState(false);
  const mediaMenuRef = useRef<HTMLDivElement | null>(null);
  const isReply = Boolean(parentPost);
  const storageKey = isReply ? REPLY_COOLDOWN_STORAGE_KEY : POST_COOLDOWN_STORAGE_KEY;
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { content: "", pollQuestion: "", pollOptionOne: "", pollOptionTwo: "" },
  });

  const content = form.watch("content");
  const timeoutUntil = profile?.timeoutUntil ? new Date(profile.timeoutUntil) : null;
  const isTimedOut = Boolean(timeoutUntil && !Number.isNaN(timeoutUntil.getTime()) && timeoutUntil.getTime() > Date.now());
  const attachmentLabel = useMemo(() => {
    if (pendingImages.length) {
      return `${pendingImages.length} image${pendingImages.length === 1 ? "" : "s"} attached`;
    }
    if (pendingGifURL) {
      return "GIF attached";
    }
    if (pollEnabled) {
      return "Poll attached";
    }
    return "Add media";
  }, [pendingGifURL, pendingImages, pollEnabled]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  useEffect(() => {
    if (!mediaMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!mediaMenuRef.current?.contains(event.target as Node)) {
        setMediaMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [mediaMenuOpen]);

  async function appendImages(files: File[]) {
    if (!files.length) {
      return;
    }

    const remainingSlots = Math.max(0, 3 - pendingImages.length);
    if (!remainingSlots) {
      toast.error("You can attach up to 3 images per post.");
      return;
    }

    const nextFiles = files.slice(0, remainingSlots);
    const uploadedImages = await Promise.all(nextFiles.map((file) => uploadPostImage(file)));
    setPendingGifURL(null);
    setPollEnabled(false);
    setPendingImages((current) => [...current, ...uploadedImages].slice(0, 3));
  }

  async function notifyMentions(contentValue: string, postId: string) {
    if (!user || !profile) {
      return;
    }

    const mentions = extractMentions(contentValue);
    for (const handle of mentions) {
      const mentionedProfile = await new Promise<UserProfile | null>((resolve) => {
        const unsubscribe = subscribeToUserProfileByHandle(handle, (foundProfile) => {
          unsubscribe();
          resolve(foundProfile);
        });
      });

      if (!mentionedProfile || mentionedProfile.uid === user.uid) {
        continue;
      }

      await createNotification({
        type: "mention",
        title: "You were mentioned",
        body: `${profile.displayName} mentioned you in a post.`,
        actorId: user.uid,
        userId: mentionedProfile.uid,
        postId,
      });
    }
  }

  async function handleGifSearch() {
    if (!gifQuery.trim()) {
      setGifResults([]);
      return;
    }

    setIsGifLoading(true);
    try {
      setGifResults(await searchGifs(gifQuery.trim()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GIF search failed.");
    } finally {
      setIsGifLoading(false);
    }
  }

  async function onSubmit(values: PostFormValues) {
    if (!user) {
      navigate("/login");
      return;
    }

    if (isTimedOut) {
      toast.error(`You are timed out until ${timeoutUntil?.toLocaleString()}.`);
      return;
    }

    const now = new Date();
    const lastPostedAtRaw = window.localStorage.getItem(storageKey);
    const lastPostedAt = lastPostedAtRaw ? new Date(lastPostedAtRaw) : null;
    const cooldownRemaining = getPostingCooldownRemainingSeconds(lastPostedAt, now);

    if (cooldownRemaining > 0) {
      toast.error(`Wait ${cooldownRemaining}s before ${isReply ? "replying" : "posting"} again.`);
      return;
    }

    const payload = {
      authorId: user.uid,
      content: values.content.trim(),
      imageURL: pendingImages[0]?.url ?? null,
      imageStoragePath: pendingImages[0]?.storagePath ?? null,
      imageUrls: pendingImages.map((image) => image.url),
      imageStoragePaths: pendingImages.map((image) => image.storagePath),
      gifURL: pendingGifURL ?? null,
      parentPostId: parentPost?.id ?? null,
      repostedPostId: null,
      quotedPostId: null,
      replyToPostId: replyToPost?.id ?? null,
      tags: [],
      visibility: "public" as const,
      poll:
        !isReply && pollEnabled && values.pollQuestion?.trim() && values.pollOptionOne?.trim() && values.pollOptionTwo?.trim()
          ? {
              question: values.pollQuestion.trim(),
              options: [values.pollOptionOne.trim(), values.pollOptionTwo.trim()],
              votes: { [values.pollOptionOne.trim()]: [], [values.pollOptionTwo.trim()]: [] },
              endsAt: new Date(Date.now() + pollDuration.hours * 60 * 60 * 1000).toISOString(),
              durationLabel: pollDuration.label,
            }
          : null,
    };

    const created = isReply ? await createReply(payload) : await createPost(payload);
    await addXpToUser(user.uid, 10);
    window.localStorage.setItem(storageKey, now.toISOString());

    if (parentPost && parentPost.authorId !== user.uid && profile) {
      await createNotification({
        type: "reply",
        title: "New reply",
        body: `${profile.displayName} replied to your post.`,
        actorId: user.uid,
        userId: parentPost.authorId,
        postId: parentPost.id,
      });
    }

    if (replyToPost && replyToPost.authorId !== user.uid && profile) {
      await createNotification({
        type: "reply",
        title: "New threaded reply",
        body: `${profile.displayName} replied to your comment.`,
        actorId: user.uid,
        userId: replyToPost.authorId,
        postId: parentPost?.id ?? replyToPost.id,
      });
    }

    await notifyMentions(values.content, created.id);
    form.reset();
    setPendingImages([]);
    setPendingGifURL(null);
    setPollEnabled(false);
    setGifQuery("");
    setGifResults([]);
    onPosted?.();
    toast.success(isReply ? "Reply posted" : "Post published");
  }

  const shellClassName = mode === "modal" ? "p-0 shadow-none border-0 bg-transparent" : "p-4 sm:p-5";

  return (
    <Card className={shellClassName}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="flex items-start gap-3">
          <Avatar
            name={profile?.displayName ?? user?.displayName ?? "Guest"}
            src={profile?.photoURL ?? null}
            className="h-10 w-10 rounded-2xl"
            borderId={profile?.equippedProfileBorderId}
          />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-sm font-semibold">{profile?.displayName ?? user?.displayName ?? "Guest"}</p>
              {profile ? <span className="rounded-full bg-[color:var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent)]">Lv {profile.level}</span> : null}
              {profile ? <UserBadges user={profile} /> : null}
            </div>
            <div className="relative overflow-visible rounded-[1.75rem] border border-border bg-surface">
              <textarea
                {...form.register("content")}
                placeholder={isReply ? "Write a reply..." : "Share a something..."}
                disabled={isTimedOut}
                onPaste={async (event) => {
                  const imageFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
                  if (!imageFiles.length) {
                    return;
                  }

                  event.preventDefault();
                  try {
                    await appendImages(imageFiles);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to attach pasted image");
                  }
                }}
                className="min-h-28 w-full resize-none bg-transparent px-4 pb-12 pt-4 text-sm text-text outline-none placeholder:text-textMuted"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2">
                <div ref={mediaMenuRef} className="relative">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-canvas px-3 text-sm"
                    onClick={() => setMediaMenuOpen((value) => !value)}
                  >
                    <Plus size={15} />
                    {attachmentLabel}
                    <ChevronDown size={14} />
                  </button>
                  {mediaMenuOpen ? (
                    <div className="absolute bottom-12 left-0 z-20 w-48 rounded-2xl border border-border bg-canvas p-2 shadow-panel">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surfaceAlt"
                        onClick={() => {
                          setPendingGifURL(null);
                          setPollEnabled(false);
                          setMediaMenuOpen(false);
                          document.getElementById("composer-image-input")?.click();
                        }}
                      >
                        <ImagePlus size={16} />
                        Image
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surfaceAlt"
                        onClick={() => {
                          setPendingImages([]);
                          setPollEnabled(false);
                          setPendingGifURL("");
                          setMediaMenuOpen(false);
                        }}
                      >
                        <SmilePlus size={16} />
                        GIF
                      </button>
                      {!isReply ? (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surfaceAlt"
                          onClick={() => {
                            setPendingImages([]);
                            setPendingGifURL(null);
                            setPollEnabled(true);
                            setMediaMenuOpen(false);
                          }}
                        >
                          <ListFilter size={16} />
                          Poll
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-textMuted">{content.length}/300</span>
                  <Button type="submit" size="sm" disabled={isTimedOut || form.formState.isSubmitting || !content.trim()} className="gap-2">
                    <Send size={14} />
                    {isTimedOut ? "Timed out" : isReply ? "Reply" : "Post"}
                  </Button>
                </div>
              </div>
            </div>
            {isTimedOut ? <p className="mt-2 text-xs text-red-300">Posting is disabled until {timeoutUntil?.toLocaleString()}.</p> : null}
          </div>
        </div>

        <input
          id="composer-image-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            if (!files.length) {
              return;
            }

            try {
              await appendImages(files);
              event.currentTarget.value = "";
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Unable to upload image");
            }
          }}
          multiple
        />

        {pendingImages.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingImages.map((image, index) => (
              <div key={image.storagePath} className="relative overflow-hidden rounded-3xl border border-border">
                <img src={image.url} alt={`Selected upload ${index + 1}`} className="max-h-64 w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-3 top-3 rounded-full bg-canvas/90 p-2"
                  onClick={() => setPendingImages((current) => current.filter((item) => item.storagePath !== image.storagePath))}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {pendingGifURL !== null ? (
          <div className="space-y-3 rounded-3xl border border-border p-4">
            <div className="flex items-center gap-2">
              <input
                value={gifQuery}
                onChange={(event) => setGifQuery(event.target.value)}
                placeholder="Search GIFs"
                className="min-w-0 flex-1 rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none"
              />
              <Button type="button" variant="secondary" onClick={() => void handleGifSearch()}>
                Search
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPendingGifURL(null)}>
                <X size={14} />
              </Button>
            </div>
            {pendingGifURL ? <img src={pendingGifURL} alt="Selected GIF" className="max-h-72 w-full rounded-3xl object-cover" /> : null}
            {isGifLoading ? <p className="text-sm text-textMuted">Loading GIFs...</p> : null}
            {gifResults.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {gifResults.map((gif) => (
                  <button key={gif.id} type="button" className="overflow-hidden rounded-2xl border border-border" onClick={() => setPendingGifURL(gif.url)}>
                    <img src={gif.preview} alt="" className="h-28 w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {pollEnabled ? (
          <div className="space-y-3 rounded-3xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Poll</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPollEnabled(false)}>
                <X size={14} />
              </Button>
            </div>
            <input {...form.register("pollQuestion")} placeholder="Poll question" className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none" />
            <div className="grid gap-2 md:grid-cols-2">
              <input {...form.register("pollOptionOne")} placeholder="Option 1" className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none" />
              <input {...form.register("pollOptionTwo")} placeholder="Option 2" className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none" />
            </div>
            <div className="flex flex-wrap gap-2">
              {POLL_DURATION_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className={`rounded-full border px-3 py-2 text-xs font-semibold ${pollDuration.label === option.label ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--accent)]" : "border-border text-textMuted"}`}
                  onClick={() => setPollDuration(option)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {form.formState.errors.content ? <p className="text-sm text-red-500">{form.formState.errors.content.message}</p> : null}
        {mode !== "card" && onCancel ? (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={onCancel}>Close</Button>
          </div>
        ) : null}
      </form>
    </Card>
  );
}
