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
          {gruppe && (
            <p className="mb-2 text-xs font-medium text-zinc-500">{gruppe}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {gruppenTypen.map((typ) => {
              const aktiv = ausgewaehlt.includes(typ.id);
              return (
                <button
                  key={typ.id}
                  type="button"
                  onClick={() => onToggle(typ.id)}
                  aria-pressed={aktiv}
                  className={`flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                    aktiv
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  <span aria-hidden="true">{typ.icon}</span>
                  {typ.name_de}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
