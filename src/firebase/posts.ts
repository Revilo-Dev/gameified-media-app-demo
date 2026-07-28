import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import { createNotification } from "@/firebase/notifications";
import { addXpToUser, subscribeToXpLeaderboard } from "@/firebase/users";
import { deleteStorageObject } from "@/firebase/storage";
import { readCache, writeCache } from "@/lib/persistent-cache";
import type { Post, UserProfile } from "@/types/models";

const POSTS_CACHE_KEY = "cache:posts";
const POSTS_CACHE_LIMIT = 25;

function normalizeCreatedAt(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return new Date().toISOString();
}

function normalizePost(document: { id: string; data: () => Record<string, unknown> }): Post {
  const data = document.data();

  return {
    id: document.id,
    authorId: String(data.authorId ?? ""),
    content: String(data.content ?? ""),
    imageURL: typeof data.imageURL === "string" ? data.imageURL : null,
    imageStoragePath: typeof data.imageStoragePath === "string" ? data.imageStoragePath : null,
    gifURL: typeof data.gifURL === "string" ? data.gifURL : null,
    parentPostId: typeof data.parentPostId === "string" ? data.parentPostId : null,
    repostedPostId: typeof data.repostedPostId === "string" ? data.repostedPostId : null,
    quotedPostId: typeof data.quotedPostId === "string" ? data.quotedPostId : null,
    replyToPostId: typeof data.replyToPostId === "string" ? data.replyToPostId : null,
    reactionCount: Number(data.reactionCount ?? 0),
    replyCount: Number(data.replyCount ?? 0),
    repostCount: Number(data.repostCount ?? 0),
    bookmarkCount: Number(data.bookmarkCount ?? 0),
    averageRating: Number(data.averageRating ?? 0),
    starRatingCount: Number(data.starRatingCount ?? 0),
    rottenTomatoCount: Number(data.rottenTomatoCount ?? 0),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    visibility: data.visibility === "followers" ? "followers" : "public",
    createdAt: normalizeCreatedAt(data.createdAt),
    poll: data.poll && typeof data.poll === "object"
      ? {
          question: String((data.poll as Record<string, unknown>).question ?? ""),
          options: Array.isArray((data.poll as Record<string, unknown>).options) ? ((data.poll as Record<string, unknown>).options as unknown[]).map(String) : [],
          votes: Object.fromEntries(
            Object.entries((((data.poll as Record<string, unknown>).votes as Record<string, unknown>) ?? {})).map(([key, value]) => [
              key,
              Array.isArray(value) ? value.map(String) : [],
            ]),
          ),
          endsAt: String((data.poll as Record<string, unknown>).endsAt ?? new Date().toISOString()),
          durationLabel: String((data.poll as Record<string, unknown>).durationLabel ?? "1H"),
        }
      : null,
  };
}

export function subscribeToPosts(onChange: (posts: Post[]) => void): Unsubscribe {
  const cachedPosts = readCache<Post[]>(POSTS_CACHE_KEY);
  if (cachedPosts?.length) {
    onChange(cachedPosts);
  }

  const postsQuery = query(collection(db, COLLECTIONS.posts), orderBy("createdAt", "desc"), limit(100));

  return onSnapshot(postsQuery, (snapshot) => {
    const nextPosts = snapshot.docs.map(normalizePost);
    writeCache(POSTS_CACHE_KEY, nextPosts.slice(0, POSTS_CACHE_LIMIT));
    onChange(nextPosts);
  });
}

export function subscribeToPostsByAuthor(authorId: string, onChange: (posts: Post[]) => void): Unsubscribe {
  const postsQuery = query(collection(db, COLLECTIONS.posts), where("authorId", "==", authorId), orderBy("createdAt", "desc"), limit(100));

  return onSnapshot(postsQuery, (snapshot) => {
    onChange(snapshot.docs.map(normalizePost));
  });
}

