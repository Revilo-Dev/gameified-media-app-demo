import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, type Unsubscribe } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import { getLevelForXp } from "@/constants/gamification";
import type { ThemeMode, UserProfile } from "@/types/models";
import { users as demoUsers } from "@/lib/demo-data";

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
    isModerator: false,
    isVerified: false,
    isPrivate: false,
    onboardingComplete: false,
    theme: "graphite" as ThemeMode,
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

export function getDemoUserById(uid: string) {
  return demoUsers.find((user) => user.uid === uid);
}

export function getDemoUserByHandle(handle: string) {
  return demoUsers.find((user) => user.handle === handle);
}

export function subscribeToUserProfileById(userId: string, onChange: (profile: UserProfile | null) => void): Unsubscribe {
  const ref = doc(db, COLLECTIONS.users, userId);

  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      console.warn("[profile] missing user doc", { userId });
      onChange(null);
      return;
    }

    onChange({ ...(snapshot.data() as UserProfile), uid: snapshot.id });
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
