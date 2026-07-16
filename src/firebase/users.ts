import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, type Unsubscribe } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import { xpRequiredForLevel } from "@/constants/gamification";
import type { ThemeMode, UserProfile } from "@/types/models";

function buildHandle(displayName: string, uid: string) {
  return displayName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || `user${uid.slice(0, 6)}`;
}

export async function ensureUserProfile(user: User) {
  const ref = doc(db, COLLECTIONS.users, user.uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return snapshot.data() as UserProfile;
  }

  const displayName = user.displayName?.trim() || user.email?.split("@")[0] || "New User";
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email ?? "",
    displayName,
    handle: buildHandle(displayName, user.uid),
    photoURL: user.photoURL ?? null,
    bannerURL: null,
    bio: "New here. Building a profile.",
    website: "",
    location: "",
    interests: [],
    level: 1,
    xp: 0,
    credits: 0,
    featuredBadgeId: null,
    isPremium: false,
    isVerified: false,
    isPrivate: false,
    onboardingComplete: false,
    theme: "dark" as ThemeMode,
    accentColor: "#ff6b57",
    gems: 0,
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

function getLevelForXp(xp: number) {
  let level = 1;

  while (xp >= xpRequiredForLevel(level + 1)) {
    level += 1;
  }

  return level;
}

export async function addXpToUser(userId: string, xpDelta: number) {
  const ref = doc(db, COLLECTIONS.users, userId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists()) {
      return;
    }

    const currentXp = Number(snapshot.data().xp ?? 0);
    const nextXp = Math.max(0, currentXp + xpDelta);

    transaction.update(ref, {
      xp: nextXp,
      level: getLevelForXp(nextXp),
      updatedAt: serverTimestamp(),
    });
  });
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

export function subscribeToXpLeaderboard(onChange: (users: UserProfile[]) => void): Unsubscribe {
  const leaderboardQuery = query(collection(db, COLLECTIONS.users), orderBy("xp", "desc"), orderBy("level", "desc"), limit(20));

  return onSnapshot(leaderboardQuery, (snapshot) => {
    onChange(
      snapshot.docs.map((document) => ({
        ...(document.data() as UserProfile),
        uid: document.id,
      })),
    );
  });
}
