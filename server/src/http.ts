const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};

/**
 * Fetch implementation used by {@link fetchJson}. Defaults to the global
 * `fetch` (Node / browser). The browser build overrides it so requests are
 * relayed through a CORS proxy, since the upstream cinema APIs do not send
 * `Access-Control-Allow-Origin`.
 */
export type Transport = (url: string, init?: RequestInit) => Promise<Response>;

let transport: Transport = (url, init) => fetch(url, init);

export function setTransport(next: Transport): void {
  transport = next;
}

export interface FetchJsonOptions {
  headers?: Record<string, string>;
  retries?: number;
  timeoutMs?: number;
}

export async function fetchJson<T>(url: string, opts: FetchJsonOptions = {}): Promise<T> {
  const { headers, retries = 3, timeoutMs = 20000 } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await transport(url, {
        headers: { ...DEFAULT_HEADERS, ...headers },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
      }
      const text = await res.text();
      return JSON.parse(text) as T;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
