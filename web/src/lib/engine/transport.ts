import { setTransport } from "@engine/http";

/**
 * The Webtic API does not send `Access-Control-Allow-Origin`, so the browser
 * cannot call it directly. Requests are relayed through a CORS proxy. Several
 * are listed because free proxies get rate-limited or go down; the first one is
 * a Cloudflare Worker and is by far the fastest/most reliable.
 */
const PROXY_TEMPLATES: string[] = [
  "https://cors-get-proxy.sirjosh.workers.dev/?url={url}",
  "https://api.cors.lol/?url={url}",
  "https://api.codetabs.com/v1/proxy?quest={url}",
  "https://api.allorigins.win/raw?url={url}",
];

const custom = import.meta.env.VITE_CORS_PROXY;
if (typeof custom === "string" && custom.includes("{url}")) {
  PROXY_TEMPLATES.unshift(custom);
}

/** Each proxy gets this long before we give up and try the next one. */
const PROXY_TIMEOUT_MS = 12000;

function proxied(template: string, url: string): string {
  return template.replace("{url}", encodeURIComponent(url));
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** Headers the browser refuses to let scripts set. */
const FORBIDDEN = new Set([
  "user-agent",
  "origin",
  "referer",
  "host",
  "cookie",
  "accept-encoding",
  "connection",
  "content-length",
]);

function sanitize(init?: RequestInit): RequestInit {
  if (!init) return {};
  if (!init.headers) return init;
  const headers = new Headers(init.headers);
  for (const name of FORBIDDEN) headers.delete(name);
  return { ...init, headers };
}

/**
 * Hosts that send `Access-Control-Allow-Origin` and can therefore be requested
 * directly (faster, no proxy quota). Some of them intermittently reject
 * browser-shaped requests, so a failed direct attempt falls back to a proxy.
 */
const DIRECT_SUFFIXES = ["a.run.app"];

function canTryDirect(url: string): boolean {
  const host = hostOf(url);
  return DIRECT_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

const directBlocked = new Set<string>();
let cursor = 0;
let installed = false;

/** Route the shared engine's HTTP calls through direct fetch or a CORS proxy. */
export function installProxyTransport(): void {
  if (installed) return;
  installed = true;

  setTransport(async (url, init) => {
    const request = sanitize(init);
    const host = hostOf(url);

    if (canTryDirect(url) && !directBlocked.has(host)) {
      try {
        const res = await fetch(url, request);
        if (res.ok) return res;
      } catch {
        /* fall through to the proxies */
      }
      directBlocked.add(host);
    }

    let lastError: unknown = new Error("No CORS proxy available");

    for (let i = 0; i < PROXY_TEMPLATES.length; i++) {
      const index = (cursor + i) % PROXY_TEMPLATES.length;
      const target = proxied(PROXY_TEMPLATES[index], url);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
      const signal = request.signal
        ? AbortSignal.any([request.signal, controller.signal])
        : controller.signal;
      try {
        const res = await fetch(target, { ...request, signal });
        if (res.ok) {
          cursor = (index + 1) % PROXY_TEMPLATES.length;
          return res;
        }
        lastError = new Error(`Proxy HTTP ${res.status}`);
      } catch (err) {
        lastError = err;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  });
}
