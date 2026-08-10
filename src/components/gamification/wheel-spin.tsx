import { useEffect, useMemo, useRef, useState } from "react";
import { CircleGauge } from "lucide-react";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { useAuth } from "@/app/auth-provider";
import { addGemsToUser, addXpToUser, recordActivity, subscribeToUserProfileById, updateUserProfile } from "@/firebase/users";
import type { UserProfile } from "@/types/models";

const EXTRA_SPIN_COST = 150;
const FREE_SPINS_PER_DAY = 3;
const SEGMENTS = [
  { label: "#100", reward: 100, chance: 10 },
  { label: "#300", reward: 300, chance: 30 },
  { label: "#200", reward: 200, chance: 40 },
  { label: "#100", reward: 100, chance: 10 },
  { label: "Nothing", reward: 0, chance: 10 },
] as const;

function todayKey() { return new Date().toISOString().slice(0, 10); }

export function WheelSpin() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<typeof SEGMENTS[number] | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);
  const pendingSpinRef = useRef<{ result: typeof SEGMENTS[number]; userId: string } | null>(null);
  const today = todayKey();
  const spinsUsedToday = profile?.dailyWheelSpinDate === today ? Number(profile.dailyWheelSpinsUsed ?? 0) : 0;
  const freeSpinsRemaining = Math.max(0, FREE_SPINS_PER_DAY - spinsUsedToday);
  const wheelBackground = useMemo(() => {
    let start = 0;
    return `conic-gradient(${SEGMENTS.map((segment, index) => { const end = start + segment.chance; const tone = index % 2 ? "var(--surface-alt)" : "var(--surface)"; const stop = `${tone} ${start}% ${end}%`; start = end; return stop; }).join(", ")})`;
  }, []);
  const segmentCenters = useMemo(() => {
    let start = 0;
    return SEGMENTS.map((segment) => { const center = start + segment.chance * 1.8; start += segment.chance * 3.6; return center; });
  }, []);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  useEffect(() => () => { if (finishTimeoutRef.current) window.clearTimeout(finishTimeoutRef.current); }, []);

  async function finishSpin() {
    const pending = pendingSpinRef.current;
    if (!pending) return;
    pendingSpinRef.current = null;
    if (finishTimeoutRef.current) window.clearTimeout(finishTimeoutRef.current);
    if (pending.result.reward > 0) {
      await addGemsToUser(pending.userId, pending.result.reward);
      await addXpToUser(pending.userId, Math.max(1, Math.floor(pending.result.reward / 100)));
    }
    setResult(pending.result);
    setIsSpinning(false);
  }

  async function spin() {
    if (!user || !profile || isSpinning) return;
    const isFreeSpin = freeSpinsRemaining > 0;
    if (!isFreeSpin && profile.gems < EXTRA_SPIN_COST) return;
    const roll = Math.random() * 100;
    let cursor = 0;
    const selectedIndex = Math.max(0, SEGMENTS.findIndex((segment) => { cursor += segment.chance; return roll < cursor; }));
    const nextResult = SEGMENTS[selectedIndex];
    setIsSpinning(true); setResult(null);
    if (isFreeSpin) {
      await updateUserProfile(user.uid, { dailyWheelSpinDate: today, dailyWheelSpinsUsed: spinsUsedToday + 1 });
    } else {
      await addGemsToUser(user.uid, -EXTRA_SPIN_COST);
      await recordActivity(user.uid, "purchase", "Wheel Spin", `Purchased an extra Wheel Spin for ${EXTRA_SPIN_COST} gems`, EXTRA_SPIN_COST);
    }
    pendingSpinRef.current = { result: nextResult, userId: user.uid };
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    setRotation((current) => Math.ceil(current / 360) * 360 + 2520 - segmentCenters[selectedIndex]);
    finishTimeoutRef.current = window.setTimeout(() => { void finishSpin(); }, 3600);
  }

  return <Card className="space-y-5 p-5"><div className="flex items-center gap-2"><CircleGauge className="h-5 w-5 text-textMuted" /><div><h3 className="text-lg font-semibold">Wheel Spin</h3><p className="text-xs text-textMuted">{freeSpinsRemaining} of {FREE_SPINS_PER_DAY} free daily spins remaining</p></div></div><div className="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-center"><button type="button" onClick={() => { if (isSpinning) void finishSpin(); }} className={`relative mx-auto h-52 w-52 rounded-full ${isSpinning ? "cursor-pointer" : "cursor-default"}`} title={isSpinning ? "Click the wheel to stop" : undefined}><div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 text-base text-text">▼</div><div className="relative h-full w-full overflow-hidden rounded-full border-4 border-border" style={{ background: wheelBackground, transform: `rotate(${rotation}deg)`, transition: isSpinning ? "transform 3.6s cubic-bezier(.12,.78,.14,1)" : "none" }}>{SEGMENTS.map((segment, index) => <span key={`${segment.label}-${index}`} className="absolute left-1/2 top-1/2 z-10 text-xs font-bold text-text" style={{ transform: `translate(-50%, -50%) rotate(${segmentCenters[index]}deg) translateY(-72px) rotate(${-segmentCenters[index]}deg)` }}>{segment.label}</span>)}</div><span className="absolute inset-[4.2rem] z-10 grid place-items-center rounded-full border border-border bg-canvas text-xs font-semibold text-textMuted">{isSpinning ? "Tap to stop" : "Spin"}</span></button><div className="space-y-3"><div className="grid grid-cols-2 gap-2 text-xs">{SEGMENTS.map((segment, index) => <div key={`${segment.label}-${index}`} className="rounded-xl border border-border bg-surface px-3 py-2"><span className="font-semibold text-text">{segment.label}</span><span className="ml-2 text-textMuted">{segment.chance}%</span></div>)}</div><Button className="w-full" disabled={isSpinning || (!freeSpinsRemaining && (profile?.gems ?? 0) < EXTRA_SPIN_COST)} onClick={() => void spin()}>{isSpinning ? "Tap the wheel to stop" : freeSpinsRemaining ? `Use free spin (${freeSpinsRemaining} left)` : `Buy spin for ${EXTRA_SPIN_COST} gems`}</Button><p className="text-center text-sm text-textMuted">{result ? result.reward ? `${result.label} — you won ${result.reward} gems` : "Nothing this time." : "Three spins are free each day; extra spins cost 150 gems."}</p></div></div></Card>;
}
