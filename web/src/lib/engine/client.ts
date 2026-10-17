import { CINEMAS } from "@engine/cinemas";
import { aggregate, summarizeFilms, type Aggregated } from "@engine/service";
import { resolveRange, todayInRome, nowMinutesInRome } from "@engine/dates";
import { installProxyTransport } from "./transport";
import { notifyEngineUpdate } from "./updates";
import type {
  Cinema,
  CinemaFailure,
  FilmShowtimesResponse,
  FilmSummary,
  FilmsResponse,
  LetterboxdInfo,
  Showtime,
} from "../types";

/**
 * Browser-side data engine used by the static (GitHub Pages) build.
 *
 * The aggregation/normalisation logic is the very same code the Express server
 * runs (`@engine/*`), only the HTTP transport is swapped for a CORS proxy. If
 * every proxy fails, we fall back to a snapshot generated at build time.
 */

export interface ClientFilters {
  from: string;
  to: string;
  cinemas?: string[];
  halls?: string[];
  version?: string;
  ov?: boolean;
  subtitled?: boolean;
  hidePastToday?: boolean;
  timeFrom?: string;
  timeTo?: string;
  search?: string;
}

interface Snapshot {
  generatedAt: string;
  showtimes: Showtime[];
  failures?: CinemaFailure[];
  /** Letterboxd link/rating per canonical film key (build-time enrichment). */
  films?: Record<string, LetterboxdInfo>;
}

function applyFilters(showtimes: Showtime[], q: ClientFilters): Showtime[] {
  const now = nowMinutesInRome();
  const today = todayInRome();
  return showtimes.filter((st) => {
    if (q.cinemas?.length && !q.cinemas.includes(st.cinemaId)) return false;
    if (q.halls?.length && !q.halls.some((h) => st.halls.includes(h))) return false;
    if (q.version && st.version !== q.version) return false;
    if (q.ov && !st.originalVersion) return false;
    if (q.subtitled && !st.subtitled) return false;
    if (q.timeFrom && st.time < q.timeFrom) return false;
    if (q.timeTo && st.time > q.timeTo) return false;
    if (q.hidePastToday && st.date === today) {
      const [h, m] = st.time.split(":").map((n) => parseInt(n, 10));
      if (h * 60 + m < now) return false;
    }
    return true;
  });
}

let snapshotPromise: Promise<Snapshot | null> | null = null;

function loadSnapshot(): Promise<Snapshot | null> {
  if (!snapshotPromise) {
    const url = `${import.meta.env.BASE_URL}data/snapshot.json`;
    snapshotPromise = fetch(url)
      .then((res) => (res.ok ? (res.json() as Promise<Snapshot>) : null))
      .catch(() => null);
  }
  return snapshotPromise;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Richiesta live troppo lenta")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function fromSnapshot(
  from: string,
  to: string,
  cinemaIds?: string[],
): Promise<Aggregated | null> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return null;
  const scoped = cinemaIds?.length
    ? snapshot.showtimes.filter((s) => cinemaIds.includes(s.cinemaId))
    : snapshot.showtimes;
  return {
    showtimes: scoped.filter((s) => s.date >= from && s.date <= to),
    failures: snapshot.failures ?? [],
  };
}

/** Letterboxd link/rating map from the bundled snapshot (static, best effort). */
async function loadFilmInfo(): Promise<Record<string, LetterboxdInfo>> {
  const snapshot = await loadSnapshot();
  return snapshot?.films ?? {};
}

/** How long the background live refresh may take before we give up on it. */
const LIVE_TIMEOUT_MS = 15_000;

/** How long before a failed live refresh is retried on the next query. */
const LIVE_RETRY_MS = 60_000;

