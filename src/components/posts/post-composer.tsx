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

const postSchema = z.object({
  content: z.string().trim().min(1).max(300),
});

type PostFormValues = z.infer<typeof postSchema>;

export function PostComposer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingImageURL, setPendingImageURL] = useState<string | null>(null);
  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { content: "" },
  });

  const content = watch("content");

  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setProfile(null);
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

          await createPost({
            authorId: user.uid,
            content: values.content.trim(),
            imageURL: pendingImageURL,
            parentPostId: null,
            repostedPostId: null,
            quotedPostId: null,
            tags: [],
            visibility: "public",
          });
          await addXpToUser(user.uid, 5);
          toast.success("Post published", { description: `Posted "${values.content.slice(0, 40)}${values.content.length > 40 ? "..." : ""}"` });
          reset();
          setPendingImageURL(null);
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
                  setPendingImageURL(imageURL);
                  toast.success("Image attached", {
                    description: isPremium ? "Premium accounts can upload up to 500MB." : "Standard accounts can upload up to 100MB.",
                  });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to upload image");
                }
              }}
            />
          </label>
        </div>
        <p className="text-xs text-textMuted">
          {pendingImageURL ? "Image attached." : isPremium ? "Image uploads up to 500MB." : "Image uploads up to 100MB."}
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
