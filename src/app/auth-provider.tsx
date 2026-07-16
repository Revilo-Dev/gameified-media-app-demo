import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuthState } from "@/firebase/session";
import { ensureUserProfile } from "@/firebase/users";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, isLoading: true });

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return subscribeToAuthState(async (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);

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
