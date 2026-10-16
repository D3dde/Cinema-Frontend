import { CINEMAS } from "@engine/cinemas";
import { aggregate, summarizeFilms, type Aggregated } from "@engine/service";
import { resolveRange, todayInRome, nowMinutesInRome } from "@engine/dates";
import { installProxyTransport } from "./transport";
import type {
  Cinema,
  CinemaFailure,
  FilmShowtimesResponse,
  FilmSummary,
  FilmsResponse,
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

async function loadAggregated(
  from: string,
  to: string,
  cinemaIds?: string[],
): Promise<Aggregated> {
  installProxyTransport();
  try {
    const live = await withTimeout(aggregate(from, to, cinemaIds), 12000);
    // `aggregate` records per-cinema failures instead of throwing, so treat an
    // all-failed result as "no live data" and prefer the bundled snapshot.
    if (live.showtimes.length === 0 && live.failures.length > 0) {
      return (await fromSnapshot(from, to, cinemaIds)) ?? live;
    }
    return live;
  } catch (err) {
    const snapshot = await fromSnapshot(from, to, cinemaIds);
    if (snapshot) return snapshot;
    throw err;
  }
}

export function engineCinemas(): Cinema[] {
  return CINEMAS as Cinema[];
}

export async function queryFilms(filters: ClientFilters): Promise<FilmsResponse> {
  const { from, to } = resolveRange(filters.from, filters.to, 7);
  const { showtimes, failures } = await loadAggregated(from, to, filters.cinemas);
  const filtered = applyFilters(showtimes, filters);
  let films = summarizeFilms(filtered) as FilmSummary[];

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

  const films = summarizeFilms(list) as FilmSummary[];
  return { from, to, film: films[0], showtimes: list, failures };
}
