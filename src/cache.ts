// ─── TTL Cache ──────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const store = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry && now - entry.fetchedAt < CACHE_TTL_MS) {
    return entry.data;
  }

  try {
    const data = await fetcher();
    store.set(key, { data, fetchedAt: now });
    return data;
  } catch (error) {
    // Return stale data if available
    if (entry) return entry.data;
    throw error;
  }
}

export function clearCache(): void {
  store.clear();
}
