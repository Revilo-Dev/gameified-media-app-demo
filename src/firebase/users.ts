import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, type Unsubscribe } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/firebase/config";
import { createInitialCryptoMarketState, getExecutedBuyCoinAmount, getExecutedSellGemValue, getNextTradePrice, normalizeMarketState } from "@/firebase/crypto-market";
import { COLLECTIONS } from "@/firebase/firestore";
import { createNotification } from "@/firebase/notifications";
import { getLevelForXp } from "@/constants/gamification";
import type { ActivityHistoryEntry, CryptoCoinId, ThemeMode, UserProfile } from "@/types/models";
import { users as demoUsers } from "@/lib/demo-data";
import { bannerPresets } from "@/lib/banner-presets";
import { readCache, writeCache } from "@/lib/persistent-cache";

function buildHandle(displayName: string, uid: string) {
  return displayName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || `user${uid.slice(0, 6)}`;
}

function normalizeCoinHoldings(holdings: Partial<Record<CryptoCoinId, number>> | undefined) {
  return {
    wutax: normalizeGemAmount(Number(holdings?.wutax ?? 0)),
    galaxy: normalizeGemAmount(Number(holdings?.galaxy ?? 0)),
    arc: normalizeGemAmount(Number(holdings?.arc ?? 0)),
    nebula: normalizeGemAmount(Number(holdings?.nebula ?? 0)),
    spark: normalizeGemAmount(Number(holdings?.spark ?? 0)),
    lumen: normalizeGemAmount(Number(holdings?.lumen ?? 0)),
    titan: normalizeGemAmount(Number(holdings?.titan ?? 0)),
  } satisfies Record<CryptoCoinId, number>;
}

function normalizeCoinInvestmentTotals(totals: Partial<Record<CryptoCoinId, number>> | undefined) {
  return {
    wutax: normalizeGemAmount(Number(totals?.wutax ?? 0)),
    galaxy: normalizeGemAmount(Number(totals?.galaxy ?? 0)),
    arc: normalizeGemAmount(Number(totals?.arc ?? 0)),
    nebula: normalizeGemAmount(Number(totals?.nebula ?? 0)),
    spark: normalizeGemAmount(Number(totals?.spark ?? 0)),
    lumen: normalizeGemAmount(Number(totals?.lumen ?? 0)),
    titan: normalizeGemAmount(Number(totals?.titan ?? 0)),
  } satisfies Record<CryptoCoinId, number>;
}

function normalizeGemAmount(value: number, minimum = 0) {
  const numericValue = Number(value);
  return Number(Math.max(minimum, Number.isFinite(numericValue) ? numericValue : minimum).toFixed(2));
}

