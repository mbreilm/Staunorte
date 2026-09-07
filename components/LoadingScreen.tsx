"use client";

import { useEffect, useState } from "react";

const ANZEIGE_DAUER_MS = 1200; // Eintritt (0.8s) + kurzer Schweb-Moment (0.4s)
const FADE_DAUER_MS = 250;

/**
 * Kurzer Splash beim (Neu-)Laden der App - reines CSS/SVG, kein WebGL.
 * Läuft bei JEDEM frischen Laden ohne localStorage-Gate: Next.js mountet
 * das Root-Layout (und damit diese Komponente) ohnehin nur bei einem
 * echten Seiten-(Neu-)Laden neu, nicht bei Tab-Wechseln innerhalb der App.
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
        .splash-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation:
            splashEintritt 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards,
            splashSchweben 0.8s ease-in-out 0.8s infinite alternate;
        }
        .splash-logo { width: 140px; height: 160px; overflow: visible; }
        .splash-auge { transform-origin: 100px 105px; animation: splashAugenpuls 0.8s ease-in-out infinite; }
        .splash-schatten {
          width: 70px;
          height: 12px;
          background: rgba(122, 114, 101, 0.22);
          border-radius: 50%;
          margin-top: 15px;
          animation: splashSchattenpuls 0.8s ease-in-out 0.8s infinite alternate;
        }
        @keyframes splashEintritt {
          0% { opacity: 0; transform: translateY(120px) scale(0.3); }
          70% { opacity: 1; transform: translateY(-20px) scale(1.08); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes splashSchweben {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-32px) scale(1.03); }
        }
        @keyframes splashSchattenpuls {
          0% { transform: scale(1); opacity: 0.28; }
          100% { transform: scale(0.45); opacity: 0.08; }
        }
        @keyframes splashAugenpuls {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>

      <div className="splash-wrapper">
        <svg className="splash-logo" viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Standort-Pin */}
          <path
            d="M 100 210 C 20 120 20 60 100 60 C 180 60 180 120 100 210 Z"
            fill="#9EC678"
          />
          {/* Innerer Kreis */}
          <circle className="splash-auge" cx="100" cy="105" r="22" fill="#E8F5CF" />
          {/* Bauhelm */}
          <g>
            <path d="M 30 65 A 70 70 0 0 1 170 65 Z" fill="#D36B31" />
            <path
              d="M 18 63 C 18 63, 100 70, 182 63 C 186 63, 186 71, 180 72 C 150 78, 50 78, 20 72 C 14 71, 14 63, 18 63 Z"
              fill="#C25A20"
            />
            <path d="M 88 12 C 88 12, 100 8, 112 12 L 110 65 L 90 65 Z" fill="#D36B31" />
            <rect x="86" y="38" width="28" height="18" rx="4" fill="#B85721" />
          </g>
        </svg>
        <div className="splash-schatten" />
      </div>
    </div>
  );
}
