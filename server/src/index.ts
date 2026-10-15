import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CINEMAS } from "./cinemas.js";
import { aggregate, summarizeFilms } from "./service.js";
import { nowMinutesInRome, resolveRange, todayInRome } from "./dates.js";
import type { Showtime } from "./types.js";

const app = express();
const PORT = Number(process.env.PORT ?? 8787);

function parseList(value: unknown): string[] | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isTruthy(value: unknown): boolean {
  return value === "1" || value === "true" || value === "yes";
}

interface FilterQuery {
  cinemas?: string[];
  halls?: string[];
  version?: string;
  language?: string;
  ov?: boolean;
  subtitled?: boolean;
  timeFrom?: string;
  timeTo?: string;
  hidePastToday?: boolean;
  date?: string;
}

function applyFilters(showtimes: Showtime[], q: FilterQuery): Showtime[] {
  const now = nowMinutesInRome();
  const today = todayInRome();
  return showtimes.filter((st) => {
    if (q.cinemas && !q.cinemas.includes(st.cinemaId)) return false;
    if (q.halls && q.halls.length && !q.halls.some((h) => st.halls.includes(h))) return false;
    if (q.version && st.version !== q.version) return false;
    if (q.language && (st.language ?? "").toUpperCase() !== q.language.toUpperCase()) return false;
    if (q.ov && !st.originalVersion) return false;
    if (q.subtitled && !st.subtitled) return false;
    if (q.date && st.date !== q.date) return false;
    if (q.timeFrom && st.time < q.timeFrom) return false;
    if (q.timeTo && st.time > q.timeTo) return false;
    if (q.hidePastToday && st.date === today) {
      const [h, m] = st.time.split(":").map((n) => parseInt(n, 10));
      if (h * 60 + m < now) return false;
    }
    return true;
  });
}

function buildFilterQuery(query: Record<string, unknown>): FilterQuery {
  return {
    cinemas: parseList(query.cinemas),
    halls: parseList(query.halls),
    version: typeof query.version === "string" ? query.version : undefined,
    language: typeof query.language === "string" ? query.language : undefined,
    ov: isTruthy(query.ov),
    subtitled: isTruthy(query.subtitled),
    timeFrom: typeof query.timeFrom === "string" ? query.timeFrom : undefined,
    timeTo: typeof query.timeTo === "string" ? query.timeTo : undefined,
    hidePastToday: isTruthy(query.hidePastToday),
    date: typeof query.date === "string" ? query.date : undefined,
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, today: todayInRome() });
});

app.get("/api/cinemas", (_req, res) => {
  res.json({ cinemas: CINEMAS });
});

app.get("/api/films", async (req, res) => {
  try {
    const days = Number(req.query.days ?? 7);
    const { from, to } = resolveRange(
      req.query.from as string | undefined,
      req.query.to as string | undefined,
      Number.isFinite(days) ? days : 7,
    );
    const cinemaIds = parseList(req.query.cinemas);
    const { showtimes, failures } = await aggregate(from, to, cinemaIds);
    const filtered = applyFilters(showtimes, buildFilterQuery(req.query));
    let films = summarizeFilms(filtered);

    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    if (search) {
      films = films.filter(
        (f) =>
          f.title.toLowerCase().includes(search) ||
          (f.originalTitle ?? "").toLowerCase().includes(search),
      );
    }

    const hallFilter = parseList(req.query.halls);
    if (hallFilter && hallFilter.length) {
      films = films.filter((f) => hallFilter.some((h) => f.halls.includes(h)));
    }

    res.json({ from, to, films, failures });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/film/:filmKey/showtimes", async (req, res) => {
  try {
    const filmKey = decodeURIComponent(req.params.filmKey).trim().toLowerCase();
    const { from, to } = resolveRange(
      req.query.from as string | undefined,
      req.query.to as string | undefined,
      Number(req.query.days ? Number(req.query.days) : 7),
    );
    const cinemaIds = parseList(req.query.cinemas);
    const { showtimes, failures } = await aggregate(from, to, cinemaIds);
    let list = showtimes.filter((st) => st.filmKey === filmKey);
    if (list.length === 0) {
      list = showtimes.filter((st) => st.filmKey.includes(filmKey));
    }
    list = applyFilters(list, buildFilterQuery(req.query));

    const films = summarizeFilms(list);
    res.json({ from, to, film: films[0], showtimes: list, failures });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/schedule", async (req, res) => {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : todayInRome();
    const { from, to } = resolveRange(date, date, 1);
    const cinemaIds = parseList(req.query.cinemas);
    const { showtimes, failures } = await aggregate(from, to, cinemaIds);
    const filtered = applyFilters(showtimes, buildFilterQuery(req.query));
    res.json({ date, showtimes: filtered, failures });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

const here = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(here, "../../web/dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[cinema-bergamo] API on http://localhost:${PORT}`);
  if (existsSync(webDist)) console.log(`[cinema-bergamo] serving frontend from ${webDist}`);
});
