import { ImagePlus, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { Avatar } from "@/components/common/avatar";
import { users } from "@/lib/demo-data";

const postSchema = z.object({
  content: z.string().trim().min(1).max(300),
});

type PostFormValues = z.infer<typeof postSchema>;

export function PostComposer() {
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

  return (
    <Card className="p-5">
      <form
        onSubmit={handleSubmit(async (values) => {
          await Promise.resolve();
          toast.success("+5 XP", { description: `Posted "${values.content.slice(0, 40)}${values.content.length > 40 ? "..." : ""}"` });
          reset();
        })}
        className="space-y-4"
      >
        <div className="flex gap-4">
          <Avatar name={users[0].displayName} />
          <textarea
            {...register("content")}
            placeholder="Share a pulse with your crew..."
            className="min-h-28 flex-1 resize-none rounded-3xl border border-border bg-transparent p-4 text-sm text-text outline-none placeholder:text-textMuted"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-textMuted">
            <ImagePlus size={18} />
            <span>One image, audience controls, and XP-safe posting hook ready for Firebase.</span>
          </div>
          <span className="text-sm text-textMuted">{content.length}/300</span>
        </div>
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
