import { HttpsError, onCall } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

initializeApp();

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

export const reserveHandle = onCall(async () => {
  return { ok: true };
});

async function deleteFilesWithPrefix(prefix: string) {
  await storage.bucket().deleteFiles({ prefix, force: true });
}

async function deletePostsByAuthor(authorId: string) {
  const postsSnapshot = await db.collection("posts").where("authorId", "==", authorId).get();
  if (postsSnapshot.empty) {
    return;
  }

  const replyCountAdjustments = new Map<string, number>();
  const batch = db.batch();

  postsSnapshot.docs.forEach((postDoc) => {
    const parentPostId = postDoc.get("parentPostId");
    if (typeof parentPostId === "string" && parentPostId) {
      replyCountAdjustments.set(parentPostId, (replyCountAdjustments.get(parentPostId) ?? 0) + 1);
    }

    batch.delete(postDoc.ref);
  });

  replyCountAdjustments.forEach((count, postId) => {
    batch.update(db.collection("posts").doc(postId), {
      replyCount: FieldValue.increment(-count),
    });
  });

  await batch.commit();
}

export const banUserAccount = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const moderatorSnapshot = await db.collection("users").doc(request.auth.uid).get();
  if (!moderatorSnapshot.exists || moderatorSnapshot.get("isModerator") !== true) {
    throw new HttpsError("permission-denied", "Moderator access required.");
  }

  const targetUserId = typeof request.data?.targetUserId === "string" ? request.data.targetUserId.trim() : "";
  if (!targetUserId) {
    throw new HttpsError("invalid-argument", "A target user ID is required.");
  }

  if (targetUserId === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Moderators cannot ban their own account.");
  }

  await deletePostsByAuthor(targetUserId);
  await Promise.all([
    db.collection("users").doc(targetUserId).delete(),
    deleteFilesWithPrefix(`avatars/${targetUserId}/`),
    deleteFilesWithPrefix(`banners/${targetUserId}/`),
    deleteFilesWithPrefix(`posts/${targetUserId}/`),
  ]);

  const followCollections = ["follows", "bookmarks"];
  for (const collectionName of followCollections) {
    const snapshot = await db.collection(collectionName).where("userId", "==", targetUserId).get().catch(() => null);
    if (snapshot && !snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((item) => batch.delete(item.ref));
      await batch.commit();
    }
  }

  const followsByFollower = await db.collection("follows").where("followerId", "==", targetUserId).get();
  const followsByFollowing = await db.collection("follows").where("followingId", "==", targetUserId).get();

  for (const snapshot of [followsByFollower, followsByFollowing]) {
    if (snapshot.empty) {
      continue;
    }

    const batch = db.batch();
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
  }

  await auth.deleteUser(targetUserId);

  return { ok: true };
});
