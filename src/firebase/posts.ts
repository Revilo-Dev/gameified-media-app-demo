import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import type { Post } from "@/types/models";

function normalizeCreatedAt(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return new Date().toISOString();
}

export function subscribeToPosts(onChange: (posts: Post[]) => void): Unsubscribe {
  const postsQuery = query(collection(db, COLLECTIONS.posts), orderBy("createdAt", "desc"), limit(50));

  return onSnapshot(postsQuery, (snapshot) => {
    onChange(
      snapshot.docs.map((document) => ({
        id: document.id,
        ...({
          ...(document.data() as Omit<Post, "id">),
          createdAt: normalizeCreatedAt(document.data().createdAt),
        } as Omit<Post, "id">),
      })),
    );
  });
}

export function subscribeToPostsByAuthor(authorId: string, onChange: (posts: Post[]) => void): Unsubscribe {
  const postsQuery = query(collection(db, COLLECTIONS.posts), where("authorId", "==", authorId), orderBy("createdAt", "desc"), limit(50));

  return onSnapshot(postsQuery, (snapshot) => {
    onChange(
      snapshot.docs.map((document) => ({
        id: document.id,
        ...({
          ...(document.data() as Omit<Post, "id">),
          createdAt: normalizeCreatedAt(document.data().createdAt),
        } as Omit<Post, "id">),
      })),
    );
  });
}

type CreatePostInput = Omit<Post, "id" | "reactionCount" | "replyCount" | "repostCount" | "bookmarkCount" | "createdAt" | "gifURL" | "parentPostId" | "repostedPostId" | "quotedPostId" | "poll"> & {
  gifURL?: Post["gifURL"];
  parentPostId?: Post["parentPostId"];
  repostedPostId?: Post["repostedPostId"];
  quotedPostId?: Post["quotedPostId"];
  poll?: Post["poll"];
  reactionCount?: number;
  replyCount?: number;
  repostCount?: number;
  bookmarkCount?: number;
};

export async function createPost(input: CreatePostInput) {
  return addDoc(collection(db, COLLECTIONS.posts), {
    ...input,
    gifURL: input.gifURL ?? null,
    parentPostId: input.parentPostId ?? null,
    repostedPostId: input.repostedPostId ?? null,
    quotedPostId: input.quotedPostId ?? null,
    poll: input.poll ?? null,
    reactionCount: input.reactionCount ?? 0,
    replyCount: input.replyCount ?? 0,
    repostCount: input.repostCount ?? 0,
    bookmarkCount: input.bookmarkCount ?? 0,
    createdAt: serverTimestamp(),
  });
}
