import { setTransport } from "@engine/http";

/**
 * The upstream cinema APIs do not send `Access-Control-Allow-Origin`, so the
 * browser cannot call them directly. We relay every request through a public
 * CORS proxy. Several are tried in rotation because they are rate-limited or
 * occasionally down.
 */
const PROXY_TEMPLATES: string[] = [
  "https://api.cors.lol/?url={url}",
  "https://api.codetabs.com/v1/proxy?quest={url}",
  "https://api.allorigins.win/raw?url={url}",
  "https://corsproxy.io/?url={url}",
];

const custom = import.meta.env.VITE_CORS_PROXY;
if (typeof custom === "string" && custom.includes("{url}")) {
  PROXY_TEMPLATES.unshift(custom);
}

function proxied(template: string, url: string): string {
  return template.replace("{url}", encodeURIComponent(url));
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

/** Each proxy gets this long before we give up and try the next one. */
const PROXY_TIMEOUT_MS = 6000;

let cursor = 0;
let installed = false;

/** Route the shared engine's HTTP calls through the CORS proxies. */
export function installProxyTransport(): void {
  if (installed) return;
  installed = true;

  setTransport(async (url, init) => {
    const request = sanitize(init);
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
