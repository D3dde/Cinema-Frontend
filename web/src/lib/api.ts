import type { Cinema, FilmShowtimesResponse, FilmsResponse } from "./types";

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
  const data = await getJson<{ cinemas: Cinema[] }>("/api/cinemas");
  return data.cinemas;
}

export function fetchFilms(filters: ScheduleFilters & { search?: string }): Promise<FilmsResponse> {
  return getJson<FilmsResponse>(`/api/films${qs({ ...toParams(filters), search: filters.search })}`);
}

export function fetchFilmShowtimes(
  filmKey: string,
  filters: ScheduleFilters & { timeFrom?: string; timeTo?: string },
): Promise<FilmShowtimesResponse> {
  return getJson<FilmShowtimesResponse>(
    `/api/film/${encodeURIComponent(filmKey)}/showtimes${qs({
      ...toParams(filters),
      timeFrom: filters.timeFrom,
      timeTo: filters.timeTo,
    })}`,
  );
}
