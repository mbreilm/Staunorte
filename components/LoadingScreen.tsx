"use client";

import { useEffect, useState } from "react";

// Zeitbudget des Splashs - alles muss in diese Spanne passen, sonst spielt
// die Animation ins Leere. Die Abschnitte überlappen bewusst NICHT:
// Blinzeln bei geschlossenen Augen würde den Blick zur Seite verdecken.
//   0,00-0,55 s  Fernglas fällt herab und federt
//   0,62-0,79 s  Doppelblinzeln (Augen noch in Mittelstellung)
//   0,84-1,08 s  Blick nach links
//   1,35-1,60 s  Blick nach rechts
//   ab 1,70 s    Ausblenden
const ANZEIGE_DAUER_MS = 1700;
const FADE_DAUER_MS = 250;

/**
 * Kurzer Splash beim (Neu-)Laden der App - reines CSS/SVG, kein WebGL.
 * Läuft bei JEDEM frischen Laden ohne localStorage-Gate: Next.js mountet
 * das Root-Layout (und damit diese Komponente) ohnehin nur bei einem
 * echten Seiten-(Neu-)Laden neu, nicht bei Tab-Wechseln innerhalb der App.
 *
 * Motiv: Bauhelm mit Fernglas - das Fernglas fällt von oben herab, danach
 * schauen die Augen neugierig umher und blinzeln. Die Klassennamen sind
 * mit "splash-" vorangestellt, damit sie sich nicht mit App-Styles beißen.
 */