type CreatePostInput = Omit<
  Post,
  "id" | "reactionCount" | "replyCount" | "repostCount" | "bookmarkCount" | "createdAt" | "averageRating" | "starRatingCount" | "rottenTomatoCount"
> & {
  reactionCount?: number;
  replyCount?: number;
  repostCount?: number;
  bookmarkCount?: number;
  averageRating?: number;
  starRatingCount?: number;
  rottenTomatoCount?: number;
};

export async function createPost(input: CreatePostInput) {
  return addDoc(collection(db, COLLECTIONS.posts), {
    ...input,
    gifURL: input.gifURL ?? null,
    imageURL: input.imageURL ?? null,
    imageStoragePath: input.imageStoragePath ?? null,
    parentPostId: input.parentPostId ?? null,
    repostedPostId: input.repostedPostId ?? null,
    quotedPostId: input.quotedPostId ?? null,
    replyToPostId: input.replyToPostId ?? null,
    poll: input.poll ?? null,
    reactionCount: input.reactionCount ?? 0,
    replyCount: input.replyCount ?? 0,
    repostCount: input.repostCount ?? 0,
    bookmarkCount: input.bookmarkCount ?? 0,
    averageRating: input.averageRating ?? 0,
    starRatingCount: input.starRatingCount ?? 0,
    rottenTomatoCount: input.rottenTomatoCount ?? 0,
    createdAt: serverTimestamp(),
  });
}

function reactionDocId(postId: string, userId: string, type: "star" | "rotten") {
  return `${postId}_${userId}_${type}`;
}

function getStarRatingXpReward(stars: number) {
  if (stars === 5) return 10;
  if (stars === 4) return 8;
  if (stars === 3) return 5;
  if (stars === 2) return 3;
  if (stars === 1) return 1;
  return 0;
}

export async function ratePost(postId: string, user: UserProfile, stars: number) {
  const reactionRef = doc(db, COLLECTIONS.reactions, reactionDocId(postId, user.uid, "star"));
  const postRef = doc(db, COLLECTIONS.posts, postId);
  let authorId: string | null = null;

  await runTransaction(db, async (transaction) => {
    const [postSnapshot, reactionSnapshot] = await Promise.all([transaction.get(postRef), transaction.get(reactionRef)]);

    if (!postSnapshot.exists()) {
      throw new Error("Post not found.");
    }

    authorId = String(postSnapshot.data().authorId ?? "");
    const currentCount = Number(postSnapshot.data().starRatingCount ?? 0);
    const currentAverage = Number(postSnapshot.data().averageRating ?? 0);
    const previousStars = reactionSnapshot.exists() && reactionSnapshot.data().type === "star"
      ? Number(reactionSnapshot.data().stars ?? 0)
      : 0;
    const nextCount = reactionSnapshot.exists() ? currentCount : currentCount + 1;
    const totalBefore = currentAverage * currentCount;
    const totalAfter = reactionSnapshot.exists() ? totalBefore - previousStars + stars : totalBefore + stars;
    const nextAverage = Number((nextCount > 0 ? totalAfter / nextCount : 0).toFixed(2));

    transaction.set(reactionRef, {
      postId,
      userId: user.uid,
      type: "star",
      stars,
      createdAt: serverTimestamp(),
    }, { merge: true });
    transaction.update(postRef, {
      averageRating: nextAverage,
      starRatingCount: nextCount,
      ...(reactionSnapshot.exists() ? {} : { reactionCount: increment(1) }),
    });
  });

  const xpReward = getStarRatingXpReward(stars);
  if (xpReward > 0) {
    await addXpToUser(user.uid, xpReward);
  }

  if (authorId && authorId !== user.uid) {
    await createNotification({
      type: "reaction",
      title: "New star rating",
      body: `${user.displayName} rated your post ${stars}/5 stars.`,
      actorId: user.uid,
      userId: authorId,
      postId,
    });
  }
}

export function subscribeToPostReaction(postId: string, userId: string, onChange: (reaction: { type: string; stars?: number } | null) => void): Unsubscribe {
  return onSnapshot(doc(db, COLLECTIONS.reactions, reactionDocId(postId, userId, "star")), (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }

    onChange(snapshot.data() as { type: string; stars?: number });
  });
}

