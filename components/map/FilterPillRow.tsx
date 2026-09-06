"use client";

type Props = {
  radiusLabel: string;
  nurAktiv: boolean;
  onNurAktivToggle: () => void;
  onFilterOeffnen: () => void;
  typFilterLabel: string | null;
};

/**
 * Pill-Reihe am oberen Kartenrand (Claude-Design-Projekt "Staunorte", Map-
 * Screen): Umkreis+Filter-Button, Schnell-Umschalter "Jetzt aktiv" und - nur
 * wenn eine Fahrzeugtyp-Auswahl aktiv ist - eine Zusammenfassung davon.
 */
export function FilterPillRow({
  radiusLabel,
  nurAktiv,
  onNurAktivToggle,
  onFilterOeffnen,
  typFilterLabel,
}: Props) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex gap-2 overflow-x-auto p-4"
      style={{ top: "env(safe-area-inset-top)" }}
    >
      <button
        type="button"
        onClick={onFilterOeffnen}
        className="btn elev-sm pointer-events-auto flex-none rounded-full text-[13.5px]"
        style={{ height: 40, background: "var(--color-bg)", padding: "0 16px" }}
      >
        {radiusLabel} · Filter
      </button>
      <button
        type="button"
        onClick={onNurAktivToggle}
        aria-pressed={nurAktiv}
        className="btn elev-sm pointer-events-auto flex-none rounded-full text-[13.5px]"
        style={{
          height: 40,
          padding: "0 16px",
          background: nurAktiv ? "var(--color-accent-2-600)" : "var(--color-bg)",
          color: nurAktiv ? "var(--color-bg)" : "var(--color-text)",
        }}
      >
        Jetzt aktiv
      </button>
      {typFilterLabel && (
        <button
          type="button"
          onClick={onFilterOeffnen}
          className="btn elev-sm pointer-events-auto flex-none rounded-full text-[13.5px]"
          style={{ height: 40, background: "var(--color-bg)", padding: "0 16px" }}
        >
          {typFilterLabel}
        </button>
      )}
    </div>
  );
}
