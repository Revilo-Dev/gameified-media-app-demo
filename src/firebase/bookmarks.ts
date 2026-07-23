import {
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import type { Post } from "@/types/models";

function bookmarkDocId(userId: string, postId: string) {
  return `${userId}_${postId}`;
}

export async function setPostBookmarked(userId: string, postId: string, shouldBookmark: boolean) {
  const bookmarkRef = doc(db, COLLECTIONS.bookmarks, bookmarkDocId(userId, postId));
  const postRef = doc(db, COLLECTIONS.posts, postId);

  if (shouldBookmark) {
    await setDoc(bookmarkRef, {
      userId,
      postId,
      createdAt: serverTimestamp(),
    });
    await updateDoc(postRef, { bookmarkCount: increment(1) });
    return;
  }

  await deleteDoc(bookmarkRef);
  await updateDoc(postRef, { bookmarkCount: increment(-1) });
}

export function subscribeToBookmarkedPostIds(userId: string, onChange: (postIds: string[]) => void): Unsubscribe {
  const bookmarkQuery = query(collection(db, COLLECTIONS.bookmarks), where("userId", "==", userId));

  return onSnapshot(bookmarkQuery, (snapshot) => {
    onChange(snapshot.docs.map((bookmark) => String(bookmark.data().postId ?? "")).filter(Boolean));
  });
}

export function subscribeToBookmarkedPosts(
  userId: string,
  posts: Post[],
  onChange: (bookmarks: Post[]) => void,
): Unsubscribe {
  return subscribeToBookmarkedPostIds(userId, (postIds) => {
    const bookmarkedPosts = postIds
      .map((postId) => posts.find((post) => post.id === postId))
      .filter((post): post is Post => Boolean(post));
    onChange(bookmarkedPosts);
  });
}
