// Formatiert gespeicherte place_hours-Zeilen zu kompaktem, natürlichem
// Text ("Mo–Fr 7–16 Uhr, Sa 8–13 Uhr") - fasst aufeinanderfolgende
// Wochentage mit gleicher Zeitspanne zusammen.
import { WOCHENTAG_KUERZEL } from "@/lib/arbeitszeiten/typen";
import type { PlaceHours } from "@/lib/supabase/types";

function formatUhrzeit(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}` : `${h}:${String(m).padStart(2, "0")}`;
}

function formatSpanne(startMin: number, endMin: number): string {
  if (startMin === 0 && endMin === 1440) return "rund um die Uhr";
  return `${formatUhrzeit(startMin)}–${formatUhrzeit(endMin)} Uhr`;
}

export function formatArbeitszeiten(zeilen: PlaceHours[]): string | null {
  if (zeilen.length === 0) return null;

  const nachSpanne = new Map<string, number[]>();
  for (const zeile of zeilen) {
    const schluessel = `${zeile.start_min}-${zeile.end_min}`;
    if (!nachSpanne.has(schluessel)) nachSpanne.set(schluessel, []);
    nachSpanne.get(schluessel)!.push(zeile.weekday);
  }

  const abschnitte: { start: number; sortierung: number; text: string }[] = [];
  for (const [schluessel, tage] of nachSpanne) {
    const [startMin, endMin] = schluessel.split("-").map(Number);
    const sortiert = [...tage].sort((a, b) => a - b);
    const tageText = wochentageZuText(sortiert);
    abschnitte.push({
      start: sortiert[0],
      sortierung: sortiert[0],
      text: `${tageText} ${formatSpanne(startMin, endMin)}`,
    });
  }

  return abschnitte
    .sort((a, b) => a.sortierung - b.sortierung)
    .map((a) => a.text)
    .join(", ");
}

// Fasst z. B. [0,1,2,3,4] zu "Mo–Fr" zusammen, [0,1,2,3,4,5] zu "Mo–Sa",
// unzusammenhängende Tage einzeln mit Kommas.
function wochentageZuText(tage: number[]): string {
  const gruppen: number[][] = [];
  for (const tag of tage) {
    const letzte = gruppen.at(-1);
    if (letzte && letzte.at(-1) === tag - 1) letzte.push(tag);
    else gruppen.push([tag]);
  }
  return gruppen
    .map((gruppe) =>
      gruppe.length === 1
        ? WOCHENTAG_KUERZEL[gruppe[0]]
        : `${WOCHENTAG_KUERZEL[gruppe[0]]}–${WOCHENTAG_KUERZEL[gruppe.at(-1)!]}`,
    )
    .join(", ");
}
