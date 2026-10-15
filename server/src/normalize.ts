/**
 * Title normalization + cross-chain film matching.
 *
 * The three cinemas label the same film differently ("DUNE PARTE TRE |
 * ANTEPRIMA IMAX" vs "Dune: Parte Tre"), so we normalize and then cluster
 * titles by similarity to produce one canonical film key.
 */

const NOISE_PHRASES = [
  /film in inglese/g,
  /original version/g,
  /versione originale/g,
  /lingua originale/g,
  /v\.?\s?o\.?\b/g,
  /\bo\.?\s?v\.?\b/g,
  /\bsub-?it\b/g,
  /\bnew!?\b/g,
  /\banteprima\b/g,
  /\banteprime\b/g,
  /\briedizione\b/g,
  /\brassegna\b/g,
  /\bevento speciale\b/g,
  /\bcinemamma\b/g,
  /\bcinema gamma\b/g,
  /\bnuovo\b/g,
  // "C.A." = contenuto alternativo suffix used by Webtic/Arcadia
  /\bc\.?\s*a\.?\b/g,
];

const FORMAT_WORDS = new Set([
  "imax",
  "isense",
  "screenx",
  "xl",
  "luxe",
  "energia",
  "infinity",
  "vision",
  "dolby",
  "atmos",
  "4dx",
  "4k",
  "70mm",
  "35mm",
  "2d",
  "3d",
  "hfr",
]);

/** Manual overrides for stubborn titles. Key = normalized variant, value = canonical key. */
const ALIASES: Record<string, string> = {
  // "the odyssey" english -> italian canonical
  "the odyssey": "odissea",
};

export function normalizeTitle(raw: string | undefined | null): string {
  if (!raw) return "";
  let s = raw.replace(/\u00a0/g, " ").toLowerCase();

  // drop premium-format / event suffix after a pipe
  s = s.split("|")[0];

  for (const re of NOISE_PHRASES) s = s.replace(re, " ");

  // rating / duration-ish tokens: v.m.14, vm14, 10+, 6+
  s = s.replace(/\bv\s?\.?\s?m\s?\.?\s?\d+/g, " ");
  s = s.replace(/\b\d+\s?\+/g, " ");

  // remove bracketed content [2026], (O.V.), (V.M.14)
  s = s.replace(/\[[^\]]*\]/g, " ");
  s = s.replace(/\([^)]*\)/g, " ");

  // remove accents
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // hyphen used as separator "a - b"
  s = s.replace(/\s[-–—]\s/g, " ");

  // strip punctuation / apostrophes
  s = s.replace(/['’`]/g, "");
  s = s.replace(/[^a-z0-9\s]/g, " ");

  const tokens = s
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !FORMAT_WORDS.has(t));

  return tokens.join(" ").trim();
}

export function canonicalOverride(normalized: string): string | undefined {
  return ALIASES[normalized];
}

/* ----------------------------- similarity ----------------------------- */

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  const t = s.replace(/\s+/g, " ").trim();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}

function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return (2 * inter) / (a.size + b.size);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * 1 when the smaller title's tokens are all contained in the larger one
 * (e.g. "heart of the beast" ⊂ "heart of the beast nel profondo selvaggio"),
 * as long as the extra tokens are few (subtitle-like).
 */
function subsetScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  if (small.size < 2) return 0;
  let inter = 0;
  for (const x of small) if (big.has(x)) inter++;
  if (inter !== small.size) return 0;
  return big.size - small.size <= 4 ? 1 : 0;
}

export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ta = new Set(a.split(" "));
  const tb = new Set(b.split(" "));
  return Math.max(dice(bigrams(a), bigrams(b)), jaccard(ta, tb), subsetScore(ta, tb));
}

/**
 * Cluster normalized titles into canonical film keys.
 * Deterministic and order-independent for a given input set.
 */
export class TitleClusterer {
  private clusters: { key: string; members: Set<string> }[] = [];

  add(normalized: string): string {
    if (!normalized) return "";
    const override = canonicalOverride(normalized);
    if (override) {
      this.ensure(override).members.add(normalized);
      return override;
    }

    let best: { cluster: { key: string; members: Set<string> }; score: number } | null = null;
    for (const cluster of this.clusters) {
      let score = 0;
      for (const member of cluster.members) {
        const s = similarity(normalized, member);
        if (s > score) score = s;
      }
      if (!best || score > best.score) best = { cluster, score };
    }

    if (best && best.score >= 0.78) {
      best.cluster.members.add(normalized);
      return best.cluster.key;
    }
    this.ensure(normalized).members.add(normalized);
    return normalized;
  }

  private ensure(key: string) {
    let c = this.clusters.find((x) => x.key === key);
    if (!c) {
      c = { key, members: new Set() };
      this.clusters.push(c);
    }
    return c;
  }
}

/* ------------------------------ hall tags ------------------------------ */

const PREMIUM_HALLS = [
  "IMAX",
  "ISENSE",
  "SCREENX",
  "XL",
  "LUXE",
  "ENERGIA",
  "4DX",
  "DOLBY",
  "INFINITY VISION",
];

export function detectHalls(...texts: (string | undefined)[]): string[] {
  const joined = texts.filter(Boolean).join(" ").toUpperCase();
  const found = new Set<string>();
  for (const hall of PREMIUM_HALLS) {
    if (joined.includes(hall)) found.add(hall);
  }
  return [...found];
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

/** Human-facing cleanup of a raw title (strips O.V. / hall / C.A. decorations). */
export function cleanTitle(raw: string): string {
  return raw
    .replace(/^\s*\((?:o\.?v\.?|lingua originale)[^)]*\)\s*/i, "")
    .replace(/^\s*(?:energia|imax|isense|xl|screenx|luxe)\s*[-–]\s+/i, "")
    .replace(/\s*\bC\.?\s*A\.?\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
