import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import { auth } from "@/firebase/config";

export const storageFolders = {
  avatars: "avatars",
  banners: "banners",
  posts: "posts",
} as const;

export async function uploadPostImage(file: File) {
  if (!auth.currentUser) {
    throw new Error("No signed-in user.");
  }

  const profileSnapshot = await getDoc(doc(db, COLLECTIONS.users, auth.currentUser.uid));
  if (!profileSnapshot.exists() || !profileSnapshot.data().isPremium) {
    throw new Error("Premium account required to upload post images.");
  }

  const imageRef = ref(storage, `${storageFolders.posts}/${auth.currentUser.uid}/${Date.now()}-${file.name}`);
  await uploadBytes(imageRef, file);
  return getDownloadURL(imageRef);
}