interface CacheEntry {
  /** Fast, locally-bundled data; resolved as soon as `snapshot.json` is parsed. */
  snapshot: Promise<Aggregated | null>;
  /** Live data once a refresh has succeeded in this session. */
  live: Aggregated | null;
  /** In-flight live refresh, if any. */
  livePromise: Promise<Aggregated | null> | null;
  /** When the last live refresh started (for retry throttling). */
  lastAttempt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(from: string, to: string, cinemaIds?: string[]): string {
  const ids = cinemaIds?.length ? [...cinemaIds].sort().join(",") : "";
  return `${from}|${to}|${ids}`;
}

/** Kick off a live fetch through the CORS proxies; resolve to `null` on failure. */
function refreshLive(
  entry: CacheEntry,
  from: string,
  to: string,
  cinemaIds?: string[],
): Promise<Aggregated | null> {
  installProxyTransport();
  entry.lastAttempt = Date.now();
  const promise = withTimeout(aggregate(from, to, cinemaIds), LIVE_TIMEOUT_MS)
    .then((live) => {
      // `aggregate` records per-cinema failures instead of throwing, so an
      // all-failed result means "no live data": keep serving the snapshot.
      if (live.showtimes.length === 0 && live.failures.length > 0) return null;
      entry.live = live;
      notifyEngineUpdate();
      return live;
    })
    .catch(() => null)
    .finally(() => {
      entry.livePromise = null;
    });
  entry.livePromise = promise;
  return promise;
}

function ensureEntry(from: string, to: string, cinemaIds?: string[]): CacheEntry {
  const key = cacheKey(from, to, cinemaIds);
  let entry = cache.get(key);
  if (!entry) {
    entry = {
      snapshot: fromSnapshot(from, to, cinemaIds),
      live: null,
      livePromise: null,
      lastAttempt: 0,
    };
    cache.set(key, entry);
  }
  if (!entry.live && !entry.livePromise && Date.now() - entry.lastAttempt >= LIVE_RETRY_MS) {
    void refreshLive(entry, from, to, cinemaIds);
  }
  return entry;
}

/**
 * Stale-while-revalidate: answer immediately from the bundled snapshot and let
 * a live refresh run in the background, notifying the UI (via `updates`) when
 * fresher data lands. Falls back to live-only when no snapshot is bundled.
 */
async function loadAggregated(
  from: string,
  to: string,
  cinemaIds?: string[],
): Promise<Aggregated> {
  const entry = ensureEntry(from, to, cinemaIds);
  if (entry.live) return entry.live;

  const snapshot = await entry.snapshot;
  if (snapshot) return snapshot;

  const live =
    (await entry.livePromise) ?? (await refreshLive(entry, from, to, cinemaIds));
  if (live) return live;

  return { showtimes: [], failures: [] };
}

export function engineCinemas(): Cinema[] {
  return CINEMAS as Cinema[];
}

export async function queryFilms(filters: ClientFilters): Promise<FilmsResponse> {
  const { from, to } = resolveRange(filters.from, filters.to, 7);
  const { showtimes, failures } = await loadAggregated(from, to, filters.cinemas);
  const filtered = applyFilters(showtimes, filters);
  let films = summarizeFilms(filtered, await loadFilmInfo()) as FilmSummary[];

  const search = filters.search?.trim().toLowerCase() ?? "";
  if (search) {
    films = films.filter(
      (f) =>
        f.title.toLowerCase().includes(search) ||
        (f.originalTitle ?? "").toLowerCase().includes(search),
    );
  }
  if (filters.halls?.length) {
    films = films.filter((f) => filters.halls!.some((h) => f.halls.includes(h)));
  }

  return { from, to, films, failures };
}

export async function queryFilmShowtimes(
  filmKey: string,
  filters: ClientFilters,
): Promise<FilmShowtimesResponse> {
  const key = filmKey.trim().toLowerCase();
  const { from, to } = resolveRange(filters.from, filters.to, 7);
  const { showtimes, failures } = await loadAggregated(from, to, filters.cinemas);

  let list = showtimes.filter((st) => st.filmKey === key);
  if (list.length === 0) list = showtimes.filter((st) => st.filmKey.includes(key));
  list = applyFilters(list, filters);

  const films = summarizeFilms(list, await loadFilmInfo()) as FilmSummary[];
  return { from, to, film: films[0], showtimes: list, failures };
}
