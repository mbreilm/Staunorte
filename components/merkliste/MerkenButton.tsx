"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useMerkliste } from "./MerklisteProvider";

/**
 * "Merken"-Knopf: legt einen Ort auf die persönliche Merkliste oder nimmt
 * ihn wieder herunter.
 *
 * Der Zustand schaltet sofort um, bevor die Datenbank geantwortet hat -
 * ein Knopf, der eine halbe Sekunde nichts tut, fühlt sich kaputt an.
 * Scheitert der Aufruf, springt er zurück auf den alten Stand.
 */
export function MerkenButton({
  placeId,
  initialGemerkt,
  variante = "voll",
}: {
  placeId: string;
  /**
   * Serverseitig ermittelter Startwert (Detailseite). Gilt nur, solange
   * der Provider seine Liste noch nicht geladen hat - danach zaehlt die
   * gemeinsame Quelle, damit alle Anzeigen zusammenpassen.
   */
  initialGemerkt: boolean;
  /** "voll" = mit Beschriftung, "kompakt" = nur der Stern (enge Leisten). */
  variante?: "voll" | "kompakt";
}) {
  const { user, requireAuth } = useAuth();
  const { gemerkt: liste, geladen, umschalten } = useMerkliste();
  const [laeuft, setLaeuft] = useState(false);
  // Bis die gemeinsame Liste steht, gilt der serverseitige Startwert -
  // sonst blitzt der Knopf kurz im falschen Zustand auf.
  const gemerkt = geladen ? liste.has(placeId) : initialGemerkt;

  async function antippen() {
    if (!user) {
      requireAuth(
        "Zum Merken brauchst du ein Konto - sonst wüssten wir nicht, wessen Liste es ist.",
      );
      return;
    }

    setLaeuft(true);
    await umschalten(placeId);
    setLaeuft(false);
  }

  return (
    <button
      type="button"
      onClick={antippen}
      disabled={laeuft}
      aria-pressed={gemerkt}
      aria-label={gemerkt ? "Von der Merkliste nehmen" : "Auf die Merkliste setzen"}
      className={
        variante === "kompakt" ? "btn btn-icon elev-sm" : "btn btn-secondary flex-1"
      }
      style={
        gemerkt
          ? { borderColor: "var(--color-accent)", color: "var(--color-accent-800)" }
          : undefined
      }
    >
      <Stern gefuellt={gemerkt} />
      {variante === "voll" && (gemerkt ? "Gemerkt" : "Merken")}
    </button>
  );
}

function Stern({ gefuellt }: { gefuellt: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={gefuellt ? "var(--color-accent)" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
    </svg>
  );
}
