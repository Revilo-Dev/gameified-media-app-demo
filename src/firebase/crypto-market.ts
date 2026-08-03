import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import type { CryptoCoinId } from "@/types/models";

const CRYPTO_MARKET_DOC_ID = "global";
const CRYPTO_HISTORY_LENGTH = 18;
const CRYPTO_UPDATE_INTERVAL_MS = 2 * 60 * 1000;

export type CryptoMarketState = {
  lastUpdatedAt: number;
  coins: Record<CryptoCoinId, { currentValue: number; history: number[] }>;
};

export function getTradeImpact(volume: number) {
  return Math.min(0.12, Math.max(0.01, volume / 500));
}

export function getNextTradePrice(currentValue: number, direction: 1 | -1, volume: number) {
  const impact = getTradeImpact(volume);
  return Math.max(0.1, Number((currentValue * (1 + direction * impact)).toFixed(2)));
}

export function getExecutedBuyCoinAmount(currentValue: number, volume: number) {
  const nextValue = getNextTradePrice(currentValue, 1, volume);
  return Number((volume / nextValue).toFixed(2));
}

export function getExecutedSellGemValue(currentValue: number, coinAmount: number) {
  return Number((coinAmount * currentValue).toFixed(2));
}

export function createInitialCryptoMarketState(): CryptoMarketState {
  return {
    lastUpdatedAt: Date.now(),
    coins: {
      wutax: { currentValue: 1.12, history: [0.82, 0.85, 0.9, 0.88, 0.93, 0.95, 0.99, 1.02, 1.05, 1.01, 1.04, 1.08, 1.06, 1.03, 1.07, 1.1, 1.09, 1.12] },
      galaxy: { currentValue: 2.38, history: [1.74, 1.8, 1.86, 1.9, 1.95, 1.99, 2.03, 2.08, 2.12, 2.1, 2.15, 2.2, 2.24, 2.29, 2.26, 2.31, 2.35, 2.38] },
      arc: { currentValue: 0.84, history: [0.69, 0.71, 0.74, 0.72, 0.76, 0.78, 0.8, 0.77, 0.81, 0.83, 0.79, 0.82, 0.85, 0.81, 0.8, 0.78, 0.82, 0.84] },
      nebula: { currentValue: 1.64, history: [1.28, 1.31, 1.35, 1.39, 1.42, 1.45, 1.49, 1.52, 1.56, 1.54, 1.58, 1.61, 1.59, 1.57, 1.6, 1.62, 1.63, 1.64] },
      spark: { currentValue: 0.52, history: [0.36, 0.38, 0.4, 0.41, 0.43, 0.44, 0.46, 0.45, 0.47, 0.48, 0.49, 0.47, 0.48, 0.5, 0.49, 0.51, 0.5, 0.52] },
    },
  };
}

function getNextCoinValue(value: number) {
  const magnitude = 0.01 + Math.random() * 0.07;
  const direction = Math.random() < 0.5 ? -1 : 1;
  const delta = 1 + direction * magnitude;
  return Math.max(0.1, Number((value * delta).toFixed(2)));
}

export function rollCryptoMarket(previous: CryptoMarketState) {
  const nextCoins = Object.entries(previous.coins).reduce<CryptoMarketState["coins"]>((accumulator, [coinId, currentCoin]) => {
    const nextValue = getNextCoinValue(currentCoin.currentValue);
    accumulator[coinId as CryptoCoinId] = {
      currentValue: nextValue,
      history: [...currentCoin.history.slice(-(CRYPTO_HISTORY_LENGTH - 1)), nextValue],
    };
    return accumulator;
  }, {} as CryptoMarketState["coins"]);

  return {
    lastUpdatedAt: Date.now(),
    coins: nextCoins,
  };
}

