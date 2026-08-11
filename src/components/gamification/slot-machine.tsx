import { useEffect, useState, type ComponentType } from "react";
import { Cherry, Citrus, CircleDot, Gem, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { useAuth } from "@/app/auth-provider";
import { settleGamblingRound, subscribeToUserProfileById } from "@/firebase/users";
import type { UserProfile } from "@/types/models";

const SYMBOLS = [
  { id: "cherry", label: "Cherry", icon: Cherry, className: "text-rose-400", weight: 24 },
  { id: "lemon", label: "Lemon", icon: Citrus, className: "text-yellow-300", weight: 18 },
  { id: "orange", label: "Orange", icon: CircleDot, className: "text-orange-300", weight: 16 },
  { id: "banana", label: "Banana", icon: Moon, className: "text-amber-200", weight: 14 },
  { id: "slot", label: "Slot", icon: Sparkles, className: "text-violet-300", weight: 7 },
  { id: "diamond", label: "Diamond", icon: Gem, className: "text-cyan-200", weight: 5 },
] as const;

type SymbolId = (typeof SYMBOLS)[number]["id"];
type SlotSymbol = (typeof SYMBOLS)[number];

const MAX_GAMBLING_WITHDRAWAL = 10_000_000;
const SLOT_LOSS_RATE = 0.65;

function getWeightedSymbol(): SlotSymbol {
  let threshold = Math.random() * SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  for (const symbol of SYMBOLS) {
    threshold -= symbol.weight;
    if (threshold <= 0) return symbol;
  }
  return SYMBOLS[0];
}

function getSymbol(id: SymbolId) {
  return SYMBOLS.find((symbol) => symbol.id === id) ?? SYMBOLS[0];
}

function evaluateSpin(reels: SymbolId[]) {
  const counts = reels.reduce<Record<string, number>>((total, id) => ({ ...total, [id]: (total[id] ?? 0) + 1 }), {});
  const fruitIds: SymbolId[] = ["lemon", "orange", "banana"];
  const hasTripleFruit = fruitIds.some((id) => counts[id] === 3);
  const hasDoubleFruit = fruitIds.some((id) => counts[id] === 2);
  if (counts.diamond === 3) return { label: "Triple diamonds", multiplier: 8 };
  if (counts.slot === 3) return { label: "Triple slots", multiplier: 6 };
  if ((counts.slot ?? 0) === 2) return { label: "Double slots", multiplier: 4 };
  if (counts.cherry === 3) return { label: "Triple cherries", multiplier: 4 };
  if (hasTripleFruit) return { label: "Triple fruit", multiplier: 2.5 };
  if ((counts.cherry ?? 0) === 2) return { label: "Double cherry", multiplier: 1.6 };
  if (hasDoubleFruit) return { label: "Fruit pair", multiplier: 1.2 };
  return null;
}

function getFinalSymbols(): SlotSymbol[] {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const symbols = [getWeightedSymbol(), getWeightedSymbol(), getWeightedSymbol()];
    if (Math.random() >= SLOT_LOSS_RATE || !evaluateSpin(symbols.map((symbol) => symbol.id))) return symbols;
  }
  return [getSymbol("cherry"), getSymbol("lemon"), getSymbol("orange")];
}

function ReelIcon({ symbolId, size = 42 }: { symbolId: SymbolId; size?: number }) {
  const symbol = getSymbol(symbolId);
  const Icon = symbol.icon as ComponentType<{ size?: number; strokeWidth?: number; className?: string; "aria-label"?: string }>;
  return <Icon size={size} strokeWidth={2.2} className={symbol.className} aria-label={symbol.label} />;
}

