// Aktivitätstexte für die Detailseite - immer im Konjunktiv, nie als
// Zusage (CLAUDE.md Design-Leitplanken). Andere Stellen (z. B. die
// Kartenvorschau) formulieren das je nach Platzbedarf anders; hier gilt
// exakt der Wortlaut aus docs/TICKETS.md T6.
import type { ActivityState } from "@/lib/supabase/types";

export const AKTIVITAETS_TEXT_DETAIL: Record<ActivityState, string> = {
  aktiv: "Jetzt vermutlich aktiv",
  ruhe: "Jetzt vermutlich Ruhe",
  unbekannt: "Zeiten unbekannt",
};

export const AKTIVITAETS_FARBE_DETAIL: Record<ActivityState, string> = {
  aktiv: "bg-green-100 text-green-800",
  ruhe: "bg-zinc-100 text-zinc-600",
  unbekannt: "bg-zinc-100 text-zinc-400",
};
