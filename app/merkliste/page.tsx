"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { ZurueckPfeil } from "@/components/icons/ZurueckPfeil";
import { AktivitaetsBadge } from "@/components/place/AktivitaetsBadge";
import { AKTIVITAETS_TEXT_DETAIL } from "@/lib/format/activity";
import { holeEigenePosition } from "@/lib/geo/position";
import type { Database } from "@/lib/supabase/types";

type Eintrag = Database["public"]["Functions"]["merkliste_orte"]["Returns"][number];

/**
 * Die persönliche Merkliste - "wo will ich als Nächstes hin".
 *
 * Sortiert nach Entfernung, wenn der Standort freigegeben ist; sonst nach
 * dem Zeitpunkt des Merkens. Die Sortierung übernimmt die Datenbank, das
 * Frontend reicht nur die Position durch.
 */
export default function MerklistePage() {
  const { user, isLoading, requireAuth } = useAuth();
  const router = useRouter();
  const [eintraege, setEintraege] = useState<Eintrag[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      requireAuth("Deine Merkliste gehört zu deinem Konto.", () =>
        router.replace("/konto"),
      );
    }
  }, [isLoading, user, requireAuth, router]);

  const laden = useCallback(async () => {
    // Standort ist freiwillig: Ohne ihn sortiert die Datenbank nach
    // "zuletzt gemerkt" statt nach Entfernung.
    const position = await holeEigenePosition();
    const { data, error } = await createClient().rpc("merkliste_orte", {
      p_lat: position?.lat ?? null,
      p_lon: position?.lon ?? null,
    });
    if (error) {
      setFehler(error.message);
      setEintraege([]);
      return;
    }
    setEintraege(data ?? []);
  }, []);

  useEffect(() => {
    // Daten beim Öffnen holen. Der Zustand wird erst gesetzt, wenn
    // Standortabfrage und Datenbank geantwortet haben - also gerade NICHT
    // synchron im Effekt. Die Regel sieht nur den Aufruf und kann das
    // nicht unterscheiden.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void laden();
  }, [user, laden]);

  async function entfernen(placeId: string) {
    // Sofort aus der Liste nehmen; die Datenbank zieht nach.
    setEintraege((alt) => (alt ?? []).filter((e) => e.id !== placeId));
    const { error } = await createClient().rpc("merkliste_umschalten", {
      p_place_id: placeId,
    });
    if (error) laden(); // im Zweifel neu laden statt falsch anzeigen
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-6 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/konto" aria-label="Zurück zum Profil" className="btn btn-icon elev-sm">
          <ZurueckPfeil />
        </Link>
        <h1 className="text-2xl">Deine Merkliste</h1>
      </div>

      {fehler && (
        <p className="text-sm" style={{ color: "var(--color-accent-700)" }}>
          Die Liste konnte nicht geladen werden: {fehler}
        </p>
      )}

      {eintraege === null && <p className="text-sm text-muted">Wird geladen …</p>}

      {eintraege?.length === 0 && (
        <div className="card">
          <p className="card-title">Noch nichts gemerkt</p>
          <p className="mt-1 text-sm text-muted">
            Tipp auf der Karte eine Baustelle an und dann auf den Stern. Hier
            sammeln sich dann deine Ziele für den nächsten Ausflug.
          </p>
          <Link href="/" className="btn btn-primary mt-4">
            Zur Karte
          </Link>
        </div>
      )}

      {eintraege && eintraege.length > 0 && (
        <ul className="flex flex-col gap-3">
          {eintraege.map((e) => (
            <li key={e.id} className="card">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/ort/${e.id}`} className="card-title hover:underline">
                    {e.title}
                  </Link>
                  <p className="card-meta mt-1 flex-wrap">
                    {e.distance_m !== null && <span>{entfernung(e.distance_m)}</span>}
                    {e.address && <span className="truncate">{e.address}</span>}
                  </p>
                  <div className="mt-2">
                    <AktivitaetsBadge
                      zustand={e.activity}
                      text={AKTIVITAETS_TEXT_DETAIL[e.activity]}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => entfernen(e.id)}
                  aria-label={`${e.title} von der Merkliste nehmen`}
                  className="btn btn-icon text-muted"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function entfernung(meter: number): string {
  return meter < 1000
    ? `${Math.round(meter / 10) * 10} m entfernt`
    : `${(meter / 1000).toFixed(1).replace(".", ",")} km entfernt`;
}
