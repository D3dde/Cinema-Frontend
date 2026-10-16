import type { Cinema, FilmShowtimesResponse, FilmsResponse } from "./types";

/**
 * On GitHub Pages there is no backend, so the app talks to the cinema APIs
 * directly through a CORS proxy (see `engine/client`). Locally the Express
 * server provides the same data under `/api`.
 */
const STATIC = String(import.meta.env.VITE_STATIC ?? "") === "1";

type ParamValue = string | number | boolean | string[] | undefined | null;

function qs(params: Record<string, ParamValue>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length) sp.set(key, value.join(","));
    } else {
      sp.set(key, String(value));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function toParams(filters: ScheduleFilters): Record<string, ParamValue> {
  return {
    from: filters.from,
    to: filters.to,
    cinemas: filters.cinemas,
    halls: filters.halls,
    version: filters.version,
    ov: filters.ov,
    subtitled: filters.subtitled,
    hidePastToday: filters.hidePastToday,
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Richiesta fallita (HTTP ${res.status})`);
  return (await res.json()) as T;
}

export interface ScheduleFilters {
  from: string;
  to: string;
  cinemas?: string[];
  halls?: string[];
  version?: string;
  ov?: boolean;
  subtitled?: boolean;
  hidePastToday?: boolean;
}

export async function fetchCinemas(): Promise<Cinema[]> {
  if (STATIC) {
    const { engineCinemas } = await import("./engine/client");
    return engineCinemas();
  }
  const data = await getJson<{ cinemas: Cinema[] }>("/api/cinemas");
  return data.cinemas;
}

export async function fetchFilms(
  filters: ScheduleFilters & { search?: string },
): Promise<FilmsResponse> {
  if (STATIC) {
    const { queryFilms } = await import("./engine/client");
    return queryFilms(filters);
  }
  return getJson<FilmsResponse>(`/api/films${qs({ ...toParams(filters), search: filters.search })}`);
}

export async function fetchFilmShowtimes(
  filmKey: string,
  filters: ScheduleFilters & { timeFrom?: string; timeTo?: string },
): Promise<FilmShowtimesResponse> {
  if (STATIC) {
    const { queryFilmShowtimes } = await import("./engine/client");
    return queryFilmShowtimes(filmKey, filters);
  }
  return getJson<FilmShowtimesResponse>(
    `/api/film/${encodeURIComponent(filmKey)}/showtimes${qs({
      ...toParams(filters),
      timeFrom: filters.timeFrom,
      timeTo: filters.timeTo,
    })}`,
  );
}
