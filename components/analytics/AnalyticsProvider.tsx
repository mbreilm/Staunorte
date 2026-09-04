"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const SCHLUESSEL_CONSENT = "baustellenjaeger:analytics-consent";

/**
 * Consent-Banner + bedingtes Laden von Plausible (T15). Plausible verwendet
 * keine Cookies und keine personenbezogenen Daten, das Ticket verlangt aber
 * trotzdem ausdrücklich einen Consent-Banner - der wird hier unabhängig von
 * dieser Diskussion einfach gebaut.
 */
export function AnalyticsProvider() {
  const [consent, setConsent] = useState<"ja" | "nein" | null>(null);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    let gespeichert: string | null = null;
    try {
      gespeichert = window.localStorage.getItem(SCHLUESSEL_CONSENT);
    } catch {
      // Kein Storage-Zugriff - Banner zeigt sich dann bei jedem Besuch erneut.
    }
    // Reine Übernahme von localStorage in State beim Einhängen, kein async
    // Umweg möglich - siehe components/Onboarding.tsx für dieselbe Begründung.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (gespeichert === "ja" || gespeichert === "nein") setConsent(gespeichert);
    setBereit(true);
  }, []);

  function entscheiden(wert: "ja" | "nein") {
    try {
      window.localStorage.setItem(SCHLUESSEL_CONSENT, wert);
    } catch {
      // s.o.
    }
    setConsent(wert);
  }

  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  return (
    <>
      {consent === "ja" && domain && (
        <Script
          defer
          data-domain={domain}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      )}

      {bereit && consent === null && (
        <div
          className="fixed inset-x-0 z-50 flex justify-center p-4"
          style={{ bottom: "max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))" }}
        >
          <div className="dialog elev-lg w-full max-w-md">
            <p className="dialog-body">
              Wir nutzen datenschutzfreundliche Analyse (Plausible) ohne
              Cookies und ohne personenbezogene Daten, um die App zu
              verbessern.
            </p>
            <div className="dialog-actions justify-stretch">
              <button type="button" onClick={() => entscheiden("ja")} className="btn btn-primary flex-1 text-xs">
                Einverstanden
              </button>
              <button type="button" onClick={() => entscheiden("nein")} className="btn btn-ghost text-xs">
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
