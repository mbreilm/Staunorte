"use client";

import { useEffect, useState } from "react";

// Der Eintritt (dropIn) dauert 1,2 s - danach bleibt noch ein kurzer Moment,
// damit die Landung ausschwingt, bevor ausgeblendet wird.
const ANZEIGE_DAUER_MS = 1500;
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
    const ausblendTimer = setTimeout(() => setAusblenden(true), ANZEIGE_DAUER_MS);
    const fertigTimer = setTimeout(() => setFertig(true), ANZEIGE_DAUER_MS + FADE_DAUER_MS);
    return () => {
      clearTimeout(ausblendTimer);
      clearTimeout(fertigTimer);
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
          animation: splashFallen 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform-origin: center center;
        }
        @keyframes splashFallen {
          0%   { opacity: 0; transform: translateY(-260px) scale(1.1); }
          70%  { opacity: 1; transform: translateY(10px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Doppelblinzeln, startet erst nach der Landung. */
        .splash-blinzeln {
          animation: splashBlinzeln 2.5s infinite ease-in-out;
          animation-delay: 1.2s;
          transform-box: fill-box;
          transform-origin: center center;
        }
        @keyframes splashBlinzeln {
          0%, 82%, 90%, 100% { transform: scaleY(1); }
          86%, 94%           { transform: scaleY(0.05); }
        }

        /* Neugieriges Umherschauen: links, rechts, oben, zurück zur Mitte. */
        .splash-schauen {
          animation: splashSchauen 6s infinite ease-in-out;
          animation-delay: 1.2s;
        }
        @keyframes splashSchauen {
          0%, 100%  { transform: translate(0px, 0px); }
          15%, 30%  { transform: translate(-5px, -1px); }
          45%, 60%  { transform: translate(5px, -1px); }
          75%, 85%  { transform: translate(0px, -4px); }
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
        {/* Bauhelm */}
        <g>
          <path d="M 55 180 C 55 60, 245 60, 245 180 Z" fill="#FFB703" />
          {/* Licht-Highlight */}
          <path d="M 80 145 C 85 90, 140 75, 185 75 C 145 79, 90 100, 80 145 Z" fill="#FFE066" />
          {/* Mittelgrat */}
          <path d="M 136 67 C 142 54, 158 54, 164 67 L 161 170 L 139 170 Z" fill="#FB8500" />
          {/* Stirn-Plakette */}
          <rect x="138" y="148" width="24" height="15" rx="3" fill="#E07A00" />
          {/* Krempe */}
          <path
            d="M 30 180 Q 150 160 270 180 C 280 187, 270 196, 255 194 Q 150 174 45 194 C 30 196, 20 187, 30 180 Z"
            fill="#E07A00"
          />
          <path
            d="M 35 180 Q 150 162 265 180 C 273 185, 263 192, 250 190 Q 150 172 50 190 C 37 192, 27 185, 35 180 Z"
            fill="#FFB703"
          />
        </g>

        {/* Fernglas */}
        <g className="splash-fernglas">
          {/* Verbindungssteg */}
          <rect x="135" y="152" width="30" height="12" rx="4" fill="#0F172A" />

          {/* Linker Tubus */}
          <rect x="78" y="136" width="56" height="54" rx="14" fill="#1E293B" />
          <rect x="74" y="134" width="64" height="10" rx="4" fill="#0F172A" />
          <circle cx="106" cy="163" r="21" fill="#FFFFFF" />
          <circle cx="106" cy="163" r="18" fill="#E2E8F0" />

          {/* Rechter Tubus */}
          <rect x="166" y="136" width="56" height="54" rx="14" fill="#1E293B" />
          <rect x="162" y="134" width="64" height="10" rx="4" fill="#0F172A" />
          <circle cx="194" cy="163" r="21" fill="#FFFFFF" />
          <circle cx="194" cy="163" r="18" fill="#E2E8F0" />

          {/* Augen */}
          <g className="splash-blinzeln">
            <g className="splash-schauen">
              <circle cx="106" cy="163" r="8" fill="#0F172A" />
              <circle cx="103" cy="160" r="2.8" fill="#FFFFFF" />
              <circle cx="194" cy="163" r="8" fill="#0F172A" />
              <circle cx="191" cy="160" r="2.8" fill="#FFFFFF" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
