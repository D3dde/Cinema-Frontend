/** Logos served from web/public/brands. */

export interface Logo {
  src: string;
  /** white single-colour mark: rendered through an alpha mask so it takes the text colour */
  mask?: boolean;
  /** width / height of the artwork, used to size masked logos */
  aspect?: number;
}

export const CINEMA_LOGOS: Record<string, Logo> = {
  "uci-orio": { src: "/brands/uci.png" },
  "arcadia-stezzano": { src: "/brands/arcadia.png" },
  "notorious-curno": { src: "/brands/notorious.png", mask: true, aspect: 600 / 311 },
};

export const HALL_LOGOS: Record<string, Logo> = {
  IMAX: { src: "/brands/imax.svg" },
  ENERGIA: { src: "/brands/energia.png", mask: true, aspect: 401 / 92 },
};
