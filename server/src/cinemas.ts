import type { Cinema } from "./types.js";

export const CINEMAS: Cinema[] = [
  {
    id: "uci-orio",
    name: "UCI Cinemas Orio",
    shortName: "UCI Orio",
    chain: "uci",
    city: "Orio al Serio",
    address: "Via Portico 71, 24050 Orio al Serio (BG)",
    sourceId: "uci-cinemas-orio-bergamo",
    color: "#b91c1c",
    screens: ["IMAX", "2D"],
  },
  {
    id: "arcadia-stezzano",
    name: "Arcadia Cinema Stezzano",
    shortName: "Arcadia",
    chain: "webtic",
    city: "Stezzano",
    address: "C.C. Le Due Torri, Via Guzzanica 62/64, 24040 Stezzano (BG)",
    sourceId: "5611",
    color: "#0f766e",
  },
  {
    id: "notorious-curno",
    name: "Notorious Cinemas Curno",
    shortName: "Notorious",
    chain: "webtic",
    city: "Curno",
    address: "Via Lega Lombarda 39, 24035 Curno (BG)",
    sourceId: "6122",
    color: "#b45309",
  },
];

export const BOOKING_PAGES: Record<string, string> = {
  "uci-orio": "https://www.ucicinemas.it/cinema/uci-cinemas-orio-bergamo/",
  "arcadia-stezzano": "https://www.arcadiacinema.com/stezzano/",
  "notorious-curno": "https://www.notoriouscinemas.it/curno/",
};

export function getCinema(id: string): Cinema | undefined {
  return CINEMAS.find((c) => c.id === id);
}
