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
          className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-xs text-zinc-600">
              Wir nutzen datenschutzfreundliche Analyse (Plausible) ohne
              Cookies und ohne personenbezogene Daten, um die App zu
              verbessern.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => entscheiden("ja")}
                className="h-9 flex-1 rounded-lg bg-orange-500 text-xs font-semibold text-white"
              >
                Einverstanden
              </button>
              <button
                type="button"
                onClick={() => entscheiden("nein")}
                className="h-9 rounded-lg px-3 text-xs font-medium text-zinc-500"
              >
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
