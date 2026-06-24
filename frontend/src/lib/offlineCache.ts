// Lightweight offline read-cache.
//
// Caches successful GET responses for a small set of read-model endpoints in
// localStorage, and serves the last-known-good copy when the network is down
// (or the backend blips). Read-only: this does NOT queue offline writes —
// checkout still requires connectivity. Dependency-free.

const PREFIX = 'pos_cache:';
const TTL_MS = 24 * 60 * 60 * 1000; // serve stale reads up to 24h old

// Only cache safe, frequently-read collections.
const CACHEABLE = ['/products', '/company', '/suppliers'];

export function isCacheable(url: string): boolean {
  const path = url.split('?')[0];
  return CACHEABLE.some((c) => path === c || path.endsWith(c));
}

export function writeCache(url: string, data: unknown): void {
  try {
    localStorage.setItem(PREFIX + url, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // Quota or serialization issues are non-fatal for a cache.
  }
}

export function readCache<T = unknown>(url: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + url);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > TTL_MS) return null;
    return data as T;
  } catch {
    return null;
  }
}

export function clearCache(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}

export const isOffline = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false;
