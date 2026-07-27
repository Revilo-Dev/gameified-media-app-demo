import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuthState } from "@/firebase/session";
import { ensureUserProfile } from "@/firebase/users";
import { clearCache, readCache, writeCache } from "@/lib/persistent-cache";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, isLoading: true });

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(() => readCache<User | null>("auth:user"));
  const [isLoading, setIsLoading] = useState(() => !readCache<User | null>("auth:user"));

  useEffect(() => {
    return subscribeToAuthState(async (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);

      if (nextUser) {
        writeCache("auth:user", nextUser);
      } else {
        clearCache("auth:user");
      }

      if (nextUser) {
        await ensureUserProfile(nextUser);
      }
    });
  }, []);

  return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
