import { Check, Crown, Sparkles } from "lucide-react";
import type { UserProfile } from "@/types/models";

export function UserBadges({ user, size = 12 }: { user: Pick<UserProfile, "isPremium" | "isPremiumPlus" | "isModerator">; size?: number }) {
  return (
    <>
      {user.isPremiumPlus ? <Sparkles size={size} className="text-fuchsia-300" /> : null}
      {user.isPremium ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300"><Check size={size} strokeWidth={3} /> Premium</span> : null}
      {user.isModerator ? <Crown size={size} className="text-amber-400" /> : null}
    </>
  );
}
