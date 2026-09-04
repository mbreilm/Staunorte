"use client";

import { AuthForm } from "./AuthForm";

type Props = {
  /** Begründungstext, z. B. "Damit wir wissen, wer was gesehen hat."
   *  null = Sheet ist geschlossen. */
  reason: string | null;
  onClose: () => void;
};

/**
 * Freundliches Bottom-Sheet: erscheint erst, wenn jemand ohne Konto etwas
 * beitragen will (Ort erfassen, Check-in). Lesen bleibt immer ohne Konto
 * möglich - dieses Sheet blockiert also nie den ersten Eindruck der App.
 */
export function AuthGateSheet({ reason, onClose }: Props) {
  if (!reason) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 pb-8 shadow-xl sm:rounded-3xl">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-200 sm:hidden"
        />
        <h2 className="text-lg font-bold text-zinc-900">
          Dafür brauchst du ein Konto
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{reason}</p>

        <div className="mt-5">
          <AuthForm />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-sm font-medium text-zinc-500"
        >
          Vielleicht später
        </button>
      </div>
    </div>
  );
}
