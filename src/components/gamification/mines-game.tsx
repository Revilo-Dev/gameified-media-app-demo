import { useEffect, useMemo, useState } from "react";
import { Bomb, Gem } from "lucide-react";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { useAuth } from "@/app/auth-provider";
import { addGamblingResult, addGemsToUser, addXpToUser, subscribeToUserProfileById } from "@/firebase/users";
import type { UserProfile } from "@/types/models";

const TILE_COUNT = 25;
const MAX_PAYOUT = 2_000_000;

export function MinesGame() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mineCount, setMineCount] = useState(3);
  const [betInput, setBetInput] = useState("10");
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<"idle" | "playing" | "lost" | "cashed">("idle");
  const bet = Math.min(1_000_000, Math.max(10, Number((Number(betInput) || 10).toFixed(2))));
  const multiplier = Number((1.08 ** revealed.size).toFixed(2));
  const probability = ((TILE_COUNT - mineCount) / TILE_COUNT) * 100;
  const payout = Number(Math.min(MAX_PAYOUT, bet * multiplier).toFixed(2));

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  function generateMines() {
    const next = new Set<number>();
    while (next.size < mineCount) next.add(Math.floor(Math.random() * TILE_COUNT));
    return next;
  }

  async function startGame() {
    if (!user || (profile?.gems ?? 0) < bet) return;
    await addGemsToUser(user.uid, -bet);
    await addGamblingResult(user.uid, "loss", bet);
    setMines(generateMines()); setRevealed(new Set()); setStatus("playing");
  }

  async function revealTile(index: number) {
    if (!user || status !== "playing" || revealed.has(index)) return;
    if (mines.has(index)) { setStatus("lost"); return; }
    setRevealed((current) => new Set(current).add(index));
  }

  async function cashOut() {
    if (!user || status !== "playing" || !revealed.size) return;
    await addGemsToUser(user.uid, payout);
    await addGamblingResult(user.uid, "gain", payout);
    await addXpToUser(user.uid, Math.max(5, Math.floor(payout / 10)));
    setStatus("cashed");
  }

  const tiles = useMemo(() => Array.from({ length: TILE_COUNT }, (_, index) => index), []);
  return <Card className="space-y-5 p-5"><div className="flex items-center gap-2"><Bomb className="h-5 w-5 text-rose-400" /><div><h3 className="text-lg font-semibold">Mines</h3></div></div><div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]"><div className="space-y-4"><div><p className="text-sm font-semibold">Number of Mines</p><div className="mt-2 grid grid-cols-[2.5rem_1fr_2.5rem] items-center rounded-xl border border-border bg-surface"><button type="button" onClick={() => setMineCount((value) => Math.max(1, value - 1))}>-</button><span className="text-center font-semibold">{mineCount}</span><button type="button" onClick={() => setMineCount((value) => Math.min(24, value + 1))}>+</button></div></div><div className="rounded-xl border border-border bg-surfaceAlt/40 p-3 text-sm"><p>Recieve <strong>{multiplier.toFixed(2)}x</strong> per tile. <br></br>Win rate: <strong className="txt-sm">{probability.toFixed(2)}%</strong></p></div><div><label htmlFor="mines-bet" className="text-sm font-semibold">Bet Amount</label><input id="mines-bet" value={betInput} onChange={(event) => setBetInput(event.target.value.replace(/[^\d]/g, ""))} className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2" /><p className="mt-1 text-xs text-textMuted">Max: 1,000,000</p><div className="mt-2 grid grid-cols-4 gap-1">{[25, 50, 75, 100].map((percent) => <button key={percent} type="button" onClick={() => setBetInput(String(Math.floor((profile?.gems ?? 0) * percent / 100)))} className="rounded-lg border border-border py-1 text-xs hover:border-accent">{percent === 100 ? "Max" : `${percent}%`}</button>)}</div></div>{status === "playing" ? <Button className="w-full" onClick={() => void cashOut()} disabled={!revealed.size}>Cash out {payout.toLocaleString()} gems</Button> : <Button className="w-full" onClick={() => void startGame()} disabled={!user || (profile?.gems ?? 0) < bet}>Start Game</Button>}</div><div className="rounded-2xl border border-border bg-surfaceAlt/30 p-4"><div className="grid grid-cols-5 gap-2">{tiles.map((index) => { const showMine = (status === "lost" || status === "cashed") && mines.has(index); const isRevealed = revealed.has(index); return <button key={index} type="button" disabled={status !== "playing" || isRevealed} onClick={() => void revealTile(index)} className={`aspect-square rounded-lg border text-sm font-bold ${showMine ? "border-rose-400 bg-rose-500/15 text-rose-300" : isRevealed ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-border bg-surface hover:border-accent"}`}>{showMine ? <Bomb size={16} className="mx-auto" /> : isRevealed ? <Gem size={15} className="mx-auto" /> : ""}</button>; })}</div><p className="mt-4 text-center text-sm font-semibold">{status === "lost" ? "Mine hit. Game over." : status === "cashed" ? `Cashed out ${payout.toLocaleString()} gems.` : status === "playing" ? "Pick a safe tile or cash out." : "Set your bet and start a game."}</p></div></div></Card>;
}