export function LoadingScreen() {
  const [ausblenden, setAusblenden] = useState(false);
  const [fertig, setFertig] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const ausblendTimer = setTimeout(() => setAusblenden(true), ANZEIGE_DAUER_MS);
    const fertigTimer = setTimeout(() => setFertig(true), ANZEIGE_DAUER_MS + FADE_DAUER_MS);

    // Rettungsleine. Der Splash liegt als deckende Fläche über der ganzen
    // App und schluckt jede Berührung - solange er steht, ist die App
    // unbedienbar. Verlässt man sich allein auf setTimeout, kann er genau
    // dort hängen bleiben, wo es am meisten schadet: Browser drosseln oder
    // frieren Timer in Hintergrund-Tabs ein. Auf dem iPhone passiert das
    // beim Sperren des Geräts, und beim Entsperren stand der Splash noch.
    //
    // Deshalb wird beim Zurückkommen nicht auf einen Timer vertraut,
    // sondern die tatsächlich verstrichene Zeit gemessen. Ist die Spanne
    // vorbei, verschwindet der Splash sofort.
    function nachholen() {
      if (document.visibilityState !== "visible") return;
      const verstrichen = Date.now() - start;
      if (verstrichen >= ANZEIGE_DAUER_MS) setAusblenden(true);
      if (verstrichen >= ANZEIGE_DAUER_MS + FADE_DAUER_MS) setFertig(true);
    }

    document.addEventListener("visibilitychange", nachholen);
    // pageshow zusätzlich: Beim Zurückspringen aus dem Vor-/Zurück-Zwischen-
    // speicher wird die Seite fortgesetzt, ohne dass visibilitychange feuert.
    window.addEventListener("pageshow", nachholen);

    return () => {
      clearTimeout(ausblendTimer);
      clearTimeout(fertigTimer);
      document.removeEventListener("visibilitychange", nachholen);
      window.removeEventListener("pageshow", nachholen);
    };
  }, []);

  if (fertig) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center transition-opacity"
      style={{
        background: "var(--color-bg)",
        opacity: ausblenden ? 0 : 1,
        transitionDuration: `${FADE_DAUER_MS}ms`,
        pointerEvents: ausblenden ? "none" : "auto",
      }}
    >
      <style>{`
        .splash-logo {
          width: min(72vw, 300px);
          height: auto;
          overflow: visible;
        }

        /* Fernglas fliegt von oben herab und federt beim Aufsetzen nach. */
        .splash-fernglas {
          animation: splashFallen 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform-origin: center center;
        }
        @keyframes splashFallen {
          0%   { opacity: 0; transform: translateY(-260px) scale(1.1); }
          70%  { opacity: 1; transform: translateY(10px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Doppelblinzeln. Liegt bewusst ganz am Anfang des Zyklus statt am
           Ende - sonst käme das erste Blinzeln erst nach dem Ausblenden.
           Es ist durch, bevor der Blick zur Seite beginnt (siehe oben). */
        .splash-blinzeln {
          animation: splashBlinzeln 1.5s infinite ease-in-out;
          animation-delay: 0.55s;
          transform-box: fill-box;
          transform-origin: center center;
        }
        @keyframes splashBlinzeln {
          0%, 2%, 9%, 16%, 100% { transform: scaleY(1); }
          5%, 12%               { transform: scaleY(0.05); }
        }

        /* Neugieriges Umherschauen: links, rechts, oben, zurück zur Mitte.
           Links und rechts fallen in die Anzeigedauer, der Blick nach oben
           gehört schon zur Schleife danach. */
        .splash-schauen {
          animation: splashSchauen 1.9s infinite ease-in-out;
          animation-delay: 0.55s;
        }
        @keyframes splashSchauen {
          0%, 100%  { transform: translate(0px, 0px); }
          15%, 28%  { transform: translate(-5px, -1px); }
          42%, 55%  { transform: translate(5px, -1px); }
          70%, 80%  { transform: translate(0px, -4px); }
        }
      `}</style>

      <svg
        className="splash-logo"
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Baustellenjäger"
      >
        {/* Bauhelm. Farben aus der Akzent-Skala in app/globals.css
            (--color-accent-300 bis -700) statt aus dem Signalgelb der
            Vorlage - der Splash soll wie der Rest der App aussehen. */}
        <g>
          <path d="M 55 180 C 55 60, 245 60, 245 180 Z" fill="#d67f48" />
          {/* Licht-Highlight */}
          <path d="M 80 145 C 85 90, 140 75, 185 75 C 145 79, 90 100, 80 145 Z" fill="#ffc6a5" />
          {/* Mittelgrat */}
          <path d="M 136 67 C 142 54, 158 54, 164 67 L 161 170 L 139 170 Z" fill="#b2622d" />
          {/* Stirn-Plakette */}
          <rect x="138" y="148" width="24" height="15" rx="3" fill="#8c491a" />
          {/* Krempe */}
          <path
            d="M 30 180 Q 150 160 270 180 C 280 187, 270 196, 255 194 Q 150 174 45 194 C 30 196, 20 187, 30 180 Z"
            fill="#b2622d"
          />
          <path
            d="M 35 180 Q 150 162 265 180 C 273 185, 263 192, 250 190 Q 150 172 50 190 C 37 192, 27 185, 35 180 Z"
            fill="#d67f48"
          />
        </g>

        {/* Fernglas. Gehäuse in den warmen Neutraltönen der App
            (--color-text bzw. --color-neutral-800/-300/-100), nicht im
            bläulichen Slate der Vorlage. */}
        <g className="splash-fernglas">
          {/* Verbindungssteg */}
          <rect x="135" y="152" width="30" height="12" rx="4" fill="#201e1d" />

          {/* Linker Tubus */}
          <rect x="78" y="136" width="56" height="54" rx="14" fill="#474238" />
          <rect x="74" y="134" width="64" height="10" rx="4" fill="#201e1d" />
          <circle cx="106" cy="163" r="21" fill="#f9f4ed" />
          <circle cx="106" cy="163" r="18" fill="#dcd3c4" />

          {/* Rechter Tubus */}
          <rect x="166" y="136" width="56" height="54" rx="14" fill="#474238" />
          <rect x="162" y="134" width="64" height="10" rx="4" fill="#201e1d" />
          <circle cx="194" cy="163" r="21" fill="#f9f4ed" />
          <circle cx="194" cy="163" r="18" fill="#dcd3c4" />

          {/* Augen */}
          <g className="splash-blinzeln">
            <g className="splash-schauen">
              <circle cx="106" cy="163" r="8" fill="#201e1d" />
              <circle cx="103" cy="160" r="2.8" fill="#f9f4ed" />
              <circle cx="194" cy="163" r="8" fill="#201e1d" />
              <circle cx="191" cy="160" r="2.8" fill="#f9f4ed" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
