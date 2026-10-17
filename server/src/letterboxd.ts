import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { LetterboxdInfo } from "./types.js";

/**
 * Best-effort Letterboxd enrichment.
 *
 * Letterboxd has no public API, so we scrape two pages per film: the film
 * search (to resolve the slug) and the film page (JSON-LD `aggregateRating`).
 * Results are cached in a JSON file that is committed to the repository, so
 * repeat builds only refresh entries older than {@link TTL_DAYS}.
 *
 * Only confident title matches are accepted; anything else yields `null` and
 * the UI falls back to a Letterboxd search link.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.resolve(HERE, "../data/letterboxd-cache.json");
const TTL_DAYS = 30;
const CONCURRENCY = 3;
const REQUEST_DELAY_MS = 250;

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const BASE_HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const execFileAsync = promisify(execFile);

/**
 * Letterboxd's `/search` routes are protected against non-browser TLS
 * fingerprints (Node's fetch gets 403 while `curl` succeeds), so we prefer
 * `curl` when available and only fall back to `fetch`.
 */
let curlAvailable: boolean | null = null;

async function hasCurl(): Promise<boolean> {
  if (curlAvailable === null) {
    try {
      await execFileAsync("curl", ["--version"]);
      curlAvailable = true;
    } catch {
      curlAvailable = false;
    }
  }
  return curlAvailable;
}

async function fetchHtml(url: string, extraHeaders: Record<string, string> = {}): Promise<string> {
  const headers = { ...BASE_HEADERS, ...extraHeaders };

  if (await hasCurl()) {
    const args = ["-sS", "-f", "-L", "--max-time", "30", "-A", USER_AGENT];
    for (const [name, value] of Object.entries(headers)) {
      if (name.toLowerCase() === "user-agent") continue;
      args.push("-H", `${name}: ${value}`);
    }
    const { stdout } = await execFileAsync("curl", [...args, url], {
      maxBuffer: 32 * 1024 * 1024,
    });
    if (!stdout) throw new Error(`Empty response for ${url}`);
    return stdout;
  }

  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

interface CacheFile {
  version: number;
  entries: Record<string, LetterboxdInfo>;
}

export interface FilmQuery {
  filmKey: string;
  title: string;
  originalTitle?: string;
}

interface SearchHit {
  slug: string;
  name: string;
  year?: number;
  alternatives: string[];
}

let cache: CacheFile | null = null;

async function loadCache(): Promise<CacheFile> {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(await readFile(CACHE_PATH, "utf8")) as Partial<CacheFile>;
    cache = { version: parsed.version ?? 1, entries: parsed.entries ?? {} };
  } catch {
    cache = { version: 1, entries: {} };
  }
  return cache;
}

/** All cached entries (no network). Safe to call when the cache is absent. */
export async function cachedFilmsInfo(): Promise<Record<string, LetterboxdInfo>> {
  const c = await loadCache();
  return { ...c.entries };
}

export async function saveCache(): Promise<void> {
  if (!cache) return;
  const entries = Object.fromEntries(
    Object.entries(cache.entries).sort(([a], [b]) => a.localeCompare(b)),
  );
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, `${JSON.stringify({ ...cache, entries }, null, 2)}\n`);
}

/** Public search URL used as a fallback link when no confident match exists. */
export function letterboxdSearchUrl(title: string): string {
  return `https://letterboxd.com/search/films/${encodeURIComponent(title.trim())}/`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTitle(s: string): string {
  return slugify(s.replace(/\(\d{4}\)\s*$/, ""));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

function parseSearchResults(html: string): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const article of html.split("<article").slice(1)) {
    const slug = article.match(/data-item-slug="([^"]*)"/)?.[1];
    const rawName = article.match(/data-item-name="([^"]*)"/)?.[1];
    if (!slug || !rawName) continue;

    const name = decodeEntities(rawName);
    const yearMatch = name.match(/\((\d{4})\)\s*$/);

    const alternatives: string[] = [];
    const altBlock = article.match(/Alternative titles:([^<]*)/);
    if (altBlock) {
      for (const raw of decodeEntities(altBlock[1]).split(",")) {
        const title = raw.trim();
        if (title) alternatives.push(title);
      }
    }

    hits.push({
      slug,
      name: name.replace(/\s*\(\d{4}\)\s*$/, "").trim(),
      year: yearMatch ? Number(yearMatch[1]) : undefined,
      alternatives,
    });
  }
  return hits;
}

