import { useEffect, useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { useAuth } from "@/app/auth-provider";
import { addGamblingResult, addGemsToUser, addXpToUser, subscribeToUserProfileById } from "@/firebase/users";
import type { UserProfile } from "@/types/models";

const SIDES = [1, 2, 3, 4, 5, 6] as const;

export function DiceGame() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wagerInput, setWagerInput] = useState("10");
  const [pickedSide, setPickedSide] = useState<number>(6);
  const [rolledSide, setRolledSide] = useState<number>(1);
  const [isRolling, setIsRolling] = useState(false);
  const gems = profile?.gems ?? 0;
  const wager = Math.max(10, Math.floor(Number(wagerInput) || 10));

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  async function roll() {
    if (!user || isRolling) {
      return;
    }
    if (gems < wager) {
      return;
    }

    setIsRolling(true);
    await addGemsToUser(user.uid, -wager);
    await addGamblingResult(user.uid, "loss", wager);

    for (let index = 0; index < 12; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 70));
      setRolledSide(SIDES[Math.floor(Math.random() * SIDES.length)]);
    }

    const result = SIDES[Math.floor(Math.random() * SIDES.length)];
    setRolledSide(result);

    if (result === pickedSide) {
      const payout = wager * 4;
      await addGemsToUser(user.uid, payout);
      await addGamblingResult(user.uid, "gain", payout);
      await addXpToUser(user.uid, Math.max(1, Math.floor(payout / 40)));
    }

    setIsRolling(false);
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center gap-2">
        <Dices className="h-5 w-5 text-[color:var(--accent)]" />
        <h3 className="text-lg font-semibold">Dice Pick</h3>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-3">
          <label className="block text-sm font-semibold" htmlFor="dice-wager">Wager</label>
          <input
            id="dice-wager"
            inputMode="numeric"
            min={1}
            step={1}
            value={wagerInput}
            onChange={(event) => setWagerInput(event.target.value.replace(/[^\d]/g, ""))}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none"
            placeholder="10"
          />
          <div className="grid grid-cols-3 gap-2">
            {SIDES.map((side) => (
              <button
                key={side}
                type="button"
                className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                  pickedSide === side ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10" : "border-border bg-surface"
                }`}
                onClick={() => setPickedSide(side)}
              >
                {side}
              </button>
            ))}
          </div>
          <Button onClick={() => void roll()} disabled={isRolling || gems < wager} className="w-full">
            {isRolling ? "Rolling..." : gems < wager ? `Need ${wager} gems` : `Roll for ${wager}`}
          </Button>
        </div>

        <div className="flex min-h-48 flex-col items-center justify-center rounded-[1.75rem] border border-border bg-surfaceAlt/40 p-6 text-center">
          <div className={`flex h-24 w-24 items-center justify-center rounded-[1.5rem] border border-border bg-surface text-4xl font-bold ${isRolling ? "dice-bounce" : ""}`}>
            {rolledSide}
          </div>
          <p className="mt-4 text-sm font-semibold">
            {isRolling ? "Rolling..." : `Pick ${pickedSide} to win 4x`}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes dice-bounce {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-10deg) scale(1.06); }
          50% { transform: rotate(10deg) scale(0.98); }
          75% { transform: rotate(-6deg) scale(1.04); }
        }
        .dice-bounce {
          animation: dice-bounce 0.45s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
}
