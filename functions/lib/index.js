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
async function deleteFilesWithPrefix(prefix) {
    await storage.bucket().deleteFiles({ prefix, force: true });
}
async function deleteStoragePath(storagePath) {
    if (!storagePath) {
        return;
    }
    try {
        await storage.bucket().file(storagePath).delete({ ignoreNotFound: true });
    }
    catch {
        // Ignore storage cleanup failures so the primary delete can still complete.
    }
}
async function deletePostCascadeAdmin(postId) {
    const postRef = db.collection("posts").doc(postId);
    const postSnapshot = await postRef.get();
    if (!postSnapshot.exists) {
        return;
    }
    const parentPostId = typeof postSnapshot.get("parentPostId") === "string" ? postSnapshot.get("parentPostId") : null;
    const replyToPostId = typeof postSnapshot.get("replyToPostId") === "string" ? postSnapshot.get("replyToPostId") : null;
    const imageStoragePath = typeof postSnapshot.get("imageStoragePath") === "string" ? postSnapshot.get("imageStoragePath") : null;
    const [childRepliesByParent, childRepliesByReplyTo, reactionsSnapshot, bookmarksSnapshot, notificationsSnapshot] = await Promise.all([
        db.collection("posts").where("parentPostId", "==", postId).get(),
        db.collection("posts").where("replyToPostId", "==", postId).get(),
        db.collection("reactions").where("postId", "==", postId).get(),
        db.collection("bookmarks").where("postId", "==", postId).get(),
        db.collection("notifications").where("postId", "==", postId).get(),
    ]);
    const childIds = new Set();
    [...childRepliesByParent.docs, ...childRepliesByReplyTo.docs].forEach((docSnapshot) => {
        childIds.add(docSnapshot.id);
    });
    for (const childId of childIds) {
        await deletePostCascadeAdmin(childId);
    }
    const batch = db.batch();
    reactionsSnapshot.docs.forEach((document) => batch.delete(document.ref));
    bookmarksSnapshot.docs.forEach((document) => batch.delete(document.ref));
    notificationsSnapshot.docs.forEach((document) => batch.delete(document.ref));
    batch.delete(postRef);
    if (parentPostId) {
        batch.update(db.collection("posts").doc(parentPostId), {
            replyCount: FieldValue.increment(-1),
        });
    }
    if (replyToPostId && replyToPostId !== parentPostId) {
        batch.update(db.collection("posts").doc(replyToPostId), {
            replyCount: FieldValue.increment(-1),
        });
    }
    await batch.commit();
    await deleteStoragePath(imageStoragePath);
}
async function deletePostsByAuthor(authorId) {
    const postsSnapshot = await db.collection("posts").where("authorId", "==", authorId).get();
    if (postsSnapshot.empty) {
        return;
    }
    const replyCountAdjustments = new Map();
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
export const deletePostCascade = onCall(async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    const postId = typeof request.data?.postId === "string" ? request.data.postId.trim() : "";
    if (!postId) {
        throw new HttpsError("invalid-argument", "A post ID is required.");
    }
    const [postSnapshot, currentUserSnapshot] = await Promise.all([
        db.collection("posts").doc(postId).get(),
        db.collection("users").doc(request.auth.uid).get(),
    ]);
    if (!postSnapshot.exists) {
        throw new HttpsError("not-found", "Post not found.");
    }
    const authorId = String(postSnapshot.get("authorId") ?? "");
    const isModerator = currentUserSnapshot.exists && currentUserSnapshot.get("isModerator") === true;
    if (authorId !== request.auth.uid && !isModerator) {
        throw new HttpsError("permission-denied", "You do not have permission to delete this post.");
    }
    await deletePostCascadeAdmin(postId);
    return { ok: true };
});
async function assertModerator(uid) {
    const moderatorSnapshot = await db.collection("users").doc(uid).get();
    if (!moderatorSnapshot.exists || moderatorSnapshot.get("isModerator") !== true) {
        throw new HttpsError("permission-denied", "Moderator access required.");
    }
}
export const resetAllGems = onCall(async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    await assertModerator(request.auth.uid);
    const usersSnapshot = await db.collection("users").get();
    for (const userDocument of usersSnapshot.docs) {
        await userDocument.ref.update({
            gems: 500,
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    return { ok: true };
});
export const resetAllCrypto = onCall(async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    await assertModerator(request.auth.uid);
    const usersSnapshot = await db.collection("users").get();
    for (const userDocument of usersSnapshot.docs) {
        await userDocument.ref.update({
            coinHoldings: {
                wutax: 0,
                galaxy: 0,
                arc: 0,
                nebula: 0,
                spark: 0,
            },
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    return { ok: true };
});
