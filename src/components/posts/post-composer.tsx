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

const postSchema = z.object({
  content: z.string().trim().min(1).max(300),
});

type PostFormValues = z.infer<typeof postSchema>;

export function PostComposer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
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
      return;
    }

    return subscribeToUserProfileById(user.uid, (profile) => {
      setIsPremium(profile?.isPremium ?? false);
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

          if (pendingImageURL && !isPremium) {
            toast.error("Premium required", { description: "Only premium accounts can upload post images." });
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
          <Avatar name={user?.displayName ?? "Guest"} />
          <textarea
            {...register("content")}
            placeholder="Share a pulse with your crew..."
            className="min-h-28 flex-1 resize-none rounded-3xl border border-border bg-transparent p-4 text-sm text-text outline-none placeholder:text-textMuted"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-textMuted">{content.length}/300</span>
          {isPremium ? (
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
                    toast.success("Image attached");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to upload image");
                  }
                }}
              />
            </label>
          ) : (
            <span className="text-xs text-textMuted">Text posts only for free accounts</span>
          )}
        </div>
        {pendingImageURL ? <p className="text-xs text-textMuted">Image attached</p> : null}
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