async function createUniqueHandle(baseHandle: string, currentUserId?: string) {
  const safeBase = baseHandle.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "").slice(0, 20) || `user${(currentUserId ?? "guest").slice(0, 6)}`;
  let candidate = safeBase;
  let suffix = 1;

  while (!(await isHandleAvailable(candidate, currentUserId))) {
    const suffixText = String(suffix);
    candidate = `${safeBase.slice(0, Math.max(1, 20 - suffixText.length))}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}

export async function ensureUserProfile(user: User) {
  const ref = doc(db, COLLECTIONS.users, user.uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return snapshot.data() as UserProfile;
  }

  const displayName = user.displayName?.trim() || user.email?.split("@")[0] || "New User";
  const handle = await createUniqueHandle(buildHandle(displayName, user.uid), user.uid);
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email ?? "",
    displayName,
    handle,
    photoURL: user.photoURL ?? null,
    photoStoragePath: null,
    bannerURL: null,
    bannerStoragePath: null,
    bannerColor: bannerPresets[0],
    bio: "New here. Building a profile.",
    website: "",
    location: "",
    interests: [],
    level: 1,
    xp: 0,
    credits: 0,
    featuredBadgeId: null,
    isPremium: false,
    isModerator: false,
    isVerified: false,
    isPrivate: false,
    onboardingComplete: false,
    theme: "graphite" as ThemeMode,
    accentColor: "#ff6b57",
    gems: 0,
    coinHoldings: normalizeCoinHoldings(undefined),
    coinInvestmentTotals: normalizeCoinInvestmentTotals(undefined),
    casinoCoins: 0,
    gamblingGains: 0,
    gamblingLosses: 0,
    ownedNameColorIds: ["default"],
    ownedThemeIds: ["graphite", "mist"],
    equippedNameColorId: "default",
    ownedProfileBorderIds: ["border-none"],
    equippedProfileBorderId: "border-none",
    ownedProfileCardIds: ["card-default"],
    equippedProfileCardId: "card-default",
    displayPreferences: { disableProfileBorders: false, disableNameEffects: false },
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    rottenTomatoCount: 0,
    badgeCount: 0,
    totalPostViews: 0,
    joinedAt: new Date().toISOString(),
    lastOnlineAt: new Date().toISOString(),
    timeoutUntil: null,
    dailyClaimDate: null,
    dailyClaimAt: null,
    dailyStreak: 0,
    dailyWheelSpinDate: null,
    dailyWheelSpinsUsed: 0,
    notificationPreferences: { replies: true, mentions: true, follows: true, reactions: true, rewards: true, reports: true },
  };

  await setDoc(ref, {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return profile;
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const ref = doc(db, COLLECTIONS.users, userId);
  const normalizedUpdates = { ...updates };
  if (typeof updates.gems === "number") {
    normalizedUpdates.gems = normalizeGemAmount(updates.gems);
  }
  if (updates.coinHoldings) {
    normalizedUpdates.coinHoldings = normalizeCoinHoldings(updates.coinHoldings);
  }
  if (updates.coinInvestmentTotals) {
    normalizedUpdates.coinInvestmentTotals = normalizeCoinInvestmentTotals(updates.coinInvestmentTotals);
  }

  await updateDoc(ref, {
    ...normalizedUpdates,
    updatedAt: serverTimestamp(),
  });
}

export async function addXpToUser(userId: string, xpDelta: number) {
  const ref = doc(db, COLLECTIONS.users, userId);
  let previousLevel = 1;
  let nextLevel = 1;
  let nextXp = 0;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists()) {
      return;
    }

    const currentXp = Number(snapshot.data().xp ?? 0);
    previousLevel = Number(snapshot.data().level ?? getLevelForXp(currentXp));
    nextXp = Math.max(0, currentXp + xpDelta);
    nextLevel = getLevelForXp(nextXp);

    transaction.update(ref, {
      xp: nextXp,
      level: nextLevel,
      updatedAt: serverTimestamp(),
    });
  });

  if (nextLevel > previousLevel) {
    await createNotification({
      type: "level",
      title: "Level up",
      body: `You reached level ${nextLevel}.`,
      actorId: userId,
      userId,
      postId: null,
    });
  }

  return { previousLevel, nextLevel, nextXp };
}

export async function addGemsToUser(userId: string, gemDelta: number) {
  const ref = doc(db, COLLECTIONS.users, userId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists()) {
      return;
    }

    const currentGems = Number(snapshot.data().gems ?? 0);
    const nextGems = normalizeGemAmount(currentGems + gemDelta);

    transaction.update(ref, {
      gems: nextGems,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function addGamblingResult(userId: string, type: "gain" | "loss", amount: number, title = "Arcade game") {
  const ref = doc(db, COLLECTIONS.users, userId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists()) {
      return;
    }

    const safeAmount = Math.max(0, Math.floor(amount));
    transaction.update(ref, {
      gamblingGains: Number(snapshot.data().gamblingGains ?? 0) + (type === "gain" ? safeAmount : 0),
      gamblingLosses: Number(snapshot.data().gamblingLosses ?? 0) + (type === "loss" ? safeAmount : 0),
      updatedAt: serverTimestamp(),
    });
  });

  await recordActivity(userId, "gamble", title, `${type === "gain" ? "Won" : "Wagered"} ${formatHistoryAmount(amount)} gems`, amount);
}

function formatHistoryAmount(amount: number) {
  return Number(Math.max(0, amount).toFixed(2)).toLocaleString();
}

export async function recordActivity(userId: string, category: ActivityHistoryEntry["category"], title: string, detail: string, amount?: number) {
  const entryRef = doc(collection(db, COLLECTIONS.activityHistory));
  await setDoc(entryRef, { userId, category, title, detail, amount: amount ?? null, createdAt: new Date().toISOString() });
}

export function subscribeToActivityHistory(onChange: (entries: ActivityHistoryEntry[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, COLLECTIONS.activityHistory), orderBy("createdAt", "desc"), limit(60)), (snapshot) => {
    onChange(snapshot.docs.map((entry) => ({ ...(entry.data() as Omit<ActivityHistoryEntry, "id">), id: entry.id })));
  });
}

export async function buyCasinoCoin(userId: string) {
  const ref = doc(db, COLLECTIONS.users, userId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists()) {
      return;
    }

    const currentGems = Number(snapshot.data().gems ?? 0);
    if (currentGems < 5) {
      throw new Error("You need 5 gems to buy a casino coin.");
    }

    transaction.update(ref, {
      gems: normalizeGemAmount(currentGems - 5),
      casinoCoins: Number(snapshot.data().casinoCoins ?? 0) + 1,
      updatedAt: serverTimestamp(),
    });
  });
  await recordActivity(userId, "purchase", "Casino coin", "Purchased 1 casino coin for 5 gems", 5);
}

export async function investGemsInCoin(userId: string, coinId: CryptoCoinId, gemCost: number, coinAmount: number) {
  const ref = doc(db, COLLECTIONS.users, userId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists()) {
      return;
    }

    const safeGemCost = normalizeGemAmount(gemCost, 0.01);
    const safeCoinAmount = normalizeGemAmount(coinAmount);
    const currentGems = Number(snapshot.data().gems ?? 0);
    if (currentGems < safeGemCost) {
      throw new Error(`You need ${safeGemCost} gems to invest in ${coinId} coin.`);
    }

    if (safeCoinAmount <= 0) {
      throw new Error("That purchase does not convert into any coin.");
    }

    const currentHoldings = normalizeCoinHoldings((snapshot.data().coinHoldings ?? {}) as Partial<Record<CryptoCoinId, number>>);
    const currentInvestmentTotals = normalizeCoinInvestmentTotals((snapshot.data().coinInvestmentTotals ?? {}) as Partial<Record<CryptoCoinId, number>>);

    transaction.update(ref, {
      gems: normalizeGemAmount(currentGems - safeGemCost),
      coinHoldings: {
        ...currentHoldings,
        [coinId]: Number((currentHoldings[coinId] + safeCoinAmount).toFixed(2)),
      },
      coinInvestmentTotals: {
        ...currentInvestmentTotals,
        [coinId]: Number((currentInvestmentTotals[coinId] + safeGemCost).toFixed(2)),
      },
      updatedAt: serverTimestamp(),
    });
  });
}

export async function sellCoinForGems(userId: string, coinId: CryptoCoinId, coinAmount: number, gemValue: number) {
  const ref = doc(db, COLLECTIONS.users, userId);
  let profit = 0;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists()) {
      return;
    }

    const currentHoldings = normalizeCoinHoldings((snapshot.data().coinHoldings ?? {}) as Partial<Record<CryptoCoinId, number>>);
    const currentInvestmentTotals = normalizeCoinInvestmentTotals((snapshot.data().coinInvestmentTotals ?? {}) as Partial<Record<CryptoCoinId, number>>);
    const currentCoinAmount = Number(currentHoldings[coinId] ?? 0);
    if (currentCoinAmount < coinAmount) {
      throw new Error(`You only have ${currentCoinAmount} ${coinId} to sell.`);
    }
    const currentInvestment = Number(currentInvestmentTotals[coinId] ?? 0);
    const soldCostBasis = currentCoinAmount <= 0 ? 0 : normalizeGemAmount((currentInvestment / currentCoinAmount) * coinAmount);
    profit = normalizeGemAmount(gemValue - soldCostBasis);

    transaction.update(ref, {
      gems: normalizeGemAmount(Number(snapshot.data().gems ?? 0) + gemValue),
      coinHoldings: {
        ...currentHoldings,
        [coinId]: Number(Math.max(0, currentCoinAmount - coinAmount).toFixed(2)),
      },
      coinInvestmentTotals: {
        ...currentInvestmentTotals,
        [coinId]: Number(Math.max(0, currentInvestment - soldCostBasis).toFixed(2)),
      },
      updatedAt: serverTimestamp(),
    });
  });

  return { profit };
}

export async function executeCoinPurchase(userId: string, coinId: CryptoCoinId, gemCost: number) {
  const userRef = doc(db, COLLECTIONS.users, userId);
  const marketRef = doc(db, COLLECTIONS.markets, "global");
  let coinAmount = 0;

  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) {
      throw new Error("User profile is missing.");
    }

    const marketSnapshot = await transaction.get(marketRef);
    const currentMarket = marketSnapshot.exists() ? normalizeMarketState(marketSnapshot.data()) : createInitialCryptoMarketState();
    const safeGemCost = normalizeGemAmount(gemCost, 0.01);
    const currentGems = Number(userSnapshot.data().gems ?? 0);
    if (currentGems < safeGemCost) {
      throw new Error(`You need ${safeGemCost} gems to invest in ${coinId} coin.`);
    }

    const currentCoin = currentMarket.coins[coinId];
    coinAmount = getExecutedBuyCoinAmount(currentCoin.currentValue, safeGemCost);
    if (coinAmount <= 0) {
      throw new Error("That purchase does not convert into any coin.");
    }

    const currentHoldings = normalizeCoinHoldings((userSnapshot.data().coinHoldings ?? {}) as Partial<Record<CryptoCoinId, number>>);
    const currentInvestmentTotals = normalizeCoinInvestmentTotals((userSnapshot.data().coinInvestmentTotals ?? {}) as Partial<Record<CryptoCoinId, number>>);
    const nextValue = getNextTradePrice(currentCoin.currentValue, 1, safeGemCost);

    transaction.update(userRef, {
      gems: normalizeGemAmount(currentGems - safeGemCost),
      coinHoldings: {
        ...currentHoldings,
        [coinId]: Number((currentHoldings[coinId] + coinAmount).toFixed(2)),
      },
      coinInvestmentTotals: {
        ...currentInvestmentTotals,
        [coinId]: Number((currentInvestmentTotals[coinId] + safeGemCost).toFixed(2)),
      },
      updatedAt: serverTimestamp(),
    });

    transaction.set(marketRef, {
      lastUpdatedAt: Date.now(),
      coins: {
        ...currentMarket.coins,
        [coinId]: {
          currentValue: nextValue,
          history: [...currentCoin.history.slice(-17), nextValue],
        },
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  await recordActivity(userId, "trade", `Bought ${coinId.toUpperCase()}`, `${formatHistoryAmount(gemCost)} gems for ${formatHistoryAmount(coinAmount)} coins`, gemCost);
  return { coinAmount };
}

export async function executeCoinSale(userId: string, coinId: CryptoCoinId, coinAmount: number) {
  const userRef = doc(db, COLLECTIONS.users, userId);
  const marketRef = doc(db, COLLECTIONS.markets, "global");
  let profit = 0;
  let gemValue = 0;

  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) {
      throw new Error("User profile is missing.");
    }

    const safeCoinAmount = normalizeGemAmount(coinAmount);
    if (safeCoinAmount <= 0) {
      throw new Error("Choose an amount greater than zero to sell.");
    }

    const marketSnapshot = await transaction.get(marketRef);
    const currentMarket = marketSnapshot.exists() ? normalizeMarketState(marketSnapshot.data()) : createInitialCryptoMarketState();
    const currentCoin = currentMarket.coins[coinId];
    gemValue = getExecutedSellGemValue(currentCoin.currentValue, safeCoinAmount);

    const currentHoldings = normalizeCoinHoldings((userSnapshot.data().coinHoldings ?? {}) as Partial<Record<CryptoCoinId, number>>);
    const currentInvestmentTotals = normalizeCoinInvestmentTotals((userSnapshot.data().coinInvestmentTotals ?? {}) as Partial<Record<CryptoCoinId, number>>);
    const currentCoinAmount = Number(currentHoldings[coinId] ?? 0);
    if (currentCoinAmount < safeCoinAmount) {
      throw new Error(`You only have ${currentCoinAmount} ${coinId} to sell.`);
    }

    const currentInvestment = Number(currentInvestmentTotals[coinId] ?? 0);
    const soldCostBasis = currentCoinAmount <= 0 ? 0 : normalizeGemAmount((currentInvestment / currentCoinAmount) * safeCoinAmount);
    profit = normalizeGemAmount(gemValue - soldCostBasis);
    const nextValue = getNextTradePrice(currentCoin.currentValue, -1, gemValue);

    transaction.update(userRef, {
      gems: normalizeGemAmount(Number(userSnapshot.data().gems ?? 0) + gemValue),
      coinHoldings: {
        ...currentHoldings,
        [coinId]: Number(Math.max(0, currentCoinAmount - safeCoinAmount).toFixed(2)),
      },
      coinInvestmentTotals: {
        ...currentInvestmentTotals,
        [coinId]: Number(Math.max(0, currentInvestment - soldCostBasis).toFixed(2)),
      },
      updatedAt: serverTimestamp(),
    });

    transaction.set(marketRef, {
      lastUpdatedAt: Date.now(),
      coins: {
        ...currentMarket.coins,
        [coinId]: {
          currentValue: nextValue,
          history: [...currentCoin.history.slice(-17), nextValue],
        },
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  await recordActivity(userId, "trade", `Sold ${coinId.toUpperCase()}`, `${formatHistoryAmount(coinAmount)} coins for ${formatHistoryAmount(gemValue)} gems`, gemValue);
  return { profit, gemValue };
}

export async function spendCasinoCoin(userId: string) {
  const ref = doc(db, COLLECTIONS.users, userId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists()) {
      return;
    }

    const currentCasinoCoins = Number(snapshot.data().casinoCoins ?? 0);
    if (currentCasinoCoins < 1) {
      throw new Error("You need 1 casino coin to spin.");
    }

    transaction.update(ref, {
      casinoCoins: currentCasinoCoins - 1,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function touchUserLastOnline(userId: string) {
  await updateDoc(doc(db, COLLECTIONS.users, userId), {
    lastOnlineAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToXpLeaderboard(onChange: (users: UserProfile[]) => void): Unsubscribe {
  const leaderboardQuery = query(collection(db, COLLECTIONS.users), orderBy("level", "desc"), limit(50));

  return onSnapshot(leaderboardQuery, (snapshot) => {
    onChange(
      snapshot.docs
        .map((document) => ({
          ...(document.data() as UserProfile),
          uid: document.id,
        }))
        .sort((left, right) => right.level - left.level)
        .slice(0, 20),
    );
  });
}

export function subscribeToUserLeaderboard(field: "level" | "gems" | "postCount" | "followerCount", onChange: (users: UserProfile[]) => void): Unsubscribe {
  const leaderboardQuery = query(collection(db, COLLECTIONS.users), orderBy(field, "desc"), limit(50));

  return onSnapshot(leaderboardQuery, (snapshot) => {
    onChange(
      snapshot.docs
        .map((document) => ({
          ...(document.data() as UserProfile),
          uid: document.id,
        }))
        .sort((left, right) => Number(right[field] ?? 0) - Number(left[field] ?? 0))
        .slice(0, 20),
    );
  });
}

export function getDemoUserById(uid: string) {
  return demoUsers.find((user) => user.uid === uid);
}

export function getDemoUserByHandle(handle: string) {
  return demoUsers.find((user) => user.handle === handle);
}

export function subscribeToUserProfileById(userId: string, onChange: (profile: UserProfile | null) => void): Unsubscribe {
  const cacheKey = `cache:user:${userId}`;
  const cachedProfile = readCache<UserProfile>(cacheKey);
  if (cachedProfile) {
    onChange(cachedProfile);
  }

  const ref = doc(db, COLLECTIONS.users, userId);

  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      console.warn("[profile] missing user doc", { userId });
      onChange(null);
      return;
    }

    const nextProfile = { ...(snapshot.data() as UserProfile), uid: snapshot.id };
    writeCache(cacheKey, nextProfile);
    onChange(nextProfile);
  });
}

export function subscribeToUserProfileByHandle(handle: string, onChange: (profile: UserProfile | null) => void): Unsubscribe {
  const normalizedHandle = handle.trim().toLowerCase();
  const cacheKey = `cache:user-handle:${normalizedHandle}`;
  const cachedProfile = readCache<UserProfile>(cacheKey);
  if (cachedProfile) onChange(cachedProfile);
  const profileQuery = query(collection(db, COLLECTIONS.users), where("handle", "==", normalizedHandle), limit(1));

  return onSnapshot(profileQuery, (snapshot) => {
    if (snapshot.empty) {
      console.warn("[profile] missing user handle", { handle });
      onChange(null);
      return;
    }

    const document = snapshot.docs[0];
    const profile = { ...(document.data() as UserProfile), uid: document.id };
    writeCache(cacheKey, profile);
    writeCache(`cache:user:${document.id}`, profile);
    onChange(profile);
  });
}

export function subscribeToUserProfiles(onChange: (users: UserProfile[]) => void): Unsubscribe {
  const profilesQuery = query(collection(db, COLLECTIONS.users), orderBy("joinedAt", "desc"), limit(100));

  return onSnapshot(profilesQuery, (snapshot) => {
    onChange(
      snapshot.docs.map((document) => ({
        ...(document.data() as UserProfile),
        uid: document.id,
      })),
    );
  });
}

export async function getModeratorIds() {
  const moderatorsQuery = query(collection(db, COLLECTIONS.users), where("isModerator", "==", true), limit(50));
  const snapshot = await getDocs(moderatorsQuery);
  return snapshot.docs.map((document) => document.id);
}

export async function isHandleAvailable(handle: string, currentUserId?: string) {
  const normalizedHandle = handle.trim().toLowerCase();
  const profileQuery = query(collection(db, COLLECTIONS.users), where("handle", "==", normalizedHandle), limit(1));
  const snapshot = await getDocs(profileQuery);

  if (snapshot.empty) {
    return true;
  }

  return snapshot.docs[0].id === currentUserId;
}
