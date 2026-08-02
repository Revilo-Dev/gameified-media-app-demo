import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, type Unsubscribe } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import { createNotification } from "@/firebase/notifications";
import { getLevelForXp } from "@/constants/gamification";
import type { ThemeMode, UserProfile } from "@/types/models";
import { users as demoUsers } from "@/lib/demo-data";
import { bannerPresets } from "@/lib/banner-presets";
import { readCache, writeCache } from "@/lib/persistent-cache";

function buildHandle(displayName: string, uid: string) {
  return displayName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || `user${uid.slice(0, 6)}`;
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
    emeralds: 0,
    casinoCoins: 0,
    ownedNameColorIds: ["default"],
    ownedThemeIds: ["graphite", "mist"],
    equippedNameColorId: "default",
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    badgeCount: 0,
    joinedAt: new Date().toISOString(),
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
  await updateDoc(ref, {
    ...updates,
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
    const nextGems = Math.max(0, currentGems + gemDelta);

    transaction.update(ref, {
      gems: nextGems,
      updatedAt: serverTimestamp(),
    });
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
      gems: currentGems - 5,
      casinoCoins: Number(snapshot.data().casinoCoins ?? 0) + 1,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function investGemsInEmeralds(userId: string, gemCost: number) {
  const ref = doc(db, COLLECTIONS.users, userId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists()) {
      return;
    }

    const currentGems = Number(snapshot.data().gems ?? 0);
    if (currentGems < gemCost) {
      throw new Error(`You need ${gemCost} gems to invest in emeralds.`);
    }

    transaction.update(ref, {
      gems: currentGems - gemCost,
      emeralds: Number(snapshot.data().emeralds ?? 0) + gemCost,
      updatedAt: serverTimestamp(),
    });
  });
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
  const profileQuery = query(collection(db, COLLECTIONS.users), where("handle", "==", handle), limit(1));

  return onSnapshot(profileQuery, (snapshot) => {
    if (snapshot.empty) {
      console.warn("[profile] missing user handle", { handle });
      onChange(null);
      return;
    }

    const document = snapshot.docs[0];
    onChange({ ...(document.data() as UserProfile), uid: document.id });
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
