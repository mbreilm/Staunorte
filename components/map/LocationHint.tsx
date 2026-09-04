"use client";

type Props = {
  onUseLocation: () => void;
  onDismiss: () => void;
};

/**
 * Erklärender Hinweis, BEVOR der Browser nach dem Standort fragt - nie
 * sofort beim Laden. Blockiert die Karte nicht: sie bleibt darunter sicht-
 * und bedienbar, ein "Nicht jetzt" führt in keine Sackgasse.
 */
export function LocationHint({ onUseLocation, onDismiss }: Props) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center p-4"
      style={{ bottom: "max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))" }}
    >
      <div className="dialog elev-lg pointer-events-auto w-full max-w-md animate-[stRise_250ms_ease-out]">
        <p className="dialog-body">
          Wir zeigen dir gern Baustellen in deiner Nähe. Dafür brauchen wir
          kurz deinen Standort.
        </p>
        <div className="dialog-actions justify-stretch">
          <button type="button" onClick={onUseLocation} className="btn btn-primary flex-1">
            Standort verwenden
          </button>
          <button type="button" onClick={onDismiss} className="btn btn-ghost">
            Nicht jetzt
          </button>
        </div>
      </div>
    </div>
  );
}
