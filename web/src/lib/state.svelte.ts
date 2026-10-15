import type { Cinema, CinemaFailure, FilmSummary, Showtime } from "./types";
import { addDaysISO, todayISO } from "./format";

export interface Filters {
  from: string;
  to: string;
  cinemas: string[];
  halls: string[];
  version: string;
  ov: boolean;
  subtitled: boolean;
  hidePastToday: boolean;
  timeFrom: string;
  timeTo: string;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

class AppState {
  filters = $state<Filters>({
    from: todayISO(),
    to: addDaysISO(todayISO(), 6),
    cinemas: [],
    halls: [],
    version: "",
    ov: false,
    subtitled: false,
    hidePastToday: true,
    timeFrom: "",
    timeTo: "",
  });

  cinemas = $state<Cinema[]>([]);
  films = $state<FilmSummary[]>([]);
  showtimes = $state<Showtime[]>([]);
  selectedFilmKey = $state<string>("");
  selectedFilm = $state<FilmSummary | undefined>(undefined);
  search = $state<string>("");
  loadingFilms = $state(false);
  loadingShowtimes = $state(false);
  failures = $state<CinemaFailure[]>([]);
  error = $state<string>("");
  dark = $state<boolean>(load("dark", true));
  favorites = $state<string[]>(load("favorites", [] as string[]));
  favoritesOnly = $state<boolean>(false);

  get activeCinemas(): string[] {
    return this.filters.cinemas.length ? this.filters.cinemas : this.cinemas.map((c) => c.id);
  }

  isFavorite(cinemaId: string): boolean {
    return this.favorites.includes(cinemaId);
  }

  toggleFavorite(cinemaId: string): void {
    this.favorites = this.favorites.includes(cinemaId)
      ? this.favorites.filter((f) => f !== cinemaId)
      : [...this.favorites, cinemaId];
    save("favorites", this.favorites);
  }

  toggleCinema(cinemaId: string): void {
    const all = this.cinemas.map((c) => c.id);
    const current = this.filters.cinemas.length ? this.filters.cinemas : all;
    const next = current.includes(cinemaId)
      ? current.filter((c) => c !== cinemaId)
      : [...current, cinemaId];
    this.filters.cinemas = next.length === all.length ? [] : next;
  }

  isCinemaActive(cinemaId: string): boolean {
    return this.activeCinemas.includes(cinemaId);
  }

  toggleHall(hall: string): void {
    this.filters.halls = this.filters.halls.includes(hall)
      ? this.filters.halls.filter((h) => h !== hall)
      : [...this.filters.halls, hall];
  }

  setDark(value: boolean): void {
    this.dark = value;
    save("dark", value);
    document.documentElement.classList.toggle("dark", value);
  }

  resetFilters(): void {
    this.filters = {
      from: todayISO(),
      to: addDaysISO(todayISO(), 6),
      cinemas: [],
      halls: [],
      version: "",
      ov: false,
      subtitled: false,
      hidePastToday: true,
      timeFrom: "",
      timeTo: "",
    };
  }
}

export const app = new AppState();
