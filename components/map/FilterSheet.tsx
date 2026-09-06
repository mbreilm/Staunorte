"use client";

import type { ObservableType } from "@/lib/supabase/types";
import { FahrzeugChips } from "@/components/erfassen/FahrzeugChips";
import { IconHaken } from "@/lib/icons";

const RADIUS_OPTIONEN_M = [1000, 3000, 10000];

type Props = {
  radiusUeberschreibungM: number | null;
  onRadiusWaehlen: (m: number) => void;
  nurAktiv: boolean;
  onNurAktivToggle: () => void;
  nurFahrzeugeSichtbar: boolean;
  onNurFahrzeugeSichtbarToggle: () => void;
  typen: ObservableType[];
  ausgewaehlteTypIds: string[];
  onTypToggle: (id: string) => void;
  onSchliessen: () => void;
};

/**
 * Volle Filter-Ansicht über der Karte (Claude-Design-Projekt "Staunorte",
 * Screen `isFilter`) - kein eigener Dialog/Sheet-Layer, weil das Original
 * ebenfalls einen eigenen Screen statt eines Bottom-Sheets nutzt.
 */
export function FilterSheet({
  radiusUeberschreibungM,
  onRadiusWaehlen,
  nurAktiv,
  onNurAktivToggle,
  nurFahrzeugeSichtbar,
  onNurFahrzeugeSichtbarToggle,
  typen,
  ausgewaehlteTypIds,
  onTypToggle,
  onSchliessen,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-4 pb-10"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="mb-3.5 flex items-center justify-between">
        <h4 className="m-0">Filter</h4>
        <button type="button" className="btn btn-ghost text-sm" onClick={onSchliessen}>
          Fertig
        </button>
      </div>

      <h6 className="mb-2" style={{ color: "var(--color-neutral-700)" }}>
        Umkreis
      </h6>
      <div className="mb-5 flex gap-2">
        {RADIUS_OPTIONEN_M.map((m) => {
          const aktiv = radiusUeberschreibungM === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onRadiusWaehlen(m)}
              className="btn h-[46px] flex-1 rounded-full text-[15px]"
              style={
                aktiv
                  ? {
                      background: "var(--color-accent)",
                      color: "var(--color-bg)",
                      border: "1.5px solid var(--color-accent)",
                    }
                  : { border: "1.5px solid var(--color-neutral-300)" }
              }
            >
              {m / 1000} km
            </button>
          );
        })}
      </div>

      <h6 className="mb-2" style={{ color: "var(--color-neutral-700)" }}>
        Nur zeigen wenn
      </h6>
      <div className="mb-5 flex flex-col gap-2.5">
        <FilterSchalterZeile
          label="Jetzt vermutlich aktiv"
          hinweis="in den Arbeitszeiten oder im beobachteten Peak"
          aktiv={nurAktiv}
          onClick={onNurAktivToggle}
        />
        <FilterSchalterZeile
          label="Fahrzeuge aktuell gesehen"
          hinweis={'mindestens ein Fahrzeug „jetzt hier"'}
          aktiv={nurFahrzeugeSichtbar}
          onClick={onNurFahrzeugeSichtbarToggle}
        />
      </div>

      <h6 className="mb-2" style={{ color: "var(--color-neutral-700)" }}>
        Fahrzeugtyp
      </h6>
      <FahrzeugChips typen={typen} ausgewaehlt={ausgewaehlteTypIds} onToggle={onTypToggle} />
    </div>
  );
}

function FilterSchalterZeile({
  label,
  hinweis,
  aktiv,
  onClick,
}: {
  label: string;
  hinweis: string;
  aktiv: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left"
      style={{
        border: `1.5px solid ${aktiv ? "var(--color-accent-2-400)" : "var(--color-neutral-300)"}`,
        background: aktiv ? "var(--color-accent-2-100)" : "var(--color-bg)",
      }}
    >
      <span className="flex flex-col gap-0.5">
        <b className="text-[14.5px]">{label}</b>
        <span className="text-muted text-[12.5px]">{hinweis}</span>
      </span>
      <span
        aria-hidden="true"
        className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full"
        style={{ background: aktiv ? "var(--color-accent-2-600)" : "var(--color-neutral-300)" }}
      >
        {aktiv && <IconHaken size={16} color="var(--color-bg)" stroke={2.75} />}
      </span>
    </button>
  );
}
