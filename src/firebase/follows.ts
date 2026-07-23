import {
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface FollowRelationship {
  followerId: string;
  followingId: string;
}

function followDocId(followerId: string, followingId: string) {
  return `${followerId}_${followingId}`;
}

export function subscribeToFollowCounts(userId: string, onChange: (counts: FollowCounts) => void): Unsubscribe {
  const followersQuery = query(collection(db, COLLECTIONS.follows), where("followingId", "==", userId));
  const followingQuery = query(collection(db, COLLECTIONS.follows), where("followerId", "==", userId));

  let followers = 0;
  let following = 0;

  const emit = () => onChange({ followers, following });

  const unsubscribeFollowers = onSnapshot(followersQuery, (snapshot) => {
    followers = snapshot.size;
    emit();
  });

  const unsubscribeFollowing = onSnapshot(followingQuery, (snapshot) => {
    following = snapshot.size;
    emit();
  });

  return () => {
    unsubscribeFollowers();
    unsubscribeFollowing();
  };
}

export async function setFollowingRelationship(followerId: string, followingId: string, shouldFollow: boolean) {
  if (followerId === followingId) {
    return;
  }

  const followRef = doc(db, COLLECTIONS.follows, followDocId(followerId, followingId));
  const followerRef = doc(db, COLLECTIONS.users, followerId);
  const followingRef = doc(db, COLLECTIONS.users, followingId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(followRef);

    if (shouldFollow) {
      if (snapshot.exists()) {
        return;
      }

      transaction.set(followRef, {
        followerId,
        followingId,
        createdAt: serverTimestamp(),
      });
      transaction.set(followerRef, { followingCount: increment(1) }, { merge: true });
      transaction.set(followingRef, { followerCount: increment(1) }, { merge: true });
      return;
    }

    if (!snapshot.exists()) {
      return;
    }

    transaction.delete(followRef);
    transaction.set(followerRef, { followingCount: increment(-1) }, { merge: true });
    transaction.set(followingRef, { followerCount: increment(-1) }, { merge: true });
  });
}

export function subscribeToFollowRelationship(
  followerId: string,
  followingId: string,
  onChange: (isFollowing: boolean) => void,
): Unsubscribe {
  const relationQuery = query(collection(db, COLLECTIONS.follows), where("followerId", "==", followerId), where("followingId", "==", followingId));

  return onSnapshot(relationQuery, (snapshot) => {
    onChange(!snapshot.empty);
  });
}
