import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import type { NotificationItem } from "@/types/models";

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
  const notificationsQuery = query(
    collection(db, COLLECTIONS.notifications),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50),
  );

  return onSnapshot(notificationsQuery, (snapshot) => {
    onChange(
      snapshot.docs.map((document) => ({
        id: document.id,
        ...({
          ...(document.data() as Omit<NotificationItem, "id">),
          createdAt: normalizeCreatedAt(document.data().createdAt),
        } as Omit<NotificationItem, "id">),
      })),
    );
  });
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(db, COLLECTIONS.notifications, notificationId), { read: true });
}
