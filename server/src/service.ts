import { CINEMAS } from "./cinemas.js";
import { fetchUciProgramming } from "./sources/uci.js";
import { fetchWebticProgramming } from "./sources/webtic.js";
import { TitleClusterer, cleanTitle } from "./normalize.js";
import type {
  Cinema,
  CinemaFailure,
  FilmSummary,
  Showtime,
  SourceResult,
} from "./types.js";

async function fetchCinema(cinema: Cinema, from: string, to: string): Promise<SourceResult> {
  try {
    if (cinema.chain === "webtic") {
      return { showtimes: await fetchWebticProgramming(cinema, from, to), failures: [] };
    }
    return { showtimes: await fetchUciProgramming(cinema, from, to), failures: [] };
  } catch (err) {
    const failure: CinemaFailure = {
      cinemaId: cinema.id,
      cinemaName: cinema.name,
      error: err instanceof Error ? err.message : String(err),
    };
    return { showtimes: [], failures: [failure] };
  }
}

export interface Aggregated {
  showtimes: Showtime[];
  failures: CinemaFailure[];
}

/**
 * Fetch + normalize + cluster showtimes for all (or selected) cinemas.
 */
export async function aggregate(
  from: string,
  to: string,
  cinemaIds?: string[],
): Promise<Aggregated> {
  const cinemas = cinemaIds?.length
    ? CINEMAS.filter((c) => cinemaIds.includes(c.id))
    : CINEMAS;

  const results = await Promise.all(cinemas.map((c) => fetchCinema(c, from, to)));
  const showtimes = results.flatMap((r) => r.showtimes);
  const failures = results.flatMap((r) => r.failures);

  // Cluster normalized internal keys into canonical film keys.
  // Process in sorted order so the mapping is deterministic for a given set.
  const clusterer = new TitleClusterer();
  const remap = new Map<string, string>();
  const uniqueKeys = [...new Set(showtimes.map((s) => s.filmKey))].sort();
  for (const key of uniqueKeys) {
    remap.set(key, clusterer.add(key));
  }
  for (const st of showtimes) {
    st.filmKey = remap.get(st.filmKey) ?? st.filmKey;
  }

  showtimes.sort((a, b) =>
    a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : a.cinemaId.localeCompare(b.cinemaId),
  );

  return { showtimes, failures };
}

function pickMostCommon(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | undefined;
  let bestCount = -1;
  for (const [v, c] of counts) {
    if (c > bestCount || (c === bestCount && v.length > (best ?? "").length)) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

export function summarizeFilms(showtimes: Showtime[]): FilmSummary[] {
  const groups = new Map<string, Showtime[]>();
  for (const st of showtimes) {
    const arr = groups.get(st.filmKey);
    if (arr) arr.push(st);
    else groups.set(st.filmKey, [st]);
  }

  const films: FilmSummary[] = [];
  for (const [filmKey, list] of groups) {
    const dates = list.map((s) => s.date).sort();
    films.push({
      filmKey,
      title: cleanTitle(pickMostCommon(list.map((s) => s.title)) ?? filmKey),
      originalTitle: cleanTitle(pickMostCommon(list.map((s) => s.originalTitle ?? "")) ?? ""),
      duration: list.find((s) => s.duration)?.duration,
      poster: pickMostCommon(list.map((s) => s.poster ?? "")),
      cinemas: [...new Set(list.map((s) => s.cinemaId))],
      showtimeCount: list.length,
      halls: [...new Set(list.flatMap((s) => s.halls))].sort(),
      versions: [...new Set(list.map((s) => s.version).filter(Boolean) as string[])],
      firstDate: dates[0],
      lastDate: dates[dates.length - 1],
    });
  }

  films.sort((a, b) => a.title.localeCompare(b.title, "it"));
  return films;
}
