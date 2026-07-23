import { Check, Crown } from "lucide-react";
import type { UserProfile } from "@/types/models";

export function UserBadges({ user, size = 12 }: { user: Pick<UserProfile, "isPremium" | "isModerator">; size?: number }) {
  return (
    <>
      {user.isPremium ? <Check size={size} className="text-amber-400" strokeWidth={3} /> : null}
      {user.isModerator ? <Crown size={size} className="text-amber-400" /> : null}
    </>
  );
}
