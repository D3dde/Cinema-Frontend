/**
 * Tiny pub/sub used to tell the UI when the browser engine has replaced the
 * bundled snapshot with fresh live data (stale-while-revalidate). Kept separate
 * from `client.ts` so it can be imported without pulling in the engine.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function onEngineUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyEngineUpdate(): void {
  for (const listener of listeners) listener();
}
