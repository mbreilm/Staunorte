import type { PlaceHoursPreset } from "@/lib/supabase/types";

// 0 = Montag ... 6 = Sonntag, wie place_hours.weekday und isodow-1 in
// den Datenbankfunktionen (siehe supabase/migrations/0002_functions.sql).
export const WOCHENTAG_KUERZEL = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export type ArbeitszeitenAuswahl =
  | { preset: "werktags" | "werktags_sa" | "durchgehend" }
  | { preset: "custom"; wochentage: number[]; startMin: number; endMin: number };

export type PlaceHoursZeile = {
  preset: PlaceHoursPreset;
  weekday: number;
  start_min: number;
  end_min: number;
};

export function zeitZuMinuten(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutenZuZeit(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
