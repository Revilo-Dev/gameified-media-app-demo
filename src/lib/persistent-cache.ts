function safeParse<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  return safeParse<T>(window.localStorage.getItem(key));
}

export function writeCache<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(value);
  try {
    window.localStorage.setItem(key, serialized);
  } catch (error) {
    console.warn("[cache] localStorage write skipped", { key, error });
  }
}

export function clearCache(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
}

export function clearLegacyAppCookies() {
  if (typeof window === "undefined") {
    return;
  }

  const cookieKeys = document.cookie
    .split("; ")
    .map((entry) => entry.split("=")[0])
    .map((key) => decodeURIComponent(key))
    .filter((key) => key.startsWith("cache:") || key === "auth:user");

  for (const key of cookieKeys) {
    document.cookie = `${encodeURIComponent(key)}=; max-age=0; path=/; SameSite=Lax`;
  }
}
