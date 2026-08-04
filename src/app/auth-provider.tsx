import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuthState } from "@/firebase/session";
import { ensureUserProfile, touchUserLastOnline } from "@/firebase/users";
import { clearCache, clearLegacyAppCookies, readCache, writeCache } from "@/lib/persistent-cache";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, isLoading: true });

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(() => readCache<User | null>("auth:user"));
  const [isLoading, setIsLoading] = useState(() => !readCache<User | null>("auth:user"));

  useEffect(() => {
    clearLegacyAppCookies();

    return subscribeToAuthState(async (nextUser) => {
      const verifiedUser = nextUser?.emailVerified ? nextUser : null;
      setUser(verifiedUser);
      setIsLoading(false);

      if (verifiedUser) {
        writeCache("auth:user", verifiedUser);
      } else {
        clearCache("auth:user");
      }

      if (verifiedUser) {
        try {
          await ensureUserProfile(verifiedUser);
          await touchUserLastOnline(verifiedUser.uid);
        } catch (error) {
          console.error("Failed to ensure user profile after auth state change", error);
        }
      }
    });
  }, []);

  return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
