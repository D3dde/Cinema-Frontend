interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/** Tiny in-memory TTL cache. Avoids hammering the unofficial upstream APIs. */
export function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return Promise.resolve(hit.value);
  }
  const inflight = (store.get(key + ":inflight") as Entry<Promise<T>> | undefined)?.value;
  if (inflight) return inflight;

  const promise = loader()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      store.delete(key + ":inflight");
    });

  store.set(key + ":inflight", { value: promise, expiresAt: now + ttlMs });
  return promise;
}

export function clearCache(): void {
  store.clear();
}

export const TTL = {
  cinemas: 24 * 60 * 60 * 1000,
  schedule: 5 * 60 * 1000,
};
