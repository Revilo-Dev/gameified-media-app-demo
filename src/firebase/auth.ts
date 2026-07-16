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
import { auth } from "@/firebase/config";
import { storage } from "@/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateUserProfile } from "@/firebase/users";

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

  const pictureRef = ref(storage, `profile-pictures/${auth.currentUser.uid}/${Date.now()}-${file.name}`);
  await uploadBytes(pictureRef, file);
  const photoURL = await getDownloadURL(pictureRef);
  await updateProfile(auth.currentUser, { photoURL });
  await updateUserProfile(auth.currentUser.uid, { photoURL });
  return photoURL;
}

export async function changeUserPassword(currentPassword: string, nextPassword: string) {
  if (!auth.currentUser || !auth.currentUser.email) {
    throw new Error("No signed-in user.");
  }

  const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);
  await updatePassword(auth.currentUser, nextPassword);
}
