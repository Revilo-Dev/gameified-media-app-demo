import { useEffect, useRef, useState } from "react";
import { getLevelForXp, getXpProgress } from "@/constants/gamification";
import { cn } from "@/lib/utils";

interface XpProgressProps {
  xp: number;
  level: number;
  className?: string;
}

export function XpProgress({ xp, level, className }: XpProgressProps) {
  const displayLevel = Math.max(level, getLevelForXp(xp));
  const [displayedXp, setDisplayedXp] = useState(xp);
  const [xpDelta, setXpDelta] = useState(0);
  const [levelFlash, setLevelFlash] = useState(false);
  const previousXpRef = useRef<number | null>(null);
  const previousLevelRef = useRef<number>(displayLevel);

  useEffect(() => {
    const previousXp = previousXpRef.current;
    const previousLevel = previousLevelRef.current;

    if (previousXp === null) {
      previousXpRef.current = xp;
      previousLevelRef.current = displayLevel;
      setDisplayedXp(xp);
      return;
    }

    if (previousXp === xp) {
      setDisplayedXp(xp);
      return;
    }

    const delta = xp - previousXp;
    setXpDelta(delta);
    if (displayLevel > previousLevel) {
      setLevelFlash(true);
      window.setTimeout(() => setLevelFlash(false), 1400);
    }

    previousXpRef.current = xp;
    previousLevelRef.current = displayLevel;

    const duration = 700;
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progressValue = Math.min(1, (now - startedAt) / duration);
      setDisplayedXp(Math.round(previousXp + delta * progressValue));

      if (progressValue < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setDisplayedXp(xp);
        window.setTimeout(() => setXpDelta(0), 1000);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [displayLevel, xp]);

  const progress = getXpProgress(displayedXp, Math.max(level, getLevelForXp(displayedXp)));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-textMuted">
        <span className={levelFlash ? "xp-level-flash" : ""}>Level {displayLevel}</span>
        <span className="flex items-center gap-2">
          {progress.earned}/{progress.needed} XP
          {xpDelta !== 0 ? (
            <span className={`rounded-full px-2 py-0.5 font-semibold tabular-nums ${
              xpDelta > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-[color:var(--error)]/15 text-[color:var(--error)]"
            }`}>
              {xpDelta > 0 ? `+${xpDelta}` : xpDelta}
            </span>
          ) : null}
        </span>
      </div>
      <div className={`h-2 rounded-full bg-surfaceAlt ${levelFlash ? "xp-bar-level-flash" : ""}`}>
        <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${progress.percentage}%` }} />
      </div>
    </div>
  );
}
