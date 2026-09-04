// Leitet aus place_activity (7×24-Raster, siehe PRD 6.5) die
// dominante "meist was los"-Kombination aus Wochentag-Gruppe und
// Tageszeit ab. Die Bucket-Grenzen sind nicht im Ticket vorgegeben -
// hier bewusst grob gewählt (4 Tageszeiten × werktags/Wochenende).
import type { PlaceActivity } from "@/lib/supabase/types";

type ZeitfensterId = "nachts" | "vormittags" | "nachmittags" | "abends";
const ZEITFENSTER: { id: ZeitfensterId; von: number; bis: number }[] = [
  { id: "nachts", von: 0, bis: 6 },
  { id: "vormittags", von: 6, bis: 12 },
  { id: "nachmittags", von: 12, bis: 18 },
  { id: "abends", von: 18, bis: 24 },
];

type WochentagGruppeId = "werktags" | "wochenende";
const WOCHENTAG_GRUPPEN: { id: WochentagGruppeId; text: string; tage: number[] }[] = [
  { id: "werktags", text: "werktags", tage: [0, 1, 2, 3, 4] },
  { id: "wochenende", text: "am Wochenende", tage: [5, 6] },
];

export type BeobachtetesMuster = { text: string; gesamtBesuche: number };

export function leiteMusterAb(zeilen: PlaceActivity[]): BeobachtetesMuster | null {
  const gesamtBesuche = zeilen.reduce((s, z) => s + z.active_count + z.quiet_count, 0);
  if (gesamtBesuche === 0) return null;

  let bestesAktiv = 0;
  let besteKombi: { gruppe: (typeof WOCHENTAG_GRUPPEN)[number]; fenster: (typeof ZEITFENSTER)[number] } | null =
    null;

  for (const gruppe of WOCHENTAG_GRUPPEN) {
    for (const fenster of ZEITFENSTER) {
      const aktiv = zeilen
        .filter(
          (z) =>
            gruppe.tage.includes(z.weekday) && z.hour >= fenster.von && z.hour < fenster.bis,
        )
        .reduce((s, z) => s + z.active_count, 0);

      if (aktiv > bestesAktiv) {
        bestesAktiv = aktiv;
        besteKombi = { gruppe, fenster };
      }
    }
  }

  if (!besteKombi) return null;

  return {
    text: `Meist was los: ${besteKombi.gruppe.text} ${besteKombi.fenster.id} · aus ${gesamtBesuche} Besuchen`,
    gesamtBesuche,
  };
}
