import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { useAuth } from "@/app/auth-provider";
import { addGemsToUser, addXpToUser } from "@/firebase/users";

type State = "idle" | "waiting" | "ready" | "result";

export function ReactionTest() {
  const { user } = useAuth();
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<string>("");
  const startedAt = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  useEffect(() => () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); }, []);
  function start() { setState("waiting"); setResult("Wait for green..."); timeoutRef.current = window.setTimeout(() => { startedAt.current = performance.now(); setState("ready"); setResult("TAP NOW!"); }, 1300 + Math.random() * 2200); }
  async function react() {
    if (state === "waiting") { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); setState("result"); setResult("Too early — try again."); return; }
    if (state !== "ready" || !user) return;
    const milliseconds = Math.round(performance.now() - startedAt.current);
    const reward = milliseconds < 300 ? 30 : milliseconds < 500 ? 15 : 5;
    await addGemsToUser(user.uid, reward); await addXpToUser(user.uid, 1);
    setState("result"); setResult(`${milliseconds}ms — +${reward} gems`);
  }
  return <Card className="arcade-game-card space-y-5 p-5"><div className="flex items-center gap-2"><Timer className="h-5 w-5 text-[color:var(--accent)]" /><h3 className="text-lg font-semibold">Reaction Test</h3></div><button type="button" onClick={() => void react()} className={`flex min-h-48 w-full items-center justify-center rounded-3xl border text-lg font-bold transition ${state === "ready" ? "border-emerald-300 bg-emerald-500/25 text-emerald-100" : "border-border bg-surfaceAlt/40"}`}>{result || "Press start, then react when this turns green."}</button><Button className="w-full" onClick={start} disabled={state === "waiting" || state === "ready"}>{state === "waiting" ? "Get ready..." : "Start reaction test"}</Button></Card>;
}
