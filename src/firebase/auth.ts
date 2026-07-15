import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "@/firebase/config";

export async function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function logout() {
  return signOut(auth);
}
