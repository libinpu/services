/**
 * Lightweight in-memory TTL cache.
 *
 * Used for static/slow-changing data (service categories, category groups)
 * so that navigating between tabs doesn't trigger a new DB round-trip on
 * every focus event.
 *
 * Default TTL: 5 minutes — short enough to stay fresh, long enough to
 * prevent redundant network calls while the user is browsing the app.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const cache = {
  get<T>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.data as T;
  },

  set<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
    store.set(key, { data, expiresAt: Date.now() + ttlMs });
  },

  invalidate(key: string): void {
    store.delete(key);
  },

  clear(): void {
    store.clear();
  },
};
