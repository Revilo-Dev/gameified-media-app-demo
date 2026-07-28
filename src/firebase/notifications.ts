import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  where,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import { readCache, writeCache } from "@/lib/persistent-cache";
import type { NotificationItem } from "@/types/models";
import type { UserProfile } from "@/types/models";

function normalizeCreatedAt(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return new Date().toISOString();
}

export async function createNotification(input: Omit<NotificationItem, "id" | "createdAt" | "read">) {
  await addDoc(collection(db, COLLECTIONS.notifications), {
    ...input,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToNotifications(userId: string, onChange: (notifications: NotificationItem[]) => void): Unsubscribe {
  const cacheKey = `cache:notifications:${userId}`;
  const cachedNotifications = readCache<NotificationItem[]>(cacheKey);
  if (cachedNotifications?.length) {
    onChange(cachedNotifications);
  }

  const notificationsQuery = query(
    collection(db, COLLECTIONS.notifications),
    where("userId", "==", userId),
  );

  return onSnapshot(notificationsQuery, (snapshot) => {
    const nextNotifications = snapshot.docs.map((document) => ({
        id: document.id,
        ...({
          ...(document.data() as Omit<NotificationItem, "id">),
          createdAt: normalizeCreatedAt(document.data().createdAt),
        } as Omit<NotificationItem, "id">),
      }))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 50);
    writeCache(cacheKey, nextNotifications);
    onChange(nextNotifications);
  });
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(db, COLLECTIONS.notifications, notificationId), { read: true });
}

export async function getUserProfile(userId: string) {
  const snapshot = await getDoc(doc(db, COLLECTIONS.users, userId));

  if (!snapshot.exists()) {
    return null;
  }

  return { ...(snapshot.data() as UserProfile), uid: snapshot.id };
}
