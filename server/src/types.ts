export type Chain = "uci" | "webtic";

export interface Cinema {
  id: string;
  name: string;
  shortName: string;
  chain: Chain;
  city: string;
  address?: string;
  /** source-specific identifier (uci slug or webtic localid) */
  sourceId: string;
  color: string;
  screens?: string[];
}

export interface Showtime {
  id: string;
  cinemaId: string;
  cinemaName: string;
  cinemaShort: string;
  chain: Chain;
  filmKey: string;
  title: string;
  originalTitle?: string;
  duration?: number;
  poster?: string;
  date: string;
  time: string;
  startsAt: string;
  room?: string;
  /** special-format / premium-hall tags: IMAX, ENERGIA, ISENSE, XL, 3D ... */
  halls: string[];
  /** 2D / 3D */
  version?: string;
  /** ITA / EN / ... */
  language?: string;
  subtitled: boolean;
  /** original-language version (lingua originale) */
  originalVersion: boolean;
  bookingUrl?: string;
}

/** Rating / link metadata resolved from Letterboxd (best effort, build time). */
export interface LetterboxdInfo {
  /** Canonical Letterboxd film page, or a search URL when no match was found. */
  url: string;
  slug?: string;
  /** Weighted average rating, 0.5–5. */
  rating?: number;
  reviewCount?: number;
  matchedTitle?: string;
  matchedYear?: number;
  fetchedAt?: string;
}

export interface FilmSummary {
  filmKey: string;
  title: string;
  originalTitle?: string;
  duration?: number;
  poster?: string;
  cinemas: string[];
  showtimeCount: number;
  halls: string[];
  versions: string[];
  firstDate?: string;
  lastDate?: string;
  letterboxd?: LetterboxdInfo;
}

export interface FilmsResponse {
  from: string;
  to: string;
  films: FilmSummary[];
}

export interface ShowtimesResponse {
  film?: { filmKey: string; title: string; originalTitle?: string; duration?: number; poster?: string };
  showtimes: Showtime[];
}

export interface CinemaFailure {
  cinemaId: string;
  cinemaName: string;
  error: string;
}

export interface SourceResult {
  showtimes: Showtime[];
  failures: CinemaFailure[];
}
