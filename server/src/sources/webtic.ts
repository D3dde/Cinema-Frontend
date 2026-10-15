import { fetchJson } from "../http.js";
import { cached, TTL } from "../cache.js";
import { detectHalls, normalizeTitle, cleanTitle } from "../normalize.js";
import { BOOKING_PAGES } from "../cinemas.js";
import type { Cinema, Showtime } from "../types.js";

const API = "https://secure.webtic.it/api";
const IMG = `${API}/HandlerLocandinaEx.ashx`;

interface WebticPerformance {
  PerformanceId: number;
  Time: string;
  Screen?: string;
  ScreenId?: number;
  StartTime: string;
  EndTime?: string;
  Duration?: number;
  ScreenName?: string;
}

interface WebticDay {
  Day: string;
  Performances?: WebticPerformance[];
}

interface WebticEvent {
  EventId: number;
  Title: string;
  OriginalTitle?: string;
  Type?: string;
  Is3D?: boolean;
  Duration?: string;
  Picture?: string;
  Year?: string;
  Category?: string;
  Properties?: string[];
  TitleId?: string;
  Days?: WebticDay[];
}

interface WebticResponse {
  DS?: { Scheduling?: { LocalId?: number; Events?: WebticEvent[] } };
}

const LANG_CODES = ["ITA", "EN", "FRA", "GER", "SPA", "ESP", "POR", "RUS", "JPN", "ARA"];

function durationToMinutes(d?: string): number | undefined {
  if (!d) return undefined;
  const m = d.match(/(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : undefined;
}

function displayTitle(title: string): string {
  return cleanTitle(title) || title;
}

function posterUrl(picture?: string): string | undefined {
  if (!picture) return undefined;
  if (/^https?:/i.test(picture)) return picture;
  return `${IMG}?${picture.replace(/^[^?]*\?/, "")}`;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Deep link straight to the seat-selection page for a single performance.
 * Each cinema exposes its own ticketing front-end on top of Webtic.
 */
function bookingUrl(cinema: Cinema, event: WebticEvent, perfId: number, title: string): string {
  const local = cinema.sourceId;
  if (cinema.id === "arcadia-stezzano") {
    const slug = slugify(title) || "film";
    return `https://www.arcadiacinema.com/acquista/${slug}/${local}/${event.EventId}/${perfId}/`;
  }
  if (cinema.id === "notorious-curno") {
    return `https://www.notoriouscinemas.it/generic/seatsframe.php?sc=${local}&sp=${perfId}#seatsframe`;
  }
  return BOOKING_PAGES[cinema.id] ?? "https://www.webtic.it/";
}

async function fetchScheduling(cinema: Cinema): Promise<WebticEvent[]> {
  const key = `webtic:sched:${cinema.sourceId}`;
  return cached(key, TTL.schedule, async () => {
    const res = await fetchJson<WebticResponse>(
      `${API}/wtjsonservices.ashx?wtid=getFullScheduling&localid=${cinema.sourceId}`,
    );
    return res.DS?.Scheduling?.Events ?? [];
  });
}

export async function fetchWebticProgramming(
  cinema: Cinema,
  from: string,
  to: string,
): Promise<Showtime[]> {
  const events = await fetchScheduling(cinema);
  const out: Showtime[] = [];

  for (const event of events) {
    const rawTitle = event.Title;
    const title = displayTitle(rawTitle);
    const originalTitle = event.OriginalTitle?.trim() || undefined;
    const poster = posterUrl(event.Picture);
    const duration = durationToMinutes(event.Duration);
    const props = event.Properties ?? [];
    const propsText = props.join(" ");
    // Default to Italian when the schedule does not tag a language.
    const language = LANG_CODES.find((c) => props.includes(c)) ?? "ITA";
    const originalVersion =
      props.some((p) => /o\.?v\.?/i.test(p)) || /\((o\.?v\.?|lingua originale)/i.test(rawTitle);
    const subtitled = props.some((p) => /sub-?it/i.test(p));
    const version = event.Is3D || props.includes("3D") ? "3D" : "2D";
    const baseHalls = detectHalls(propsText, title, originalTitle);

    for (const day of event.Days ?? []) {
      const date = day.Day.slice(0, 10);
      if (date < from || date > to) continue;
      for (const perf of day.Performances ?? []) {
        const room = perf.ScreenName || perf.Screen;
        const halls = detectHalls(baseHalls.join(" "), room);
        out.push({
          id: `webtic-${cinema.sourceId}-${perf.PerformanceId}`,
          cinemaId: cinema.id,
          cinemaName: cinema.name,
          cinemaShort: cinema.shortName,
          chain: cinema.chain,
          filmKey: normalizeTitle(title),
          title,
          originalTitle,
          duration,
          poster,
          date,
          time: perf.Time,
          startsAt: perf.StartTime || `${date}T${perf.Time}:00`,
          room,
          halls,
          version,
          language,
          subtitled,
          originalVersion,
          bookingUrl: bookingUrl(cinema, event, perf.PerformanceId, title),
        });
      }
    }
  }

  return out;
}
