"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

const SCHLUESSEL = "baustellenjaeger:sitzung";

/**
 * Zählt Besuche, nicht Klicks: eine Zeile pro Sitzung.
 *
 * Der Vorgänger schrieb bei jeder Navigation eine Zeile. Wer die App
 * öffnete und durch Karte, Album und Profil ging, erzeugte vier - die Zahl
 * beantwortete damit nicht die Frage, die dahintersteckt ("benutzt das
 * jemand"), sondern nur "wie oft wurde getippt".
 *
 * Die Kennung erzeugt der Browser selbst und hält sie im sessionStorage:
 * Sie überlebt das Schließen des Tabs nicht und lässt sich keiner Person
 * zuordnen. Mitgeschickt wird nur zusätzlich, ob jemand angemeldet war -
 * als Ja/Nein, ohne Kennung.
 */
export function SitzungsZaehler() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Erst zählen, wenn klar ist, ob jemand angemeldet ist - sonst stünde
    // bei jeder Sitzung fälschlich "ohne Konto".
    if (isLoading) return;

    let sitzung: string | null = null;
    try {
      sitzung = window.sessionStorage.getItem(SCHLUESSEL);
      if (sitzung) return; // diese Sitzung ist schon gezählt
      sitzung = crypto.randomUUID();
      window.sessionStorage.setItem(SCHLUESSEL, sitzung);
    } catch {
      // Kein Zugriff auf den Speicher (privater Modus, blockierte
      // Website-Daten): Dann wird dieser Besuch eben nicht gezählt. Eine
      // fehlende Zahl ist harmloser als eine falsche.
      return;
    }

    createClient()
      .from("app_sessions")
      .insert({ session_id: sitzung, angemeldet: Boolean(user) })
      .then(({ error }) => {
        if (error) console.error("Sitzung zählen fehlgeschlagen:", error.message);
      });
  }, [isLoading, user]);

  return null;
}