/** Accept a hit only when it clearly refers to the queried film. */
function pickConfidentHit(hits: SearchHit[], queries: string[]): SearchHit | null {
  if (hits.length === 0) return null;

  const wanted = queries.map((query) => ({
    slug: slugify(query),
    name: normalizeTitle(query),
  }));

  for (const query of wanted) {
    const hit = hits.find((h) => h.slug === query.slug);
    if (hit) return hit;
  }
  for (const query of wanted) {
    const hit = hits.find(
      (h) =>
        normalizeTitle(h.name) === query.name ||
        h.alternatives.some((alt) => normalizeTitle(alt) === query.name),
    );
    if (hit) return hit;
  }
  return null;
}

async function searchFilm(queries: string[]): Promise<SearchHit | null> {
  for (const query of queries) {
    if (!query || query.trim().length < 2) continue;
    const url = `https://letterboxd.com/s/search/films/${encodeURIComponent(query)}/`;
    try {
      const html = await fetchHtml(url, {
        "X-Requested-With": "XMLHttpRequest",
        Referer: letterboxdSearchUrl(query),
      });
      const hit = pickConfidentHit(parseSearchResults(html), queries);
      if (hit) return hit;
    } catch {
      /* try the next query */
    }
  }
  return null;
}

async function filmRating(slug: string): Promise<{ rating?: number; reviewCount?: number }> {
  const html = await fetchHtml(`https://letterboxd.com/film/${slug}/`);
  const rating = html.match(/"aggregateRating":\{[^}]*?"ratingValue":([\d.]+)/);
  const count = html.match(/"aggregateRating":\{[^}]*?"reviewCount":(\d+)/);
  return {
    rating: rating ? Number(rating[1]) : undefined,
    reviewCount: count ? Number(count[1]) : undefined,
  };
}

async function resolveFilm(film: FilmQuery): Promise<LetterboxdInfo | null> {
  const queries = [film.originalTitle, film.title]
    .map((q) => (q ?? "").trim())
    .filter((q, i, arr) => q.length >= 2 && arr.indexOf(q) === i);
  if (queries.length === 0) return null;

  const hit = await searchFilm(queries);
  if (!hit) return null;

  let rating: number | undefined;
  let reviewCount: number | undefined;
  try {
    ({ rating, reviewCount } = await filmRating(hit.slug));
  } catch {
    /* keep the resolved slug even if the rating fetch fails */
  }

  return {
    url: `https://letterboxd.com/film/${hit.slug}/`,
    slug: hit.slug,
    rating,
    reviewCount,
    matchedTitle: hit.name,
    matchedYear: hit.year,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Resolve Letterboxd info for the given films, reusing fresh cache entries and
 * scraping only what is missing/stale. Returns a map keyed by `filmKey`.
 */
export async function enrichFilms(
  films: FilmQuery[],
  opts: { ttlDays?: number; persist?: boolean } = {},
): Promise<Record<string, LetterboxdInfo>> {
  const ttlMs = (opts.ttlDays ?? TTL_DAYS) * 86_400_000;
  const persist = opts.persist ?? true;
  const c = await loadCache();
  const out: Record<string, LetterboxdInfo> = {};
  const pending: FilmQuery[] = [];

  for (const film of films) {
    const cached = c.entries[film.filmKey];
    if (cached && Date.now() - Date.parse(cached.fetchedAt ?? "") < ttlMs) {
      out[film.filmKey] = cached;
    } else {
      pending.push(film);
    }
  }

  const queue = [...pending];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let film = queue.shift(); film; film = queue.shift()) {
      try {
        const info = await resolveFilm(film);
        if (info) {
          c.entries[film.filmKey] = info;
          out[film.filmKey] = info;
        }
      } catch {
        /* best effort: leave the film without a rating */
      }
      await sleep(REQUEST_DELAY_MS);
    }
  });
  await Promise.all(workers);

  if (persist) await saveCache();
  return out;
}
