import { useEffect, useMemo, useRef, useState } from "react";
import { Bomb, Gem } from "lucide-react";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { useAuth } from "@/app/auth-provider";
import { settleGamblingRound, subscribeToUserProfileById } from "@/firebase/users";
import type { UserProfile } from "@/types/models";

const TILE_COUNT = 25;
const MAX_PAYOUT = 2_000_000;
const MAX_GAMBLING_WITHDRAWAL = 10_000_000;
const MINE_MULTIPLIERS: Record<number, number> = { 1: 1.03, 2: 1.05, 3: 1.08, 4: 1.11, 5: 1.14, 6: 1.17 };

export function MinesGame() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mineCount, setMineCount] = useState(3);
  const [betInput, setBetInput] = useState("10");
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<"idle" | "playing" | "lost" | "cashed">("idle");
  const startInProgress = useRef(false);
  const cashOutInProgress = useRef(false);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const bet = Math.min(1_000_000, Math.max(10, Number((Number(betInput) || 10).toFixed(2))));
  const tileMultiplier = MINE_MULTIPLIERS[mineCount];
  const multiplier = Number((tileMultiplier ** revealed.size).toFixed(2));
  const probability = ((TILE_COUNT - mineCount) / TILE_COUNT) * 100;
  const payout = Number(Math.min(MAX_PAYOUT, MAX_GAMBLING_WITHDRAWAL, bet * multiplier).toFixed(2));

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  function generateMines() {
    const next = new Set<number>();
    while (next.size < mineCount) next.add(Math.floor(Math.random() * TILE_COUNT));
    return next;
  }

  function startGame() {
    if (!user || (profile?.gems ?? 0) < bet || startInProgress.current || cashOutInProgress.current || status === "playing") return;

    // Lock synchronously before React renders, then start the board with no loading stage.
    startInProgress.current = true;
    setMines(generateMines());
    setRevealed(new Set());
    setStatus("playing");
    window.setTimeout(() => { startInProgress.current = false; }, 0);
  }

  async function revealTile(index: number) {
    if (!user || status !== "playing" || revealed.has(index)) return;
    if (mines.has(index)) {
      if (cashOutInProgress.current) return;
      cashOutInProgress.current = true;
      setStatus("lost");
      void settleGamblingRound(user.uid, { wager: bet, title: `Mines (${mineCount} mine${mineCount === 1 ? "" : "s"})` })
        .catch((error) => console.error("Failed to settle Mines loss", error))
        .finally(() => { cashOutInProgress.current = false; });
      return;
    }
    setRevealed((current) => new Set(current).add(index));
  }

  async function cashOut() {
    if (!user || status !== "playing" || !revealed.size || cashOutInProgress.current) return;

    cashOutInProgress.current = true;
    setIsCashingOut(true);
    setStatus("cashed");
    try {
      await settleGamblingRound(user.uid, { wager: bet, payout, xpReward: Math.max(1, Math.floor(payout / 100)), title: `Mines cash out (${mineCount} mine${mineCount === 1 ? "" : "s"})` });
    } catch (error) {
      setStatus("playing");
      throw error;
    } finally {
      cashOutInProgress.current = false;
      setIsCashingOut(false);
    }
  }

  const tiles = useMemo(() => Array.from({ length: TILE_COUNT }, (_, index) => index), []);
  return <Card className="arcade-game-card space-y-5 p-5"><div className="flex items-center gap-2"><Bomb className="h-5 w-5 text-rose-400" /><div><h3 className="text-lg font-semibold">Mines</h3></div></div><div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]"><div className="space-y-4"><div><p className="text-sm font-semibold">Number of Mines</p><div className="mt-2 grid grid-cols-[2.5rem_1fr_2.5rem] items-center rounded-xl border border-border bg-surface"><button type="button" disabled={status === "playing"} onClick={() => setMineCount((value) => Math.max(1, value - 1))}>-</button><span className="text-center font-semibold">{mineCount}</span><button type="button" disabled={status === "playing"} onClick={() => setMineCount((value) => Math.min(6, value + 1))}>+</button></div></div><div className="rounded-xl border border-border bg-surfaceAlt/40 p-3 text-sm"><p>Receive <strong>{tileMultiplier.toFixed(2)}x</strong> per safe tile. <br />Win rate: <strong>{probability.toFixed(2)}%</strong></p></div><div><label htmlFor="mines-bet" className="text-sm font-semibold">Bet Amount</label><input id="mines-bet" value={betInput} disabled={status === "playing"} onChange={(event) => setBetInput(event.target.value.replace(/[^\d]/g, ""))} className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2" /><p className="mt-1 text-xs text-textMuted">Max: 1,000,000</p><div className="mt-2 grid grid-cols-4 gap-1">{[25, 50, 75, 100].map((percent) => <button key={percent} type="button" disabled={status === "playing"} onClick={() => setBetInput(String(Math.floor((profile?.gems ?? 0) * percent / 100)))} className="rounded-lg border border-border py-1 text-xs hover:border-accent">{percent === 100 ? "Max" : `${percent}%`}</button>)}</div></div>{status === "playing" ? <Button className="w-full" onClick={() => void cashOut()} disabled={!revealed.size || isCashingOut}>Cash out {payout.toLocaleString()} gems</Button> : <Button className="w-full" onClick={startGame} disabled={!user || (profile?.gems ?? 0) < bet}>Start Game</Button>}</div><div className="rounded-2xl border border-border bg-surfaceAlt/30 p-4"><div className="grid grid-cols-5 gap-2">{tiles.map((index) => { const showMine = (status === "lost" || status === "cashed") && mines.has(index); const isRevealed = revealed.has(index); return <button key={index} type="button" disabled={status !== "playing" || isRevealed} onClick={() => void revealTile(index)} className={`aspect-square rounded-lg border text-sm font-bold ${showMine ? "border-rose-400 bg-rose-500/15 text-rose-300" : isRevealed ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-border bg-surface hover:border-accent"}`}>{showMine ? <Bomb size={16} className="mx-auto" /> : isRevealed ? <Gem size={15} className="mx-auto" /> : ""}</button>; })}</div><p className="mt-4 text-center text-sm font-semibold">{status === "lost" ? "Mine hit. Game over." : status === "cashed" ? `Cashed out ${payout.toLocaleString()} gems.` : status === "playing" ? "Pick a safe tile or cash out." : "Set your bet and start a game."}</p></div></div></Card>;
}
