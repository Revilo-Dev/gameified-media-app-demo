import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithPopup,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { updateUserProfile } from "@/firebase/users";
import { COLLECTIONS } from "@/firebase/firestore";
import { deleteStorageObject, storageFolders, uploadBannerImage, uploadUserImage } from "@/firebase/storage";

export async function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  return credential;
}

export async function logout() {
  return signOut(auth);
}

export async function linkGoogleAccount() {
  if (!auth.currentUser) {
    throw new Error("No signed-in user.");
  }

  return linkWithPopup(auth.currentUser, new GoogleAuthProvider());
}

export async function updateDisplayName(displayName: string) {
  if (!auth.currentUser) {
    throw new Error("No signed-in user.");
  }

  await updateProfile(auth.currentUser, { displayName });
  await updateUserProfile(auth.currentUser.uid, { displayName });
}

export async function uploadProfilePicture(file: File) {
  if (!auth.currentUser) {
    throw new Error("No signed-in user.");
  }
  const { url: photoURL, storagePath: photoStoragePath } = await uploadUserImage(storageFolders.avatars, file);
  await updateProfile(auth.currentUser, { photoURL });
  await updateUserProfile(auth.currentUser.uid, { photoURL, photoStoragePath });
  return photoURL;
}

export async function uploadProfileBanner(file: File) {
  if (!auth.currentUser) {
    throw new Error("No signed-in user.");
  }

  const { url: bannerURL, storagePath: bannerStoragePath } = await uploadBannerImage(file);
  await updateUserProfile(auth.currentUser.uid, { bannerURL, bannerStoragePath });
  return bannerURL;
}

export async function deleteProfileMedia() {
  if (!auth.currentUser) {
    throw new Error("No signed-in user.");
  }

  const snapshot = await getDoc(doc(db, COLLECTIONS.users, auth.currentUser.uid));
  if (!snapshot.exists()) {
    return;
  }

  const profile = snapshot.data() as { photoStoragePath?: string | null; bannerStoragePath?: string | null };
  await Promise.all([deleteStorageObject(profile.photoStoragePath), deleteStorageObject(profile.bannerStoragePath)]);
}

export async function changeUserPassword(currentPassword: string, nextPassword: string) {
  if (!auth.currentUser || !auth.currentUser.email) {
    throw new Error("No signed-in user.");
  }

  const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);
  await updatePassword(auth.currentUser, nextPassword);
}
