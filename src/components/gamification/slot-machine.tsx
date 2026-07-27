import { useEffect, useState } from "react";
import { Coins, Gem, Sparkles, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { useAuth } from "@/app/auth-provider";
import { createPost } from "@/firebase/posts";
import { addXpToUser, addGemsToUser, buyCasinoCoin, spendCasinoCoin, subscribeToUserProfileById } from "@/firebase/users";
import type { UserProfile } from "@/types/models";

const SYMBOLS = ["🍒", "🍋", "🍊", "🍌", "🎰", "💎"];
const WINNING_COMBOS = {
  jackpot: { symbols: ["💎", "💎", "💎"], gems: 100, xp: 50 },
  triple: { symbols: ["🍒", "🍒", "🍒"], gems: 50, xp: 25 },
  sevens: { symbols: ["🎰", "🎰", "🎰"], gems: 75, xp: 30 },
  fruit: { symbols: ["🍋", "🍋", "🍋"], gems: 30, xp: 15 },
};

export function SlotMachine() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reels, setReels] = useState(["🍒", "🍋", "🍊"]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWin, setLastWin] = useState<{
    symbols: string[];
    gems: number;
    xp: number;
    name: string;
  } | null>(null);
  const casinoCoins = profile?.casinoCoins ?? 0;
  const gems = profile?.gems ?? 0;

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    return subscribeToUserProfileById(user.uid, setProfile);
  }, [user]);

  const checkWin = (newReels: string[]): { name: string; gems: number; xp: number } | null => {
    for (const [key, combo] of Object.entries(WINNING_COMBOS)) {
      if (JSON.stringify([...newReels].sort()) === JSON.stringify([...combo.symbols].sort())) {
        return { name: key, gems: combo.gems, xp: combo.xp };
      }
    }
    return null;
  };

  const buyCoin = async () => {
    if (!user || gems < 5) return;

    try {
      await buyCasinoCoin(user.uid);
      toast.success("Casino coin bought", { description: "-5 gems, +1 casino coin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not buy a casino coin.");
    }
  };

  const spin = async () => {
    if (!user || isSpinning || casinoCoins === 0) return;

    setIsSpinning(true);
    setLastWin(null);

    try {
      await spendCasinoCoin(user.uid);
      toast.info("Casino coin spent", { description: "Good luck on the reels." });
    } catch (error) {
      setIsSpinning(false);
      toast.error(error instanceof Error ? error.message : "You need 1 casino coin to spin.");
      return;
    }

    // Spinning animation
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]);
    }

    const newReels = [
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    ];

    setReels(newReels);

    const win = checkWin(newReels);
    if (win && user) {
      setLastWin({ symbols: newReels, ...win });
      await addGemsToUser(user.uid, win.gems);
      await addXpToUser(user.uid, win.xp);
      toast.success(`🎉 You won ${win.gems} gems!`);
    } else {
      toast.info("Better luck next time!");
    }

    setIsSpinning(false);
  };

  const shareWin = async () => {
    if (!lastWin || !user) return;

    try {
      const emojiText = lastWin.symbols.join("");
      await createPost({
        authorId: user.uid,
        content: `🎰 Just hit the jackpot on the slot machine! ${emojiText}\n\n+${lastWin.gems} gems and +${lastWin.xp} XP! 💰 #SlotMachine #Arcade`,
        tags: ["SlotMachine", "Arcade"],
        visibility: "public",
        imageURL: null,
        imageStoragePath: null,
        gifURL: null,
        parentPostId: null,
        repostedPostId: null,
        quotedPostId: null,
        replyToPostId: null,
        poll: null,
        });
      toast.success("Posted your win!");
    } catch (error) {
      toast.error("Failed to post win");
      console.error(error);
    }
  };

  return (
    <Card className="space-y-6 p-6">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Slot Machine
        </h3>
        <p className="mt-1 text-sm text-textMuted">Spend 1 casino coin to spin. Casino coins cost 5 gems each.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-textMuted"><Gem className="h-4 w-4" /> Gems</p>
          <p className="mt-1 text-xl font-bold">{gems}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-textMuted"><Coins className="h-4 w-4" /> Casino coins</p>
          <p className="mt-1 text-xl font-bold">{casinoCoins}</p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        {reels.map((reel, index) => (
          <div
            key={index}
            className={`h-24 w-20 rounded-lg border-4 border-yellow-500 bg-gradient-to-b from-yellow-50 to-yellow-100 flex items-center justify-center text-5xl transition-all ${
              isSpinning ? "animate-pulse" : ""
            }`}
            style={{
              animation: isSpinning ? `spin 0.1s infinite` : "none",
            }}
          >
            {reel}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotateY(0); }
          100% { transform: rotateY(360deg); }
        }
      `}</style>

      <div className="space-y-3">
        <Button
          onClick={buyCoin}
          disabled={isSpinning || gems < 5}
          variant="secondary"
          className="w-full gap-2"
        >
          <Coins className="h-4 w-4" />
          {gems < 5 ? "Need 5 gems for a casino coin" : "Buy casino coin for 5 gems"}
        </Button>
        <Button
          onClick={spin}
          disabled={isSpinning || casinoCoins === 0}
          className="w-full"
          size="lg"
        >
          {isSpinning ? "Spinning..." : casinoCoins === 0 ? "Need 1 casino coin" : "SPIN"}
        </Button>

        {lastWin && (
          <div className="rounded-lg bg-green-50 p-4">
            <p className="font-semibold text-green-900">🎉 You Won!</p>
            <p className="mt-1 text-sm text-green-700">
              {lastWin.symbols.join("")} - {lastWin.name.toUpperCase()}
            </p>
            <p className="text-sm text-green-700">
              +{lastWin.gems} gems, +{lastWin.xp} XP
            </p>
            <Button
              onClick={shareWin}
              variant="secondary"
              size="sm"
              className="mt-3 w-full gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Your Win
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">Prize Breakdown:</p>
        <ul className="mt-2 space-y-1 text-xs">
          <li>💎💎💎 Jackpot: 100 gems, 50 XP</li>
          <li>🍒🍒🍒 Triple: 50 gems, 25 XP</li>
          <li>🎰🎰🎰 Lucky: 75 gems, 30 XP</li>
          <li>🍋🍋🍋 Fruit: 30 gems, 15 XP</li>
        </ul>
      </div>
    </Card>
  );
}
