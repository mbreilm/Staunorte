"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SCHLUESSEL_GEZEIGT = "baustellenjaeger:onboarding-gezeigt";
const SCHLUESSEL_BESUCHE = "baustellenjaeger:besuchszaehler";
const SCHLUESSEL_INSTALL_VERWORFEN = "baustellenjaeger:installhinweis-verworfen";
const KATEGORIE = process.env.NEXT_PUBLIC_DEFAULT_CATEGORY || "baustelle";

type KategorieInfo = {
  namePlural: string;
  beobachtungsLabel: string;
  sicherheitshinweis: string;
  icon: string;
};

// Chrome/Android feuert dieses Event, wenn die PWA installierbar ist -
// kein offizieller DOM-Typ, daher hier minimal selbst deklariert.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Dreiteiliges Sicherheits-Onboarding beim ersten Start (T13) - App-Zweck,
 * aktiv zu bestätigender Sicherheitshinweis, dann Standort erklären &
 * anfragen. Ab dem zweiten Besuch danach ein dezenter "Zum Home-
 * Bildschirm hinzufügen"-Hinweis. In app/layout.tsx gemountet, damit es
 * unabhängig von der Einstiegsseite erscheint.
 */
export function Onboarding() {
  const [zeigeOnboarding, setZeigeOnboarding] = useState(false);
  const [schritt, setSchritt] = useState<1 | 2 | 3>(1);
  const [kategorie, setKategorie] = useState<KategorieInfo | null>(null);
  const [sicherheitBestaetigt, setSicherheitBestaetigt] = useState(false);
  const [zeigeInstallHinweis, setZeigeInstallHinweis] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    let besuche = 0;
    try {
      besuche = Number(window.localStorage.getItem(SCHLUESSEL_BESUCHE) ?? "0") + 1;
      window.localStorage.setItem(SCHLUESSEL_BESUCHE, String(besuche));
    } catch {
      besuche = 1;
    }

    let gezeigt = true;
    try {
      gezeigt = window.localStorage.getItem(SCHLUESSEL_GEZEIGT) === "1";
    } catch {
      // Kein Storage-Zugriff - Onboarding lieber überspringen als bei
      // jedem Aufruf erneut zeigen.
    }

    if (!gezeigt) {
      createClient()
        .from("place_categories")
        .select("name_plural, observable_label, safety_notice, marker_style")
        .eq("id", KATEGORIE)
        .maybeSingle()
        .then(({ data }) => {
          const style = data?.marker_style as { icon?: string } | null;
          setKategorie({
            namePlural: data?.name_plural ?? "Orte",
            beobachtungsLabel: data?.observable_label ?? "Beobachtungen",
            sicherheitshinweis: data?.safety_notice ?? "",
            icon: style?.icon ?? "📍",
          });
          setZeigeOnboarding(true);
        });
    } else if (besuche >= 2) {
      let verworfen = true;
      try {
        verworfen = window.localStorage.getItem(SCHLUESSEL_INSTALL_VERWORFEN) === "1";
      } catch {
        // s.o.
      }
      // Reine Übernahme von localStorage in State beim Einhängen, kein
      // async Umweg möglich - genau der Fall, den React selbst als
      // legitime Ausnahme nennt ("Subscribe to an external store").
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!verworfen) setZeigeInstallHinweis(true);
    }

    function aufInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", aufInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", aufInstallPrompt);
  }, []);

  function onboardingSchliessen() {
    try {
      window.localStorage.setItem(SCHLUESSEL_GEZEIGT, "1");
    } catch {
      // s.o.
    }
    setZeigeOnboarding(false);
  }

  function standortAnfragen() {
    if (!("geolocation" in navigator)) {
      onboardingSchliessen();
      return;
    }
    navigator.geolocation.getCurrentPosition(onboardingSchliessen, onboardingSchliessen, {
      enableHighAccuracy: false,
      timeout: 8000,
    });
  }

  function installHinweisSchliessen() {
    try {
      window.localStorage.setItem(SCHLUESSEL_INSTALL_VERWORFEN, "1");
    } catch {
      // s.o.
    }
    setZeigeInstallHinweis(false);
  }

  async function installieren() {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
    }
    installHinweisSchliessen();
  }

  if (zeigeOnboarding && kategorie) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--color-bg)] p-6">
        {schritt === 1 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <span className="text-6xl" aria-hidden="true">
              {kategorie.icon}
            </span>
            <p className="text-base">
              Entdecke {kategorie.namePlural} in deiner Nähe und schau dir an, welche{" "}
              {kategorie.beobachtungsLabel} dort gerade sind.
            </p>
            <button type="button" onClick={() => setSchritt(2)} className="btn btn-primary">
              Weiter
            </button>
          </div>
        )}

        {schritt === 2 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-base">{kategorie.sicherheitshinweis}</p>
            <label className="radio">
              <input
                type="checkbox"
                checked={sicherheitBestaetigt}
                onChange={(e) => setSicherheitBestaetigt(e.target.checked)}
              />
              <span className="dot" />
              Ich habe verstanden
            </label>
            <button
              type="button"
              disabled={!sicherheitBestaetigt}
              onClick={() => setSchritt(3)}
              className="btn btn-primary"
            >
              Weiter
            </button>
          </div>
        )}

        {schritt === 3 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-base">
              Wir zeigen dir gern {kategorie.namePlural} in deiner Nähe. Dafür brauchen
              wir deinen Standort.
            </p>
            <button type="button" onClick={standortAnfragen} className="btn btn-primary">
              Standort erlauben
            </button>
            <button type="button" onClick={onboardingSchliessen} className="btn btn-ghost text-sm">
              Später
            </button>
          </div>
        )}
      </div>
    );
  }

  if (zeigeInstallHinweis) {
    return (
      <div
        className="pointer-events-none fixed inset-x-0 z-40 flex justify-center p-4"
        style={{ bottom: "max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))" }}
      >
        <div className="dialog elev-lg pointer-events-auto w-full max-w-md flex-row items-center gap-3 py-3">
          <p className="flex-1 text-xs">
            Für schnelleren Zugriff: Zum Home-Bildschirm hinzufügen
          </p>
          {installEvent ? (
            <button type="button" onClick={installieren} className="btn btn-ghost text-xs">
              Hinzufügen
            </button>
          ) : (
            <button type="button" onClick={installHinweisSchliessen} className="btn btn-ghost text-xs">
              OK
            </button>
          )}
          <button
            type="button"
            onClick={installHinweisSchliessen}
            aria-label="Schließen"
            className="btn btn-icon text-muted"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return null;
}
