import { getLevelForXp, getXpProgress } from "@/constants/gamification";
import { cn } from "@/lib/utils";

interface XpProgressProps {
  xp: number;
  level: number;
  className?: string;
}

export function XpProgress({ xp, level, className }: XpProgressProps) {
  const displayLevel = Math.max(level, getLevelForXp(xp));
  const progress = getXpProgress(xp, displayLevel);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-textMuted">
        <span>Level {displayLevel}</span>
        <span>
          {progress.earned}/{progress.needed} XP
        </span>
      </div>
      <div className="h-2 rounded-full bg-surfaceAlt">
        <div className="h-full rounded-full bg-accent" style={{ width: `${progress.percentage}%` }} />
      </div>
    </div>
  );
}