export function subscribeToPostReactions(
  postId: string,
  userId: string,
  onChange: (reaction: { stars: number; hasRottenTomato: boolean }) => void,
): Unsubscribe {
  const starRef = doc(db, COLLECTIONS.reactions, reactionDocId(postId, userId, "star"));
  const rottenRef = doc(db, COLLECTIONS.reactions, reactionDocId(postId, userId, "rotten"));

  let stars = 0;
  let hasRottenTomato = false;

  const emit = () => onChange({ stars, hasRottenTomato });

  const unsubscribeStar = onSnapshot(starRef, (snapshot) => {
    stars = snapshot.exists() ? Number(snapshot.data().stars ?? 0) : 0;
    emit();
  });

  const unsubscribeRotten = onSnapshot(rottenRef, (snapshot) => {
    hasRottenTomato = snapshot.exists();
    emit();
  });

  return () => {
    unsubscribeStar();
    unsubscribeRotten();
  };
}

export async function deletePost(postId: string) {
  await deleteDoc(doc(db, COLLECTIONS.posts, postId));
}

export async function throwRottenTomato(postId: string, user: UserProfile) {
  const reactionRef = doc(db, COLLECTIONS.reactions, reactionDocId(postId, user.uid, "rotten"));
  const postRef = doc(db, COLLECTIONS.posts, postId);
  let shouldDelete = false;
  let authorId: string | null = null;

  await runTransaction(db, async (transaction) => {
    const [postSnapshot, reactionSnapshot, userSnapshot] = await Promise.all([
      transaction.get(postRef),
      transaction.get(reactionRef),
      transaction.get(doc(db, COLLECTIONS.users, user.uid)),
    ]);

    if (!postSnapshot.exists()) {
      throw new Error("Post not found.");
    }

    if (!userSnapshot.exists()) {
      throw new Error("User not found.");
    }

    if (reactionSnapshot.exists()) {
      throw new Error("You already threw a rotten tomato at this post.");
    }

    const currentGems = Number(userSnapshot.data().gems ?? 0);
    if (currentGems < 5) {
      throw new Error("You need 5 gems to throw a rotten tomato.");
    }

    authorId = String(postSnapshot.data().authorId ?? "");
    const nextTomatoes = Number(postSnapshot.data().rottenTomatoCount ?? 0) + 1;
    shouldDelete = nextTomatoes >= 5;

    transaction.set(reactionRef, {
      postId,
      userId: user.uid,
      type: "rotten",
      createdAt: serverTimestamp(),
    });
    transaction.update(doc(db, COLLECTIONS.users, user.uid), {
      gems: currentGems - 5,
      updatedAt: serverTimestamp(),
    });
    transaction.update(postRef, {
      rottenTomatoCount: nextTomatoes,
      reactionCount: increment(1),
    });
  });

  if (shouldDelete) {
    await deletePostCascade(postId);
    return { deleted: true };
  }

  if (authorId && authorId !== user.uid) {
    await createNotification({
      type: "reaction",
      title: "A rotten tomato hit your post",
      body: `${user.displayName} spent 5 gems to throw a rotten tomato at your post.`,
      actorId: user.uid,
      userId: authorId,
      postId,
    });
  }

  return { deleted: false };
}

export async function createReply(input: CreatePostInput) {
  const createdReply = await createPost(input);

  if (input.parentPostId) {
    await updateDoc(doc(db, COLLECTIONS.posts, input.parentPostId), { replyCount: increment(1) });
  }

  if (input.replyToPostId && input.replyToPostId !== input.parentPostId) {
    await updateDoc(doc(db, COLLECTIONS.posts, input.replyToPostId), { replyCount: increment(1) });
  }

  return createdReply;
}

