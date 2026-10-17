export type Chain = "uci" | "webtic";

export interface Cinema {
  id: string;
  name: string;
  shortName: string;
  chain: Chain;
  city: string;
  address?: string;
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
  halls: string[];
  version?: string;
  language?: string;
  subtitled: boolean;
  originalVersion: boolean;
  bookingUrl?: string;
}

export interface LetterboxdInfo {
  url: string;
  slug?: string;
  rating?: number;
  reviewCount?: number;
  matchedTitle?: string;
  matchedYear?: number;
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

export interface CinemaFailure {
  cinemaId: string;
  cinemaName: string;
  error: string;
}

export interface FilmsResponse {
  from: string;
  to: string;
  films: FilmSummary[];
  failures?: CinemaFailure[];
}

export interface FilmShowtimesResponse {
  from: string;
  to: string;
  film?: FilmSummary;
  showtimes: Showtime[];
  failures?: CinemaFailure[];
}
