import { HttpsError, onCall } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { createHash } from "node:crypto";
initializeApp();
const db = getFirestore();
const auth = getAuth();
const storage = getStorage();
const MAX_GEM_TRANSFER = 1_000_000;
function normalizeGemAmount(value, minimum = 0) {
    const numericValue = Number(value);
    return Number(Math.max(minimum, Number.isFinite(numericValue) ? numericValue : minimum).toFixed(2));
}
function getRequesterIp(request) {
    const forwardedFor = request.rawRequest.headers["x-forwarded-for"];
    const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0];
    return (forwardedIp ?? request.rawRequest.socket?.remoteAddress ?? "").trim();
}
function ipHash(ip) {
    return createHash("sha256").update(ip).digest("hex");
}
async function isRequesterIpBanned(request) {
    const ip = getRequesterIp(request);
    if (!ip)
        return false;
    return (await db.collection("bannedIps").doc(ipHash(ip)).get()).exists;
}
/** Lets the client block account entry before authentication. The IP itself is never returned. */
export const checkIpBan = onCall(async (request) => ({ banned: await isRequesterIpBanned(request) }));
/** Records the current authenticated user's IP so moderators can ban it with their account. */
export const registerUserDeviceIp = onCall(async (request) => {
    if (!request.auth?.uid)
        throw new HttpsError("unauthenticated", "You must be signed in.");
    const ip = getRequesterIp(request);
    if (!ip)
        return { banned: false };
    const hashedIp = ipHash(ip);
    if ((await db.collection("bannedIps").doc(hashedIp).get()).exists) {
        return { banned: true };
    }
    await db.collection("userIpAddresses").doc(`${request.auth.uid}_${hashedIp}`).set({
        userId: request.auth.uid,
        ipHash: hashedIp,
        lastSeenAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { banned: false };
});
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
    const ipAddressesSnapshot = await db.collection("userIpAddresses").where("userId", "==", targetUserId).get();
    const banBatch = db.batch();
    ipAddressesSnapshot.docs.forEach((ipAddress) => {
        const hashedIp = ipAddress.get("ipHash");
        if (typeof hashedIp === "string" && hashedIp) {
            banBatch.set(db.collection("bannedIps").doc(hashedIp), {
                bannedAt: FieldValue.serverTimestamp(),
                bannedUserId: targetUserId,
            });
        }
        banBatch.delete(ipAddress.ref);
    });
    await banBatch.commit();
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
    try {
        await auth.deleteUser(targetUserId);
    }
    catch (error) {
        if (error.code !== "auth/user-not-found") {
            throw error;
        }
    }
    return { ok: true };
});
export const removePostEmbed = onCall(async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    await assertModerator(request.auth.uid);
    const postId = typeof request.data?.postId === "string" ? request.data.postId.trim() : "";
    if (!postId) {
        throw new HttpsError("invalid-argument", "A post ID is required.");
    }
    const postRef = db.collection("posts").doc(postId);
    const postSnapshot = await postRef.get();
    if (!postSnapshot.exists) {
        throw new HttpsError("not-found", "Post not found.");
    }
    const storagePaths = new Set();
    const imageStoragePaths = postSnapshot.get("imageStoragePaths");
    if (Array.isArray(imageStoragePaths)) {
        imageStoragePaths.forEach((path) => {
            if (typeof path === "string" && path)
                storagePaths.add(path);
        });
    }
    const imageStoragePath = postSnapshot.get("imageStoragePath");
    if (typeof imageStoragePath === "string" && imageStoragePath)
        storagePaths.add(imageStoragePath);
    await Promise.all([...storagePaths].map((storagePath) => deleteStoragePath(storagePath)));
    await postRef.update({
        imageURL: null,
        imageStoragePath: null,
        imageUrls: [],
        imageStoragePaths: [],
        gifURL: null,
        poll: null,
        updatedAt: FieldValue.serverTimestamp(),
    });
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
                lumen: 0,
                titan: 0,
            },
            coinInvestmentTotals: {
                wutax: 0,
                galaxy: 0,
                arc: 0,
                nebula: 0,
                spark: 0,
                lumen: 0,
                titan: 0,
            },
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    await db.collection("markets").doc("global").set({
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
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
});
export const transferGems = onCall(async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    const senderId = request.auth.uid;
    const recipientId = typeof request.data?.recipientUserId === "string" ? request.data.recipientUserId.trim() : "";
    const amount = normalizeGemAmount(Number(request.data?.amount), 0);
    const note = typeof request.data?.note === "string" ? request.data.note.trim().slice(0, 160) : "";
    if (!recipientId) {
        throw new HttpsError("invalid-argument", "Choose a recipient.");
    }
    if (recipientId === senderId) {
        throw new HttpsError("failed-precondition", "You cannot transfer gems to yourself.");
    }
    if (amount <= 0) {
        throw new HttpsError("invalid-argument", "Enter an amount greater than zero.");
    }
    if (amount > MAX_GEM_TRANSFER) {
        throw new HttpsError("invalid-argument", `Transfers are capped at ${MAX_GEM_TRANSFER.toLocaleString()} gems.`);
    }
    const senderRef = db.collection("users").doc(senderId);
    const recipientRef = db.collection("users").doc(recipientId);
    let senderDisplayName = "Someone";
    let recipientDisplayName = "that user";
    await db.runTransaction(async (transaction) => {
        const [senderSnapshot, recipientSnapshot] = await Promise.all([
            transaction.get(senderRef),
            transaction.get(recipientRef),
        ]);
        if (!senderSnapshot.exists) {
            throw new HttpsError("not-found", "Your profile is missing.");
        }
        if (!recipientSnapshot.exists) {
            throw new HttpsError("not-found", "Recipient not found.");
        }
        const senderGems = Number(senderSnapshot.get("gems") ?? 0);
        if (senderGems < amount) {
            throw new HttpsError("failed-precondition", "You do not have enough gems for that transfer.");
        }
        const recipientGems = Number(recipientSnapshot.get("gems") ?? 0);
        senderDisplayName = String(senderSnapshot.get("displayName") ?? "Someone");
        recipientDisplayName = String(recipientSnapshot.get("displayName") ?? "that user");
        transaction.update(senderRef, {
            gems: normalizeGemAmount(senderGems - amount),
            updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.update(recipientRef, {
            gems: normalizeGemAmount(recipientGems + amount),
            updatedAt: FieldValue.serverTimestamp(),
        });
    });
    const now = FieldValue.serverTimestamp();
    const transferRef = db.collection("gemTransfers").doc();
    const senderActivityRef = db.collection("activityHistory").doc();
    const recipientActivityRef = db.collection("activityHistory").doc();
    const notificationRef = db.collection("notifications").doc();
    const detail = note ? `${note} · ${amount.toLocaleString()} gems` : `${amount.toLocaleString()} gems`;
    await db.batch()
        .set(transferRef, {
        senderId,
        recipientId,
        amount,
        note: note || null,
        createdAt: now,
    })
        .set(senderActivityRef, {
        userId: senderId,
        category: "transfer",
        title: `Sent gems to ${recipientDisplayName}`,
        detail,
        amount,
        createdAt: new Date().toISOString(),
    })
        .set(recipientActivityRef, {
        userId: recipientId,
        category: "transfer",
        title: `Received gems from ${senderDisplayName}`,
        detail,
        amount,
        createdAt: new Date().toISOString(),
    })
        .set(notificationRef, {
        type: "reward",
        title: "Gems received",
        body: `${senderDisplayName} sent you ${amount.toLocaleString()} gems.`,
        actorId: senderId,
        userId: recipientId,
        postId: null,
        read: false,
        createdAt: now,
    })
        .commit();
    return { ok: true, amount, recipientUserId: recipientId };
});
export const claimDailyReward = onCall(async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    const userRef = db.collection("users").doc(request.auth.uid);
    const now = Date.now();
    const cooldownMs = 12 * 60 * 60 * 1000;
    const today = new Date(now).toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let reward = 0;
    let streak = 0;
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(userRef);
        if (!snapshot.exists) {
            throw new HttpsError("not-found", "Your profile is missing.");
        }
        const lastClaimAt = Number(snapshot.get("dailyClaimAt") ?? 0);
        if (lastClaimAt && now - lastClaimAt < cooldownMs) {
            throw new HttpsError("already-exists", "Your next reward is available in 12 hours.");
        }
        streak = snapshot.get("dailyClaimDate") === today
            ? Number(snapshot.get("dailyStreak") ?? 1)
            : snapshot.get("dailyClaimDate") === yesterday ? Number(snapshot.get("dailyStreak") ?? 0) + 1 : 1;
        const baseReward = 100 + (streak - 1) * 25;
        reward = baseReward * (snapshot.get("isPremium") === true ? 2 : 1);
        const gems = Number(snapshot.get("gems") ?? 0);
        transaction.update(userRef, {
            gems: Number((gems + reward).toFixed(2)),
            dailyClaimDate: today,
            dailyClaimAt: now,
            dailyStreak: streak,
            updatedAt: FieldValue.serverTimestamp(),
        });
    });
    return { reward, streak };
});
export const recordPostView = onCall(async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    const postId = typeof request.data?.postId === "string" ? request.data.postId : "";
    if (!postId)
        throw new HttpsError("invalid-argument", "A post id is required.");
    const postRef = db.collection("posts").doc(postId);
    const viewRef = db.collection("postViews").doc(`${postId}_${request.auth.uid}`);
    let counted = false;
    await db.runTransaction(async (transaction) => {
        const [post, view] = await Promise.all([transaction.get(postRef), transaction.get(viewRef)]);
        if (!post.exists)
            throw new HttpsError("not-found", "Post not found.");
        if (view.exists)
            return;
        const authorId = String(post.get("authorId") ?? "");
        transaction.set(viewRef, { postId, userId: request.auth.uid, createdAt: FieldValue.serverTimestamp() });
        transaction.update(postRef, { viewCount: FieldValue.increment(1) });
        if (authorId)
            transaction.update(db.collection("users").doc(authorId), { totalPostViews: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
        counted = true;
    });
    return { counted };
});
