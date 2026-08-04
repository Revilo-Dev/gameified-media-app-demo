import { describe, expect, it } from "vitest";
import { getXpProgress, xpRequiredForLevel } from "@/constants/gamification";
import { canAwardDailyPostXp, hasPostingCooldownElapsed, shouldAwardPostXp } from "@/features/gamification/anti-abuse";
import { getExecutedBuyCoinAmount, getExecutedSellGemValue, getNextTradePrice, normalizeMarketState } from "@/firebase/crypto-market";

describe("gamification helpers", () => {
  it("calculates required xp per level", () => {
    expect(xpRequiredForLevel(1)).toBe(100);
    expect(xpRequiredForLevel(5)).toBeGreaterThan(100);
  });

  it("returns xp progress inside a level", () => {
    expect(getXpProgress(820, 6).percentage).toBeGreaterThan(0);
  });

  it("enforces daily cap", () => {
    expect(canAwardDailyPostXp(9)).toBe(true);
    expect(canAwardDailyPostXp(10)).toBe(false);
  });

  it("enforces cooldown", () => {
    const now = new Date("2026-07-15T07:00:00.000Z");
    expect(hasPostingCooldownElapsed(new Date("2026-07-15T06:58:30.000Z"), now)).toBe(true);
    expect(shouldAwardPostXp(3, new Date("2026-07-15T06:59:30.000Z"), now)).toBe(false);
  });

  it("prevents instant buy-sell crypto loops from minting gems", () => {
    const startingPrice = 1;
    const buyVolume = 100;
    const boughtCoins = getExecutedBuyCoinAmount(startingPrice, buyVolume);
    const pumpedPrice = getNextTradePrice(startingPrice, 1, buyVolume);
    const saleValue = getExecutedSellGemValue(pumpedPrice, boughtCoins);

    expect(saleValue).toBeLessThanOrEqual(buyVolume);
  });

  it("clamps crypto values to two decimal places", () => {
    const market = normalizeMarketState({
      coins: {
        wutax: { currentValue: 1.2345, history: [0.9876] },
      },
    });

    expect(market.coins.wutax.currentValue).toBe(1.23);
    expect(market.coins.wutax.history[0]).toBe(0.99);
    expect(getExecutedSellGemValue(1.239, 2.345)).toBe(2.91);
  });
});
