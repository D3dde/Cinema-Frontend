const ROME = "Europe/Rome";

export function todayInRome(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 400) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

export function resolveRange(fromRaw?: string, toRaw?: string, days = 7): { from: string; to: string } {
  const from = fromRaw && isValidDate(fromRaw) ? fromRaw : todayInRome();
  const to = toRaw && isValidDate(toRaw) ? toRaw : addDays(from, Math.max(0, days - 1));
  return from <= to ? { from, to } : { from: to, to: from };
}

const DAY_FMT = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" });
const SHORT_FMT = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "2-digit", month: "2-digit" });

export function formatDayLong(date: string): string {
  return DAY_FMT.format(new Date(date + "T12:00:00"));
}

export function formatDayShort(date: string): string {
  return SHORT_FMT.format(new Date(date + "T12:00:00"));
}

export function nowMinutesInRome(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ROME,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = parts.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
}
