import { Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { Avatar } from "@/components/common/avatar";
import { useAuth } from "@/app/auth-provider";
import { createPost } from "@/firebase/posts";
import { addXpToUser, subscribeToUserProfileById } from "@/firebase/users";
import { uploadPostImage } from "@/firebase/storage";
import { useEffect, useState } from "react";
import type { UserProfile } from "@/types/models";
import { UserBadges } from "@/components/common/user-badges";
import { getPostingCooldownRemainingSeconds } from "@/features/gamification/anti-abuse";

const POST_COOLDOWN_STORAGE_KEY = "pulsearc-last-post-at";

const postSchema = z.object({
  content: z.string().trim().min(1).max(300),
  pollQuestion: z.string().trim().max(120).optional(),
  pollOptionOne: z.string().trim().max(60).optional(),
  pollOptionTwo: z.string().trim().max(60).optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

export function PostComposer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingImage, setPendingImage] = useState<{ url: string; storagePath: string } | null>(null);
  const [pendingGifURL, setPendingGifURL] = useState<string | null>(null);
  const [pollEnabled, setPollEnabled] = useState(false);
  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { content: "", pollQuestion: "", pollOptionOne: "", pollOptionTwo: "" },
  });

  const content = watch("content");

  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setProfile(null);
      setPendingImage(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, (profile) => {
      setIsPremium(profile?.isPremium ?? false);
      setProfile(profile);
    });
  }, [user]);

  return (
    <Card className="p-5">
      <form
        onSubmit={handleSubmit(async (values) => {
          if (!user) {
            navigate("/login");
            return;
          }

          const now = new Date();
          const lastPostedAtRaw = window.localStorage.getItem(POST_COOLDOWN_STORAGE_KEY);
          const lastPostedAt = lastPostedAtRaw ? new Date(lastPostedAtRaw) : null;
          const cooldownRemaining = getPostingCooldownRemainingSeconds(lastPostedAt, now);

          if (cooldownRemaining > 0) {
            toast.error(`Wait ${cooldownRemaining}s before posting again.`);
            return;
          }

          await createPost({
            authorId: user.uid,
            content: values.content.trim(),
            imageURL: pendingImage?.url ?? null,
            imageStoragePath: pendingImage?.storagePath ?? null,
            gifURL: pendingGifURL?.trim() ? pendingGifURL.trim() : null,
            parentPostId: null,
            repostedPostId: null,
            quotedPostId: null,
            tags: [],
            visibility: "public",
            poll:
              pollEnabled && values.pollQuestion?.trim() && values.pollOptionOne?.trim() && values.pollOptionTwo?.trim()
                ? {
                    question: values.pollQuestion.trim(),
                    options: [values.pollOptionOne.trim(), values.pollOptionTwo.trim()],
                    votes: { [values.pollOptionOne.trim()]: [], [values.pollOptionTwo.trim()]: [] },
                    endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                  }
                : null,
          });
          await addXpToUser(user.uid, 5);
          window.localStorage.setItem(POST_COOLDOWN_STORAGE_KEY, now.toISOString());
          toast.success("Post published", { description: `Posted "${values.content.slice(0, 40)}${values.content.length > 40 ? "..." : ""}"` });
          reset();
          setPendingImage(null);
          setPendingGifURL(null);
          setPollEnabled(false);
        })}
        className="space-y-4"
      >
        <div className="flex gap-4">
          <Avatar name={user?.displayName ?? "Guest"} src={profile?.photoURL ?? null} />
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{profile?.displayName ?? user?.displayName ?? "Guest"}</p>
                {profile ? <span className="rounded-full bg-[color:var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent)]">Lv {profile.level}</span> : null}
                {profile ? <UserBadges user={profile} /> : null}
              </div>
              <p className="text-sm text-textMuted">@{profile?.handle ?? "guest"}</p>
            </div>
            <textarea
              {...register("content")}
              placeholder="Share a pulse with your crew..."
              className="min-h-28 w-full resize-none rounded-3xl border border-border bg-transparent p-4 text-sm text-text outline-none placeholder:text-textMuted"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-textMuted">{content.length}/300</span>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-full border border-border px-3 py-2 text-sm">
              Add image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }

                  try {
                    const imageURL = await uploadPostImage(file);
                    setPendingImage(imageURL);
                    toast.success("Image attached", {
                      description: isPremium ? "Premium accounts can upload up to 500MB." : "Standard accounts can upload up to 100MB.",
                    });
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to upload image");
                  }
                }}
              />
            </label>
            <Button type="button" variant="secondary" onClick={() => setPendingGifURL((value) => value ?? "")}>
              {pendingGifURL ? "Change GIF" : "Add GIF URL"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPollEnabled((value) => !value)}>
              {pollEnabled ? "Poll enabled" : "Create poll"}
            </Button>
          </div>
        </div>
        {pendingGifURL !== null ? (
          <div className="space-y-2 rounded-3xl border border-border p-4">
            <p className="text-sm font-semibold">GIF URL</p>
            <input
              value={pendingGifURL}
              onChange={(event) => setPendingGifURL(event.target.value)}
              placeholder="Paste a GIF URL"
              className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none"
            />
          </div>
        ) : null}
        {pollEnabled ? (
          <div className="space-y-3 rounded-3xl border border-border p-4">
            <p className="text-sm font-semibold">Poll</p>
            <input {...register("pollQuestion")} placeholder="Poll question" className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none" />
            <div className="grid gap-2 md:grid-cols-2">
              <input {...register("pollOptionOne")} placeholder="Option 1" className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none" />
              <input {...register("pollOptionTwo")} placeholder="Option 2" className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none" />
            </div>
            <p className="text-xs text-textMuted">Polls end 1 hour after posting.</p>
          </div>
        ) : null}
        <p className="text-xs text-textMuted">
          {pendingImage ? "Image attached." : isPremium ? "Image uploads up to 500MB." : "Image uploads up to 100MB."}
        </p>
        {errors.content ? <p className="text-sm text-red-500">{errors.content.message}</p> : null}
        <div className="flex justify-end">
          <Button disabled={isSubmitting || !content.trim()} className="gap-2">
            <Send size={16} />
            Post
          </Button>
        </div>
      </form>
    </Card>
  );
}
