import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import { auth } from "@/firebase/config";
import type { UserProfile } from "@/types/models";

export const storageFolders = {
  avatars: "avatars",
  banners: "banners",
  posts: "posts",
} as const;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const NORMAL_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;
const PREMIUM_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024;

function formatUploadLimitLabel(maxBytes: number) {
  return `${Math.round(maxBytes / (1024 * 1024))}MB`;
}

function assertValidImageUpload(file: File, maxBytes: number) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, or GIF images are supported.");
  }

  if (file.size > maxBytes) {
    throw new Error(`Images must be ${formatUploadLimitLabel(maxBytes)} or smaller.`);
  }
}

async function getSignedInUserProfile() {
  if (!auth.currentUser) {
    throw new Error("No signed-in user.");
  }

  const profileSnapshot = await getDoc(doc(db, COLLECTIONS.users, auth.currentUser.uid));
  if (!profileSnapshot.exists()) {
    throw new Error("User profile not found.");
  }

  return {
    userId: auth.currentUser.uid,
    profile: profileSnapshot.data() as UserProfile,
  };
}

export async function uploadUserImage(folder: (typeof storageFolders)[keyof typeof storageFolders], file: File) {
  const { userId, profile } = await getSignedInUserProfile();
  const maxUploadSizeBytes = profile.isPremium ? PREMIUM_UPLOAD_SIZE_BYTES : NORMAL_UPLOAD_SIZE_BYTES;
  assertValidImageUpload(file, maxUploadSizeBytes);
  const safeFileName = file.name.replace(/\s+/g, "-");
  const imageRef = ref(storage, `${folder}/${userId}/${Date.now()}-${safeFileName}`);
  await uploadBytes(imageRef, file, { contentType: file.type });
  return getDownloadURL(imageRef);
}

export async function uploadPostImage(file: File) {
  return uploadUserImage(storageFolders.posts, file);
}