export function normalizeMarketState(raw: unknown): CryptoMarketState {
  const fallback = createInitialCryptoMarketState();
  const data = typeof raw === "object" && raw !== null ? raw as Partial<CryptoMarketState> : {};
  const fallbackCoins = fallback.coins;

  return {
    lastUpdatedAt: Number(data.lastUpdatedAt ?? fallback.lastUpdatedAt),
    coins: {
      wutax: {
        currentValue: Number(data.coins?.wutax?.currentValue ?? fallbackCoins.wutax.currentValue),
        history: Array.isArray(data.coins?.wutax?.history) ? data.coins.wutax.history.map(Number).slice(-CRYPTO_HISTORY_LENGTH) : fallbackCoins.wutax.history,
      },
      galaxy: {
        currentValue: Number(data.coins?.galaxy?.currentValue ?? fallbackCoins.galaxy.currentValue),
        history: Array.isArray(data.coins?.galaxy?.history) ? data.coins.galaxy.history.map(Number).slice(-CRYPTO_HISTORY_LENGTH) : fallbackCoins.galaxy.history,
      },
      arc: {
        currentValue: Number(data.coins?.arc?.currentValue ?? fallbackCoins.arc.currentValue),
        history: Array.isArray(data.coins?.arc?.history) ? data.coins.arc.history.map(Number).slice(-CRYPTO_HISTORY_LENGTH) : fallbackCoins.arc.history,
      },
      nebula: {
        currentValue: Number(data.coins?.nebula?.currentValue ?? fallbackCoins.nebula.currentValue),
        history: Array.isArray(data.coins?.nebula?.history) ? data.coins.nebula.history.map(Number).slice(-CRYPTO_HISTORY_LENGTH) : fallbackCoins.nebula.history,
      },
      spark: {
        currentValue: Number(data.coins?.spark?.currentValue ?? fallbackCoins.spark.currentValue),
        history: Array.isArray(data.coins?.spark?.history) ? data.coins.spark.history.map(Number).slice(-CRYPTO_HISTORY_LENGTH) : fallbackCoins.spark.history,
      },
    },
  };
}

const marketRef = doc(db, COLLECTIONS.markets, CRYPTO_MARKET_DOC_ID);

export async function ensureCryptoMarket() {
  await setDoc(marketRef, createInitialCryptoMarketState(), { merge: true });
}

export function subscribeToCryptoMarket(onChange: (market: CryptoMarketState) => void): Unsubscribe {
  void ensureCryptoMarket();

  return onSnapshot(marketRef, async (snapshot) => {
    if (!snapshot.exists()) {
      const initialState = createInitialCryptoMarketState();
      await setDoc(marketRef, initialState, { merge: true });
      onChange(initialState);
      return;
    }

    const currentState = normalizeMarketState(snapshot.data());
    if (Date.now() - currentState.lastUpdatedAt >= CRYPTO_UPDATE_INTERVAL_MS) {
      const nextState = rollCryptoMarket(currentState);
      await setDoc(marketRef, nextState, { merge: true });
      onChange(nextState);
      return;
    }

    onChange(currentState);
  });
}

export async function updateCryptoMarketForTrade(coinId: CryptoCoinId, direction: 1 | -1, volume: number) {
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(marketRef);
    const currentMarket = snapshot.exists() ? normalizeMarketState(snapshot.data()) : createInitialCryptoMarketState();
    const currentCoin = currentMarket.coins[coinId];
    const nextValue = getNextTradePrice(currentCoin.currentValue, direction, volume);

    transaction.set(marketRef, {
      lastUpdatedAt: Date.now(),
      coins: {
        ...currentMarket.coins,
        [coinId]: {
          currentValue: nextValue,
          history: [...currentCoin.history.slice(-(CRYPTO_HISTORY_LENGTH - 1)), nextValue],
        },
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}

export async function moderateCryptoMarket(coinId: CryptoCoinId, direction: 1 | -1) {
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(marketRef);
    const currentMarket = snapshot.exists() ? normalizeMarketState(snapshot.data()) : createInitialCryptoMarketState();
    const currentCoin = currentMarket.coins[coinId];
    const nextValue = Math.max(0.1, Number((currentCoin.currentValue * (1 + direction * 0.05)).toFixed(2)));

    transaction.set(marketRef, {
      lastUpdatedAt: Date.now(),
      coins: {
        ...currentMarket.coins,
        [coinId]: {
          currentValue: nextValue,
          history: [...currentCoin.history.slice(-(CRYPTO_HISTORY_LENGTH - 1)), nextValue],
        },
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}
