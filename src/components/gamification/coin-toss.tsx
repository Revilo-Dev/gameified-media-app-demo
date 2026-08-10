import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { useAuth } from "@/app/auth-provider";
import { addGamblingResult, addGemsToUser, addXpToUser, subscribeToUserProfileById } from "@/firebase/users";
import type { UserProfile } from "@/types/models";

type CoinSide = "heads" | "tails";

function CoinIcon({ spinning, result }: { spinning: boolean; result: CoinSide | null }) {
  return (
    <div className={`relative h-24 w-24 ${spinning ? "coin-spin" : ""}`}>
      <div className="absolute inset-0 rounded-full border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 shadow-sm" />
      <div className="absolute inset-[10px] flex items-center justify-center rounded-full border border-border bg-surface text-sm font-bold uppercase tracking-[0.2em]">
        {result === "tails" ? "T" : "H"}
      </div>
    </div>
  );
}

export function CoinToss() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wagerInput, setWagerInput] = useState("10");
  const [pickedSide, setPickedSide] = useState<CoinSide>("heads");
  const [isFlipping, setIsFlipping] = useState(false);
  const [landedSide, setLandedSide] = useState<CoinSide | null>(null);
  const gems = profile?.gems ?? 0;
  const wager = Math.max(10, Math.floor(Number(wagerInput) || 10));

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  async function flip() {
    if (!user || isFlipping) {
      return;
    }
    if (gems < wager) {
      return;
    }

    setIsFlipping(true);
    setLandedSide(null);
    await addGemsToUser(user.uid, -wager);
    await addGamblingResult(user.uid, "loss", wager);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result: CoinSide = Math.random() >= 0.5 ? "heads" : "tails";
    setLandedSide(result);

    if (result === pickedSide) {
      const payout = Math.floor(wager * 1.5);
      await addGemsToUser(user.uid, payout);
      await addGamblingResult(user.uid, "gain", payout);
      await addXpToUser(user.uid, Math.max(1, Math.floor(payout / 30)));
    }

    setIsFlipping(false);
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-[color:var(--accent)]" />
        <h3 className="text-lg font-semibold">Coin Toss</h3>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-3">
          <label className="block text-sm font-semibold" htmlFor="coin-toss-wager">Wager</label>
          <input
            id="coin-toss-wager"
            inputMode="numeric"
            min={1}
            step={1}
            value={wagerInput}
            onChange={(event) => setWagerInput(event.target.value.replace(/[^\d]/g, ""))}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none"
            placeholder="10"
          />
          <div className="grid grid-cols-2 gap-2">
            {(["heads", "tails"] as CoinSide[]).map((side) => (
              <button
                key={side}
                type="button"
                className={`rounded-2xl border px-3 py-3 text-sm font-semibold capitalize transition ${
                  pickedSide === side ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10" : "border-border bg-surface"
                }`}
                onClick={() => setPickedSide(side)}
              >
                {side}
              </button>
            ))}
          </div>
          <Button onClick={() => void flip()} disabled={isFlipping || gems < wager} className="w-full">
            {isFlipping ? "Flipping..." : gems < wager ? `Need ${wager} gems` : `Flip for ${wager}`}
          </Button>
        </div>

        <div className="flex min-h-48 flex-col items-center justify-center rounded-[1.75rem] border border-border bg-surfaceAlt/40 p-6 text-center">
          <CoinIcon spinning={isFlipping} result={landedSide} />
          <p className="mt-4 text-sm font-semibold capitalize">
            {isFlipping ? "Flipping..." : landedSide ? `${landedSide} landed` : `Pick ${pickedSide}`}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes coin-flip {
          0% { transform: rotateY(0deg) translateY(0); }
          25% { transform: rotateY(360deg) translateY(-10px); }
          50% { transform: rotateY(720deg) translateY(-18px); }
          75% { transform: rotateY(1080deg) translateY(-10px); }
          100% { transform: rotateY(1440deg) translateY(0); }
        }
        .coin-spin {
          animation: coin-flip 1s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
}
