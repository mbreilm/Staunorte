"use client";

import { useState } from "react";
import type { ObservableType } from "@/lib/supabase/types";
import { GruppenIcon } from "@/components/icons/GruppenIcon";
import { FahrzeugDetailSheet } from "@/components/fahrzeug/FahrzeugDetailSheet";
import { fahrzeugBildUrl } from "@/lib/fahrzeugbild";
import { IconErklaerung } from "@/lib/icons";

type Props = {
  typen: ObservableType[];
  ausgewaehlt: string[];
  onToggle: (id: string) => void;
};

/**
 * Chip-Auswahl der Fahrzeugtypen, gruppiert nach group_name - die Gruppen
 * kommen aus der Datenbank, keine hartkodierten Kategorien (CLAUDE.md
 * Regel 2).
 *
 * Jeder Chip zeigt das Katalogfoto (Gruppen-Icon nur als Rückfall, solange
 * kein Foto hinterlegt ist) und daneben ein Info-Symbol, das den Steckbrief
 * öffnet: Gruppen-Icons allein reichen nicht, um z. B. Straßenfertiger und
 * Straßenfräse auseinanderzuhalten.
 */
export function FahrzeugChips({ typen, ausgewaehlt, onToggle }: Props) {
  const [detail, setDetail] = useState<ObservableType | null>(null);

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
              const bildUrl = fahrzeugBildUrl(typ.image_path);
              return (
                // Auswahl und Info sind zwei getrennte Schaltflächen - ein
                // Button im Button wäre ungültiges HTML. Die Pillenoptik
                // trägt deshalb der Rahmen drumherum.
                <div
                  key={typ.id}
                  className="flex items-center rounded-full"
                  style={
                    aktiv
                      ? { background: "var(--color-accent-100)", color: "var(--color-accent-800)", border: "2px solid var(--color-accent-300)" }
                      : { border: "2px solid var(--color-divider)" }
                  }
                >
                  <button
                    type="button"
                    onClick={() => onToggle(typ.id)}
                    aria-pressed={aktiv}
                    className="flex min-h-11 items-center gap-2 rounded-full py-1 pl-1.5 pr-2"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full"
                      style={{ background: aktiv ? "var(--color-accent-200)" : "var(--color-neutral-200)" }}
                    >
                      {bildUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-Fotos ohne next/image-Konfiguration
                        <img
                          src={bildUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <GruppenIcon groupName={typ.group_name} size={20} />
                      )}
                    </span>
                    <b className="text-[13.5px]">{typ.name_de}</b>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetail(typ)}
                    aria-label={`Mehr über ${typ.name_de}`}
                    className="flex min-h-11 items-center rounded-full pl-1 pr-3"
                    style={{ color: "var(--color-neutral-600)" }}
                  >
                    <IconErklaerung size={17} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {detail && (
        <FahrzeugDetailSheet
          name={detail.name_de}
          groupName={detail.group_name}
          imagePath={detail.image_path}
          imageCredit={detail.image_credit}
          kidDescription={detail.kid_description}
          rarity={detail.rarity}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
