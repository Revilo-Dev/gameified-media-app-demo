import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/firebase/config";

export function subscribeToAuthState(onChange: (user: User | null) => void) {
  return onAuthStateChanged(auth, onChange);
}
