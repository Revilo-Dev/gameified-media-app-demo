import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuthState } from "@/firebase/session";
import { ensureUserProfile, subscribeToUserProfileById, touchUserLastOnline } from "@/firebase/users";
import { checkIpBan, registerUserDeviceIp } from "@/firebase/functions";
import { logout } from "@/firebase/auth";
import { clearCache, clearLegacyAppCookies, readCache, writeCache } from "@/lib/persistent-cache";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isBanned: boolean;
  isBanStatusLoading: boolean;
  timeoutUntil: string | null;
  isTimedOut: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, isLoading: true, isBanned: false, isBanStatusLoading: true, timeoutUntil: null, isTimedOut: false });

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(() => readCache<User | null>("auth:user"));
  const [isLoading, setIsLoading] = useState(() => !readCache<User | null>("auth:user"));
  const [isBanned, setIsBanned] = useState(false);
  const [isBanStatusLoading, setIsBanStatusLoading] = useState(true);
  const [timeoutUntil, setTimeoutUntil] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    clearLegacyAppCookies();

    void checkIpBan().then(async ({ banned }) => {
      if (!banned) return;
      setIsBanned(true);
      clearCache("auth:user");
      await logout();
    }).catch((error) => console.error("Failed to check device ban status", error)).finally(() => setIsBanStatusLoading(false));

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
          const { banned } = await registerUserDeviceIp();
          if (banned) {
            setIsBanned(true);
            clearCache("auth:user");
            await logout();
            return;
          }
          await ensureUserProfile(verifiedUser);
          await touchUserLastOnline(verifiedUser.uid);
        } catch (error) {
          console.error("Failed to ensure user profile after auth state change", error);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setTimeoutUntil(null);
      return;
    }
    return subscribeToUserProfileById(user.uid, (profile) => setTimeoutUntil(profile?.timeoutUntil ?? null));
  }, [user]);

  useEffect(() => {
    if (!timeoutUntil || timeoutUntil === "forever") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timeoutUntil]);

  const isTimedOut = timeoutUntil === "forever" || (Boolean(timeoutUntil) && !Number.isNaN(new Date(timeoutUntil!).getTime()) && new Date(timeoutUntil!).getTime() > now);

  return <AuthContext.Provider value={{ user, isLoading, isBanned, isBanStatusLoading, timeoutUntil, isTimedOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
