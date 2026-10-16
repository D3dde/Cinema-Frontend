/** Logos served from web/public/brands. */

export interface Logo {
  src: string;
  /** white single-colour mark: rendered through an alpha mask so it takes the text colour */
  mask?: boolean;
  /** width / height of the artwork, used to size masked logos */
  aspect?: number;
}

const base = import.meta.env.BASE_URL;

export const CINEMA_LOGOS: Record<string, Logo> = {
  "uci-orio": { src: `${base}brands/uci.png` },
  "arcadia-stezzano": { src: `${base}brands/arcadia.png` },
  "notorious-curno": { src: `${base}brands/notorious.png`, mask: true, aspect: 600 / 311 },
};

export const HALL_LOGOS: Record<string, Logo> = {
  IMAX: { src: `${base}brands/imax.svg` },
  ENERGIA: { src: `${base}brands/energia.png`, mask: true, aspect: 401 / 92 },
};