export async function removePostEmbed(postId: string) {
  const postRef = doc(db, COLLECTIONS.posts, postId);
  const snapshot = await getDoc(postRef);

  if (!snapshot.exists()) {
    throw new Error("Post not found.");
  }

  const data = snapshot.data();
  await deleteStorageObject(typeof data.imageStoragePath === "string" ? data.imageStoragePath : null);
  await updateDoc(postRef, {
    imageURL: null,
    imageStoragePath: null,
    gifURL: null,
    poll: null,
  });
}

async function deletePostArtifacts(postId: string) {
  const batch = writeBatch(db);
  const [reactionsSnapshot, bookmarksSnapshot, notificationsSnapshot, childRepliesSnapshot, threadedRepliesSnapshot] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.reactions), where("postId", "==", postId))),
    getDocs(query(collection(db, COLLECTIONS.bookmarks), where("postId", "==", postId))),
    getDocs(query(collection(db, COLLECTIONS.notifications), where("postId", "==", postId))),
    getDocs(query(collection(db, COLLECTIONS.posts), where("parentPostId", "==", postId))),
    getDocs(query(collection(db, COLLECTIONS.posts), where("replyToPostId", "==", postId))),
  ]);
  const nestedReplyIds = new Set<string>();
  const nestedReplies = [...childRepliesSnapshot.docs, ...threadedRepliesSnapshot.docs].filter((replyDocument) => {
    if (nestedReplyIds.has(replyDocument.id)) {
      return false;
    }
    nestedReplyIds.add(replyDocument.id);
    return true;
  });

  nestedReplies.forEach((replyDocument) => {
    batch.delete(replyDocument.ref);
  });
  reactionsSnapshot.docs.forEach((reactionDocument) => {
    batch.delete(reactionDocument.ref);
  });
  bookmarksSnapshot.docs.forEach((bookmarkDocument) => {
    batch.delete(bookmarkDocument.ref);
  });
  notificationsSnapshot.docs.forEach((notificationDocument) => {
    batch.delete(notificationDocument.ref);
  });

  await batch.commit();

  for (const replyDocument of nestedReplies) {
    const replyData = replyDocument.data();
    await deleteStorageObject(typeof replyData.imageStoragePath === "string" ? replyData.imageStoragePath : null);
  }
}

export async function deletePostCascade(postId: string) {
  const postRef = doc(db, COLLECTIONS.posts, postId);
  const snapshot = await getDoc(postRef);

  if (!snapshot.exists()) {
    return;
  }

  const data = snapshot.data();
  const parentPostId = typeof data.parentPostId === "string" ? data.parentPostId : null;
  const replyToPostId = typeof data.replyToPostId === "string" ? data.replyToPostId : null;
  const imageStoragePath = typeof data.imageStoragePath === "string" ? data.imageStoragePath : null;

  if (parentPostId) {
    const threadedChildrenSnapshot = await getDocs(query(collection(db, COLLECTIONS.posts), where("replyToPostId", "==", postId)));
    for (const childReply of threadedChildrenSnapshot.docs) {
      await deletePostCascade(childReply.id);
    }
  }

  await deletePostArtifacts(postId);
  await deleteDoc(postRef);
  await deleteStorageObject(imageStoragePath);

  if (parentPostId) {
    await updateDoc(doc(db, COLLECTIONS.posts, parentPostId), { replyCount: increment(-1) });
  }

  if (replyToPostId && replyToPostId !== parentPostId) {
    await updateDoc(doc(db, COLLECTIONS.posts, replyToPostId), { replyCount: increment(-1) });
  }
}

export function extractMentions(content: string) {
  return Array.from(new Set((content.match(/@([a-zA-Z0-9_]+)/g) ?? []).map((item) => item.slice(1).toLowerCase())));
}

export function subscribeToLeaderboardRank(userId: string, onChange: (rank: number | null) => void): Unsubscribe {
  return subscribeToXpLeaderboard((leaders) => {
    const rank = leaders.findIndex((leader) => leader.uid === userId);
    onChange(rank >= 0 ? rank + 1 : null);
  });
}
