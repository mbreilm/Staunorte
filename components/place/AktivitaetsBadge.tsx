import type { ActivityState } from "@/lib/supabase/types";

// Farb-Pille mit Punkt statt der generischen .tag-Klasse - so wie im
// Claude-Design-Projekt "Staunorte" (Kartenvorschau + Detailseite nutzen
// dieselbe Pille). Wortlaut kommt weiterhin von den Aufrufern (Konjunktiv,
// siehe CLAUDE.md Design-Leitplanken), hier geht es nur um die Optik.
const PUNKT_FARBE: Record<ActivityState, string> = {
  aktiv: "var(--color-accent-2-600)",
  ruhe: "var(--color-neutral-500)",
  unbekannt: "var(--color-neutral-500)",
};
const HINTERGRUND_FARBE: Record<ActivityState, string> = {
  aktiv: "var(--color-accent-2-200)",
  ruhe: "var(--color-neutral-200)",
  unbekannt: "var(--color-neutral-200)",
};
const TEXT_FARBE: Record<ActivityState, string> = {
  aktiv: "var(--color-accent-2-800)",
  ruhe: "var(--color-neutral-700)",
  unbekannt: "var(--color-neutral-700)",
};

export function AktivitaetsBadge({
  zustand,
  text,
}: {
  zustand: ActivityState;
  text: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
      style={{ background: HINTERGRUND_FARBE[zustand] }}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 flex-none rounded-full"
        style={{ background: PUNKT_FARBE[zustand] }}
      />
      <span className="text-xs font-bold" style={{ color: TEXT_FARBE[zustand] }}>
        {text}
      </span>
    </span>
  );
}
