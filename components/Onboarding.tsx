"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconStandort } from "@/lib/icons";

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
      <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-[var(--color-bg)] px-6 py-6">
        <div className="flex flex-col gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-[74px] w-[74px] items-center justify-center rounded-full text-4xl"
            style={{ background: "var(--color-accent)" }}
          >
            {kategorie.icon}
          </span>
          <h2 className="mt-2 text-[31px] leading-[1.08]">Wo ist gerade was los?</h2>
          <p className="mt-1 text-base leading-relaxed" style={{ color: "var(--color-neutral-700)" }}>
            Entdecke {kategorie.namePlural} in deiner Nähe - mit Fotos, welche{" "}
            {kategorie.beobachtungsLabel} zuletzt gesehen wurden und ob dort vermutlich
            gerade gearbeitet wird.
          </p>
        </div>

        <div className="card mt-5 gap-2 p-4">
          <div className="flex items-center gap-2.5">
            <IconStandort size={20} stroke={2.5} style={{ color: "var(--color-accent-700)" }} />
            <strong className="text-[15px]">Standort freigeben</strong>
          </div>
          <p className="text-[13.5px] leading-snug" style={{ color: "var(--color-neutral-700)" }}>
            Damit wir dir zeigen können, was in der Nähe ist. Nur während du die App
            benutzt - wir speichern keine Wege.
          </p>
        </div>

        <div
          className="mt-3.5 flex flex-col gap-1.5 rounded-2xl p-4"
          style={{ border: "1.5px solid var(--color-accent-300)", background: "var(--color-accent-100)" }}
        >
          <strong className="text-sm" style={{ color: "var(--color-accent-800)" }}>
            Bitte einmal lesen
          </strong>
          <p className="text-[13px] leading-snug" style={{ color: "var(--color-accent-800)" }}>
            {kategorie.sicherheitshinweis}
          </p>
          <label
            className="mt-1.5 flex cursor-pointer items-start gap-2 text-[13px] leading-snug"
            style={{ color: "var(--color-accent-900)" }}
          >
            <input
              type="checkbox"
              checked={sicherheitBestaetigt}
              onChange={(e) => setSicherheitBestaetigt(e.target.checked)}
              className="mt-0.5 h-5 w-5 flex-none"
              style={{ accentColor: "var(--color-accent-700)" }}
            />
            <span>Verstanden, wir schauen nur von außen zu.</span>
          </label>
        </div>

        <div className="min-h-3.5 flex-1" />
        <button
          type="button"
          disabled={!sicherheitBestaetigt}
          onClick={standortAnfragen}
          className="btn btn-primary btn-block h-[52px] text-base"
        >
          Standort freigeben
        </button>
        <button
          type="button"
          onClick={onboardingSchliessen}
          className="btn btn-ghost btn-block h-11 text-sm"
        >
          Ohne Standort weiter
        </button>
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
