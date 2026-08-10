import { useEffect, useState } from "react";
import { Cherry, Citrus, Diamond, Sparkles } from "lucide-react";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { useAuth } from "@/app/auth-provider";
import { addGamblingResult, addGemsToUser, addXpToUser, subscribeToUserProfileById } from "@/firebase/users";
import type { UserProfile } from "@/types/models";

const SYMBOLS = [
  { id: "cherry", glyph: "🍒", weight: 24 },
  { id: "lemon", glyph: "🍋", weight: 18 },
  { id: "orange", glyph: "🍊", weight: 16 },
  { id: "banana", glyph: "🍌", weight: 14 },
  { id: "slot", glyph: "🎰", weight: 7 },
  { id: "diamond", glyph: "💎", weight: 5 },
] as const;

type SymbolId = (typeof SYMBOLS)[number]["id"];

function getWeightedSymbol() {
  const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let threshold = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    threshold -= symbol.weight;
    if (threshold <= 0) {
      return symbol;
    }
  }

  return SYMBOLS[0];
}

function countSymbols(reels: SymbolId[]) {
  return reels.reduce<Record<string, number>>((counts, symbolId) => {
    counts[symbolId] = (counts[symbolId] ?? 0) + 1;
    return counts;
  }, {});
}

function evaluateSpin(reels: SymbolId[]) {
  const counts = countSymbols(reels);
  const fruitIds: SymbolId[] = ["lemon", "orange", "banana"];
  const tripleFruit = fruitIds.some((symbolId) => counts[symbolId] === 3);
  const doubleFruit = fruitIds.some((symbolId) => counts[symbolId] === 2);

  if (counts.diamond === 3) return { label: "Triple diamonds", multiplier: 8 };
  if (counts.slot === 3) return { label: "Triple slots", multiplier: 6 };
  if ((counts.slot ?? 0) === 2) return { label: "Double slots", multiplier: 4 };
  if (counts.cherry === 3) return { label: "Triple cherries", multiplier: 4 };
  if (tripleFruit) return { label: "Triple fruit", multiplier: 2.5 };
  if ((counts.cherry ?? 0) === 2) return { label: "Double cherries", multiplier: 1.6 };
  if (doubleFruit) return { label: "Double fruit", multiplier: 1.2 };

  return null;
}

const PAYOUT_ROWS = [
  { icon: Citrus, label: "2 fruit", value: "1.2x" },
  { icon: Cherry, label: "2 cherries", value: "1.6x" },
  { icon: Citrus, label: "3 fruit", value: "2.5x" },
  { icon: Cherry, label: "3 cherries", value: "4x" },
  { icon: Sparkles, label: "2 slots", value: "4x" },
  { icon: Sparkles, label: "3 slots", value: "6x" },
  { icon: Diamond, label: "3 diamonds", value: "8x" },
] as const;

export function SlotMachine() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reels, setReels] = useState(["🍒", "🍋", "🍊"]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wagerInput, setWagerInput] = useState("10");
  const [lastResult, setLastResult] = useState<{ payout: number; multiplier: number; label: string } | null>(null);
  const gems = profile?.gems ?? 0;
  const wager = Math.max(10, Math.floor(Number(wagerInput) || 10));

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  async function spin() {
    if (!user || isSpinning) {
      return;
    }
    if (gems < wager) {
      return;
    }

    setIsSpinning(true);
    setLastResult(null);
    await addGemsToUser(user.uid, -wager);
    await addGamblingResult(user.uid, "loss", wager);

    for (let index = 0; index < 16; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 55));
      setReels([getWeightedSymbol().glyph, getWeightedSymbol().glyph, getWeightedSymbol().glyph]);
    }

    const finalSymbols = [getWeightedSymbol(), getWeightedSymbol(), getWeightedSymbol()];
    const finalIds = finalSymbols.map((symbol) => symbol.id);
    setReels(finalSymbols.map((symbol) => symbol.glyph));

    const win = evaluateSpin(finalIds);
    if (win) {
      const payout = Math.floor(wager * win.multiplier);
      await addGemsToUser(user.uid, payout);
      await addGamblingResult(user.uid, "gain", payout);
      await addXpToUser(user.uid, Math.max(2, Math.floor(payout / 40)));
      setLastResult({ payout, multiplier: win.multiplier, label: win.label });
    }

    setIsSpinning(false);
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[color:var(--accent)]" />
        <h3 className="text-lg font-semibold">Slot Machine</h3>
      </div>

      <div className="space-y-4 rounded-[1.75rem] border border-border bg-surfaceAlt/40 p-4">
        <div className="flex justify-center gap-3">
          {reels.map((reel, index) => (
            <div
              key={`${reel}-${index}`}
              className={`flex h-24 w-20 items-center justify-center rounded-[1.5rem] border border-border bg-surface text-5xl transition-transform ${
                isSpinning ? "animate-pulse" : ""
              }`}
            >
              {reel}
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2">
            <label className="block text-sm font-semibold" htmlFor="slot-wager">Wager</label>
            <input
              id="slot-wager"
              inputMode="numeric"
              min={1}
              step={1}
              value={wagerInput}
              onChange={(event) => setWagerInput(event.target.value.replace(/[^\d]/g, ""))}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none"
              placeholder="10"
            />
          </div>
          <Button onClick={() => void spin()} disabled={isSpinning || gems < wager} className="sm:min-w-40">
            {isSpinning ? "Spinning..." : gems < wager ? `Need ${wager} gems` : `Spin for ${wager}`}
          </Button>
        </div>

        {lastResult ? (
          <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
            <p className="font-semibold">{lastResult.label}</p>
            <p className="mt-1 text-textMuted">{lastResult.multiplier}x payout, +{lastResult.payout} gems</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {PAYOUT_ROWS.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-[color:var(--accent)]" />
                {row.label}
              </span>
              <span className="font-semibold">{row.value}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
