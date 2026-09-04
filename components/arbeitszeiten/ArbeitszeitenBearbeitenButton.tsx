"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { baueZeilen } from "@/lib/arbeitszeiten/zeilen";
import { speicherArbeitszeiten } from "@/lib/arbeitszeiten/speichern";
import type { ArbeitszeitenAuswahl as Auswahl } from "@/lib/arbeitszeiten/typen";
import { ArbeitszeitenAuswahl } from "./ArbeitszeitenAuswahl";

type Props = {
  placeId: string;
  hatSchonZeiten: boolean;
};

/** Bearbeiten-Einstieg auf der Detailseite - schreibt sofort in place_hours. */
export function ArbeitszeitenBearbeitenButton({ placeId, hatSchonZeiten }: Props) {
  const [offen, setOffen] = useState(false);
  const [speichertGerade, setSpeichertGerade] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  async function ausgewaehlt(auswahl: Auswahl) {
    setSpeichertGerade(true);
    await speicherArbeitszeiten(supabase, placeId, baueZeilen(auswahl));
    setSpeichertGerade(false);
    setOffen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOffen(true)} className="btn btn-ghost text-xs">
        {hatSchonZeiten ? "Arbeitszeiten bearbeiten" : "Arbeitszeiten angeben"}
      </button>
      {offen && !speichertGerade && (
        <ArbeitszeitenAuswahl onAuswahl={ausgewaehlt} onAbbrechen={() => setOffen(false)} />
      )}
    </>
  );
}
