import type { ArbeitszeitenAuswahl, PlaceHoursZeile } from "./typen";

const UEBLICHE_BAUZEIT = { start_min: 420, end_min: 960 }; // 07:00-16:00
const SAMSTAG = { start_min: 480, end_min: 780 }; // 08:00-13:00

/** Wandelt eine Auswahl (Preset-Kachel oder eigene Zeiten) in place_hours-Zeilen um. */
export function baueZeilen(auswahl: ArbeitszeitenAuswahl): PlaceHoursZeile[] {
  switch (auswahl.preset) {
    case "werktags":
      return [0, 1, 2, 3, 4].map((weekday) => ({
        preset: "werktags",
        weekday,
        ...UEBLICHE_BAUZEIT,
      }));
    case "werktags_sa":
      return [
        ...[0, 1, 2, 3, 4].map((weekday) => ({
          preset: "werktags_sa" as const,
          weekday,
          ...UEBLICHE_BAUZEIT,
        })),
        { preset: "werktags_sa" as const, weekday: 5, ...SAMSTAG },
      ];
    case "durchgehend":
      return [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        preset: "durchgehend",
        weekday,
        start_min: 0,
        end_min: 1440,
      }));
    case "custom":
      return auswahl.wochentage.map((weekday) => ({
        preset: "custom",
        weekday,
        start_min: auswahl.startMin,
        end_min: auswahl.endMin,
      }));
  }
}
