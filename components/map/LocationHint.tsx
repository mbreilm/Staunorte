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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <p className="text-sm text-zinc-700">
          Wir zeigen dir gern Baustellen in deiner Nähe. Dafür brauchen wir
          kurz deinen Standort.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onUseLocation}
            className="h-11 flex-1 rounded-xl bg-orange-500 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Standort verwenden
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="h-11 rounded-xl px-4 text-sm font-medium text-zinc-500"
          >
            Nicht jetzt
          </button>
        </div>
      </div>
    </div>
  );
}
