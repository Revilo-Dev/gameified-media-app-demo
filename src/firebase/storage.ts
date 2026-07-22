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

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function assertValidImageUpload(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, or GIF images are supported.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Images must be 5MB or smaller.");
  }
}

async function requirePremiumUser() {
  if (!auth.currentUser) {
    throw new Error("No signed-in user.");
  }

  const profileSnapshot = await getDoc(doc(db, COLLECTIONS.users, auth.currentUser.uid));
  if (!profileSnapshot.exists() || !profileSnapshot.data().isPremium) {
    throw new Error("Premium account required for image uploads.");
  }

  return auth.currentUser.uid;
}

export async function uploadUserImage(folder: (typeof storageFolders)[keyof typeof storageFolders], file: File) {
  assertValidImageUpload(file);
  const userId = await requirePremiumUser();
  const safeFileName = file.name.replace(/\s+/g, "-");
  const imageRef = ref(storage, `${folder}/${userId}/${Date.now()}-${safeFileName}`);
  await uploadBytes(imageRef, file, { contentType: file.type });
  return getDownloadURL(imageRef);
}

export async function uploadPostImage(file: File) {
  return uploadUserImage(storageFolders.posts, file);
}