export function SlotMachine() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reels, setReels] = useState<SymbolId[]>(["cherry", "lemon", "orange"]);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wagerInput, setWagerInput] = useState("10");
  const [lastResult, setLastResult] = useState<{ payout: number; multiplier: number; label: string } | null>(null);
  const gems = profile?.gems ?? 0;
  const wager = Math.max(10, Math.floor(Number(wagerInput) || 10));

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  async function spin() {
    if (!user || isSpinning || gems < wager) return;
    setIsSpinning(true);
    setLastResult(null);
    setSpinningReels([true, true, true]);

    const finalSymbols = getFinalSymbols();
    const finalIds = finalSymbols.map((symbol) => symbol.id);
    for (let reelIndex = 0; reelIndex < 3; reelIndex += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, reelIndex === 0 ? 720 : 460));
      setReels((current) => current.map((id, index) => index === reelIndex ? finalIds[index] : id));
      setSpinningReels((current) => current.map((spinning, index) => index === reelIndex ? false : spinning));
    }

    const win = evaluateSpin(finalIds);
    const payout = win ? Math.min(MAX_GAMBLING_WITHDRAWAL, Math.floor(wager * win.multiplier)) : 0;
    try {
      await settleGamblingRound(user.uid, { wager, payout, xpReward: payout ? Math.max(2, Math.floor(payout / 40)) : 0, title: "Slot machine" });
      if (win) setLastResult({ payout, multiplier: win.multiplier, label: win.label });
    } finally {
      setIsSpinning(false);
    }
  }

  return (
    <Card className="space-y-5 overflow-hidden p-5 sm:p-6">
      <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[color:var(--accent)]" /><div><h3 className="text-lg font-semibold">Slots</h3><p className="text-xs text-textMuted">Match symbols across the payline.</p></div></div>

      <div className={`slot-machine rounded-[2rem] border border-border p-3 shadow-inner sm:p-5 ${lastResult ? "slot-machine-win" : ""}`}>
        <div className="relative rounded-[1.5rem] border border-border bg-canvas/80 p-3 shadow-inner sm:p-4">
          <div className="slot-payline pointer-events-none absolute inset-x-2 top-1/2 z-10 h-0.5 -translate-y-1/2 bg-[color:var(--accent)]/70 shadow-[0_0_12px_var(--accent)]" />
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {reels.map((reel, index) => (
              <div key={index} className="slot-reel relative h-32 overflow-hidden rounded-2xl border border-border bg-surface sm:h-40">
                {spinningReels[index] ? (
                  <div className="slot-reel-strip absolute inset-x-0 top-0 flex flex-col items-center gap-5 py-3">
                    {[...SYMBOLS, ...SYMBOLS].map((symbol, symbolIndex) => <ReelIcon key={`${symbol.id}-${symbolIndex}`} symbolId={symbol.id} size={38} />)}
                  </div>
                ) : <div className="grid h-full place-items-center"><ReelIcon symbolId={reel} size={52} /></div>}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-surface to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-surface to-transparent" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 px-2 text-center text-xs text-textMuted">{isSpinning ? "Reels locking in…" : lastResult ? lastResult.label : "Place a wager and spin."}</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="space-y-2"><span className="block text-sm font-semibold">Wager</span><input inputMode="numeric" min={10} step={1} value={wagerInput} disabled={isSpinning} onChange={(event) => setWagerInput(event.target.value.replace(/[^\d]/g, ""))} className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-[color:var(--accent)]" placeholder="10" /></label>
        <Button onClick={() => void spin()} disabled={isSpinning || gems < wager} className="h-12 min-w-44 gap-2 rounded-2xl shadow-panel"><Gem size={18} />{isSpinning ? "Spinning…" : gems < wager ? `Need ${wager} gems` : `Spin for ${wager}`}</Button>
      </div>

      {lastResult ? <div className="slot-win-card rounded-2xl border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 px-4 py-3 text-sm"><p className="font-semibold">{lastResult.label}</p><p className="mt-1 text-textMuted">{lastResult.multiplier}× payout · +{lastResult.payout.toLocaleString()} gems</p></div> : null}

      <div className="grid gap-2 sm:grid-cols-2"><div className="slot-pay-row"><Citrus size={16} className="text-yellow-300" /><span>2 fruit</span><strong>1.2×</strong></div><div className="slot-pay-row"><Cherry size={16} className="text-rose-400" /><span>2 cherries</span><strong>1.6×</strong></div><div className="slot-pay-row"><Citrus size={16} className="text-yellow-300" /><span>3 fruit</span><strong>2.5×</strong></div><div className="slot-pay-row"><Cherry size={16} className="text-rose-400" /><span>3 cherries</span><strong>4×</strong></div><div className="slot-pay-row"><Sparkles size={16} className="text-violet-300" /><span>2 slots</span><strong>4×</strong></div><div className="slot-pay-row"><Sparkles size={16} className="text-violet-300" /><span>3 slots</span><strong>6×</strong></div><div className="slot-pay-row sm:col-span-2"><Gem size={16} className="text-cyan-200" /><span>3 diamonds</span><strong>8×</strong></div></div>
    </Card>
  );
}
