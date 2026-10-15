import type { Showtime } from "./types";

export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

function atNoon(iso: string): Date {
  return new Date(iso + "T12:00:00");
}

const LONG = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" });
const SHORT = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "2-digit", month: "2-digit" });
const DATE_ONLY = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long" });

export function formatDayLong(iso: string): string {
  return LONG.format(atNoon(iso));
}

export function formatDate(iso: string): string {
  return DATE_ONLY.format(atNoon(iso));
}

export function formatDayShort(iso: string): string {
  return SHORT.format(atNoon(iso));
}

export function dayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Oggi";
  if (iso === addDaysISO(today, 1)) return "Domani";
  const w = atNoon(iso).getDay();
  const names = ["Domenica", "Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi", "Sabato"];
  return names[w];
}

export function formatDuration(min?: number): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}`.trim() : `${m}m`;
}

const LANGUAGE_NAMES: Record<string, string> = {
  ITA: "Italiano",
  IT: "Italiano",
  EN: "Inglese",
  ENG: "Inglese",
  FRA: "Francese",
  FR: "Francese",
  GER: "Tedesco",
  DE: "Tedesco",
  SPA: "Spagnolo",
  ESP: "Spagnolo",
  ES: "Spagnolo",
  POR: "Portoghese",
  PT: "Portoghese",
  RUS: "Russo",
  RU: "Russo",
  JPN: "Giapponese",
  JA: "Giapponese",
  ARA: "Arabo",
};

export function languageLabel(lang?: string): string {
  if (!lang) return "Italiano";
  return LANGUAGE_NAMES[lang.trim().toUpperCase()] ?? lang;
}

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function isPast(st: Showtime): boolean {
  return st.date === todayISO() && st.time < toHHMM(nowMinutes());
}

function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function icsDate(st: Showtime): string {
  const [y, mo, d] = st.date.split("-");
  const [h, mi] = st.time.split(":");
  return `${y}${mo}${d}T${h}${mi}00`;
}

function icsUtcStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildIcs(showtimes: Showtime[], filmTitle: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cinema Bergamo//IT",
    "CALSCALE:GREGORIAN",
  ];
  for (const st of showtimes) {
    const start = icsDate(st);
    let end = start;
    if (st.duration) {
      const e = new Date(`${st.date}T${st.time}:00`);
      e.setMinutes(e.getMinutes() + st.duration);
      end =
        `${e.getFullYear()}${String(e.getMonth() + 1).padStart(2, "0")}${String(e.getDate()).padStart(2, "0")}` +
        `T${String(e.getHours()).padStart(2, "0")}${String(e.getMinutes()).padStart(2, "0")}00`;
    }
    lines.push(
      "BEGIN:VEVENT",
      `UID:${st.id}@cinema-bergamo`,
      `DTSTAMP:${icsUtcStamp()}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${filmTitle} — ${st.cinemaShort}${st.halls.length ? " (" + st.halls.join(", ") + ")" : ""}`,
      `LOCATION:${st.cinemaName}${st.room ? " - " + st.room : ""}`,
      st.bookingUrl ? `URL:${st.bookingUrl}` : "DESCRIPTION:",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
