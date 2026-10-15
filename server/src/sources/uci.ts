import { fetchJson } from "../http.js";
import { cached, TTL } from "../cache.js";
import { detectHalls, normalizeTitle } from "../normalize.js";
import type { Cinema, Showtime } from "../types.js";

const API = "https://myuci---uci-backend-production-nfluwp7wga-oc.a.run.app/api";
const SITE = "https://www.ucicinemas.it";

interface UciPerformance {
  id: number;
  room?: string;
  room_id?: number;
  screen_type?: string[];
  day: string;
  starts_at: string;
  ends_at?: string;
  actual_start_at?: string;
  duration?: number;
  cart_link?: string;
}

interface UciVariant {
  id: number;
  screen?: { name?: string; slug?: string };
  language?: { name?: string; slug?: string };
  subtitles?: unknown;
  duration?: string;
  performances?: UciPerformance[];
}

interface UciMovie {
  id: number;
  title: string;
  slug: string;
  poster?: string | null;
  top_image?: string | null;
  screens?: Record<string, UciVariant[]>[];
}

/** The range endpoint returns one object per day: { "YYYY-MM-DD": [movie, ...] }. */
type UciRangeResponse = { data: Record<string, UciMovie[]>[] };

function durationToMinutes(d?: string): number | undefined {
  if (!d) return undefined;
  const m = d.match(/(\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export interface UciTheatre {
  id: number;
  name: string;
  slug: string;
  city?: string;
  screens?: string[];
}

export function fetchTheatres(): Promise<UciTheatre[]> {
  return cached("uci:theatres", TTL.cinemas, async () => {
    const res = await fetchJson<{ data: UciTheatre[] }>(`${API}/theatres`);
    return res.data ?? [];
  });
}

function buildShowtimes(cinema: Cinema, date: string, movie: UciMovie): Showtime[] {
  const title = movie.title;
  const poster = movie.poster ?? movie.top_image ?? undefined;
  const out: Showtime[] = [];

  for (const screenGroup of movie.screens ?? []) {
    for (const [format, variants] of Object.entries(screenGroup)) {
      for (const variant of variants) {
        const duration = durationToMinutes(variant.duration);
        // The upstream API omits the language for many screenings: assume Italian.
        const language = variant.language?.name ?? "ITA";
        const halls = detectHalls(format, variant.screen?.name, variant.screen?.slug);
        const version = /3d/i.test(format) ? "3D" : "2D";

        for (const perf of variant.performances ?? []) {
          const time = perf.actual_start_at || perf.starts_at?.slice(11, 16) || "";
          const perfHalls = detectHalls(halls.join(" "), (perf.screen_type ?? []).join(" "));
          out.push({
            id: `uci-${perf.id}`,
            cinemaId: cinema.id,
            cinemaName: cinema.name,
            cinemaShort: cinema.shortName,
            chain: cinema.chain,
            filmKey: normalizeTitle(title),
            title,
            duration,
            poster,
            date: perf.day || date,
            time,
            startsAt: `${perf.day || date}T${time}:00`,
            room: perf.room,
            halls: perfHalls,
            version,
            language,
            subtitled: Boolean(variant.subtitles),
            originalVersion: Boolean(variant.language?.name) && !/^(ita|italiano)$/i.test(language),
            bookingUrl: perf.cart_link ? SITE + perf.cart_link : undefined,
          });
        }
      }
    }
  }

  return out;
}

/**
 * The public site loads all upcoming programming for a theatre in a single
 * request. The query params are ignored upstream, so we fetch once, cache, and
 * filter to the requested window locally.
 */
export async function fetchUciProgramming(
  cinema: Cinema,
  from: string,
  to: string,
): Promise<Showtime[]> {
  const key = `uci:prog:${cinema.sourceId}`;
  const all = await cached(key, TTL.schedule, async () => {
    const res = await fetchJson<UciRangeResponse>(
      `${API}/theatres/${cinema.sourceId}/programming?from=${from}&to=${to}`,
    );
    const showtimes: Showtime[] = [];
    for (const entry of res.data ?? []) {
      for (const [date, movies] of Object.entries(entry)) {
        for (const movie of movies) showtimes.push(...buildShowtimes(cinema, date, movie));
      }
    }
    return showtimes;
  });

  return all.filter((st) => st.date >= from && st.date <= to);
}
