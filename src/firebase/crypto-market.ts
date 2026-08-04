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

function clampCryptoDecimal(value: number, minimum = 0.1) {
  const numericValue = Number(value);
  return Number(Math.max(minimum, Number.isFinite(numericValue) ? numericValue : minimum).toFixed(2));
}

export function getTradeImpact(volume: number) {
  return Math.min(0.12, Math.max(0.01, volume / 500));
}

export function getNextTradePrice(currentValue: number, direction: 1 | -1, volume: number) {
  const impact = getTradeImpact(volume);
  return clampCryptoDecimal(currentValue * (1 + direction * impact));
}

export function getExecutedBuyCoinAmount(currentValue: number, volume: number) {
  const nextValue = getNextTradePrice(currentValue, 1, volume);
  return clampCryptoDecimal(volume / nextValue, 0);
}

export function getExecutedSellGemValue(currentValue: number, coinAmount: number) {
  return clampCryptoDecimal(coinAmount * currentValue, 0);
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
      lumen: { currentValue: 3.14, history: [2.72, 2.8, 2.88, 2.81, 2.94, 3.02, 3.09, 3.01, 3.16, 3.24, 3.19, 3.28, 3.22, 3.31, 3.18, 3.26, 3.2, 3.14] },
      titan: { currentValue: 6.48, history: [5.7, 5.82, 5.96, 6.1, 6.02, 6.18, 6.26, 6.14, 6.32, 6.4, 6.51, 6.43, 6.58, 6.7, 6.62, 6.55, 6.59, 6.48] },
    },
  };
}

function getNextCoinValue(value: number) {
  const magnitude = 0.01 + Math.random() * 0.07;
  const direction = Math.random() < 0.5 ? -1 : 1;
  const delta = 1 + direction * magnitude;
  return clampCryptoDecimal(value * delta);
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
        currentValue: clampCryptoDecimal(Number(data.coins?.wutax?.currentValue ?? fallbackCoins.wutax.currentValue)),
        history: Array.isArray(data.coins?.wutax?.history) ? data.coins.wutax.history.map((value) => clampCryptoDecimal(Number(value))).slice(-CRYPTO_HISTORY_LENGTH) : fallbackCoins.wutax.history,
      },
      galaxy: {
        currentValue: clampCryptoDecimal(Number(data.coins?.galaxy?.currentValue ?? fallbackCoins.galaxy.currentValue)),
        history: Array.isArray(data.coins?.galaxy?.history) ? data.coins.galaxy.history.map((value) => clampCryptoDecimal(Number(value))).slice(-CRYPTO_HISTORY_LENGTH) : fallbackCoins.galaxy.history,
      },
      arc: {
        currentValue: clampCryptoDecimal(Number(data.coins?.arc?.currentValue ?? fallbackCoins.arc.currentValue)),
        history: Array.isArray(data.coins?.arc?.history) ? data.coins.arc.history.map((value) => clampCryptoDecimal(Number(value))).slice(-CRYPTO_HISTORY_LENGTH) : fallbackCoins.arc.history,
      },
      nebula: {
        currentValue: clampCryptoDecimal(Number(data.coins?.nebula?.currentValue ?? fallbackCoins.nebula.currentValue)),
        history: Array.isArray(data.coins?.nebula?.history) ? data.coins.nebula.history.map((value) => clampCryptoDecimal(Number(value))).slice(-CRYPTO_HISTORY_LENGTH) : fallbackCoins.nebula.history,
      },
      spark: {
        currentValue: clampCryptoDecimal(Number(data.coins?.spark?.currentValue ?? fallbackCoins.spark.currentValue)),
        history: Array.isArray(data.coins?.spark?.history) ? data.coins.spark.history.map((value) => clampCryptoDecimal(Number(value))).slice(-CRYPTO_HISTORY_LENGTH) : fallbackCoins.spark.history,
      },
      lumen: {
        currentValue: clampCryptoDecimal(Number(data.coins?.lumen?.currentValue ?? fallbackCoins.lumen.currentValue)),
        history: Array.isArray(data.coins?.lumen?.history) ? data.coins.lumen.history.map((value) => clampCryptoDecimal(Number(value))).slice(-CRYPTO_HISTORY_LENGTH) : fallbackCoins.lumen.history,
      },
      titan: {
        currentValue: clampCryptoDecimal(Number(data.coins?.titan?.currentValue ?? fallbackCoins.titan.currentValue)),
        history: Array.isArray(data.coins?.titan?.history) ? data.coins.titan.history.map((value) => clampCryptoDecimal(Number(value))).slice(-CRYPTO_HISTORY_LENGTH) : fallbackCoins.titan.history,
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
    const nextValue = clampCryptoDecimal(currentCoin.currentValue * (1 + direction * 0.05));

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
