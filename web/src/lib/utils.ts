import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const HALL_NEUTRAL =
  "bg-black/5 text-black/70 ring-black/10 dark:bg-white/10 dark:text-white/70 dark:ring-white/15";

export const HALL_STYLES: Record<string, { label: string; class: string }> = {
  IMAX: { label: "IMAX", class: "bg-black/10 text-current ring-black/15 dark:bg-white/15 dark:ring-white/20" },
  ISENSE: { label: "iSense", class: HALL_NEUTRAL },
  ENERGIA: { label: "Energia", class: HALL_NEUTRAL },
  XL: { label: "XL", class: HALL_NEUTRAL },
  SCREENX: { label: "ScreenX", class: HALL_NEUTRAL },
  LUXE: { label: "Luxe", class: HALL_NEUTRAL },
  "4DX": { label: "4DX", class: HALL_NEUTRAL },
  DOLBY: { label: "Dolby", class: HALL_NEUTRAL },
  "INFINITY VISION": { label: "Infinity Vision", class: HALL_NEUTRAL },
};

export function hallStyle(hall: string) {
  return HALL_STYLES[hall] ?? { label: hall, class: HALL_NEUTRAL };
}

export function cinemaColorVar(cinemaId: string, cinemas: { id: string; color: string }[]): string {
  return cinemas.find((c) => c.id === cinemaId)?.color ?? "#a1a1aa";
}

export function download(filename: string, content: string, type = "text/calendar") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
