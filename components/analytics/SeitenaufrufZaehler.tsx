"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Zählt Seitenaufrufe komplett anonym: eine Zeile pro Navigation, ohne
 * Nutzer-ID, IP oder sonstige personenbezogene Spalte (siehe page_views,
 * Migration 0015) - deshalb unabhängig vom Plausible-Consent-Banner in
 * AnalyticsProvider. Grundlage für "Seitenaufrufe heute" im
 * Admin-Analytics-Dashboard.
 */
export function SeitenaufrufZaehler() {
  const pathname = usePathname();

  useEffect(() => {
    createClient()
      .from("page_views")
      .insert({})
      .then(() => {});
  }, [pathname]);

  return null;
}
