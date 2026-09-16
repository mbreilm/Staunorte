"use client";

import { useState } from "react";

/**
 * Baustelle mit Freunden teilen.
 *
 * Auf dem Handy öffnet sich das Teilen-Menü des Systems - also WhatsApp,
 * Nachrichten, AirDrop, was auch immer dort eingerichtet ist. Genau das
 * ist der Weg, auf dem so eine App tatsächlich weitergegeben wird.
 *
 * Wo es dieses Menü nicht gibt (die meisten Desktop-Browser), wandert der
 * Link in die Zwischenablage und der Knopf sagt kurz Bescheid. Keine
 * Sackgasse, kein Dialog, der erklärt, was nicht geht.
 */
export function TeilenButton({ titel }: { titel: string }) {
  const [hinweis, setHinweis] = useState<"kopiert" | "fehler" | null>(null);

  async function teilen() {
    // Erst beim Klick lesen, nicht beim Rendern: Auf dem Server gibt es
    // kein window, und die Adresse kann sich durch Navigation ändern.
    const adresse = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: titel, url: adresse });
        return;
      } catch {
        // Abgebrochen oder abgelehnt - dann still zum Kopieren übergehen.
      }
    }

    try {
      await navigator.clipboard.writeText(adresse);
      setHinweis("kopiert");
    } catch {
      setHinweis("fehler");
    }
    setTimeout(() => setHinweis(null), 2500);
  }

  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={teilen}
        className="btn btn-secondary w-full"
        aria-label={`${titel} teilen`}
      >
        <TeilenSymbol />
        {hinweis === "kopiert" ? "Link kopiert" : "Teilen"}
      </button>
      {hinweis === "fehler" && (
        <p role="alert" className="mt-1 text-xs" style={{ color: "var(--color-accent-700)" }}>
          Kopieren hat nicht geklappt — du kannst die Adresse aus der
          Adresszeile nehmen.
        </p>
      )}
    </div>
  );
}

function TeilenSymbol() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}
