import type { createClient } from "@/lib/supabase/client";
import type { PlaceHoursZeile } from "./typen";

/**
 * Ersetzt die Arbeitszeiten eines Ortes (TICKETS.md T10: "beim Ändern
 * werden die alten Zeilen ersetzt"). RLS erlaubt jedem angemeldeten
 * Nutzer Insert/Delete auf place_hours (PRD 6.5) - keine eigene
 * Datenbankfunktion nötig, anders als bei sicherheitsrelevanter Logik
 * wie Check-in/Ortserfassung (CLAUDE.md Regel 5).
 */
export async function speicherArbeitszeiten(
  supabase: ReturnType<typeof createClient>,
  placeId: string,
  zeilen: PlaceHoursZeile[],
): Promise<{ ok: true } | { ok: false; fehler: string }> {
  const { error: loeschFehler } = await supabase
    .from("place_hours")
    .delete()
    .eq("place_id", placeId);
  if (loeschFehler) return { ok: false, fehler: loeschFehler.message };

  if (zeilen.length === 0) return { ok: true };

  const { error: einfuegeFehler } = await supabase
    .from("place_hours")
    .insert(zeilen.map((zeile) => ({ ...zeile, place_id: placeId })));
  if (einfuegeFehler) return { ok: false, fehler: einfuegeFehler.message };

  return { ok: true };
}
