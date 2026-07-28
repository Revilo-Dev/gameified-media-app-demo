const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 7;

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

  const fromStorage = safeParse<T>(window.localStorage.getItem(key));
  if (fromStorage !== null) {
    return fromStorage;
  }

  const cookieMatch = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${encodeURIComponent(key)}=`));

  if (!cookieMatch) {
    return null;
  }

  const [, rawValue = ""] = cookieMatch.split("=");
  return safeParse<T>(decodeURIComponent(rawValue));
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

  if (serialized.length > 3500) {
    return;
  }

  document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(serialized)}; max-age=${COOKIE_TTL_SECONDS}; path=/; SameSite=Lax`;
}

export function clearCache(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
  document.cookie = `${encodeURIComponent(key)}=; max-age=0; path=/; SameSite=Lax`;
}
