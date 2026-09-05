"use client";

import type { ObservableType } from "@/lib/supabase/types";

type Props = {
  typen: ObservableType[];
  ausgewaehlt: string[];
  onToggle: (id: string) => void;
};

/**
 * Chip-Auswahl der Fahrzeugtypen, gruppiert nach group_name - die Gruppen
 * kommen aus der Datenbank, keine hartkodierten Kategorien (CLAUDE.md
 * Regel 2).
 */
export function FahrzeugChips({ typen, ausgewaehlt, onToggle }: Props) {
  const gruppen = new Map<string, ObservableType[]>();
  for (const typ of typen) {
    const gruppe = typ.group_name ?? "";
    if (!gruppen.has(gruppe)) gruppen.set(gruppe, []);
    gruppen.get(gruppe)!.push(typ);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...gruppen.entries()].map(([gruppe, gruppenTypen]) => (
        <div key={gruppe}>
          {gruppe && <h6 className="mb-2">{gruppe}</h6>}
          <div className="flex flex-wrap gap-2">
            {gruppenTypen.map((typ) => {
              const aktiv = ausgewaehlt.includes(typ.id);
              return (
                <button
                  key={typ.id}
                  type="button"
                  onClick={() => onToggle(typ.id)}
                  aria-pressed={aktiv}
                  className="btn min-h-11 gap-2 pl-1.5 pr-3.5"
                  style={
                    aktiv
                      ? { background: "var(--color-accent-100)", color: "var(--color-accent-800)", border: "2px solid var(--color-accent-300)" }
                      : { border: "2px solid var(--color-divider)" }
                  }
                >
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: aktiv ? "var(--color-accent-200)" : "var(--color-neutral-200)" }}
                  >
                    {typ.icon}
                  </span>
                  <b className="text-[13.5px]">{typ.name_de}</b>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
