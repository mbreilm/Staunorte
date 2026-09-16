"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useMerkliste } from "@/components/merkliste/MerklisteProvider";
import { ZurueckPfeil } from "@/components/icons/ZurueckPfeil";
import { AktivitaetsBadge } from "@/components/place/AktivitaetsBadge";
import { AKTIVITAETS_TEXT_DETAIL } from "@/lib/format/activity";
import { holeEigenePosition, type EigenePosition } from "@/lib/geo/position";
import { haversineMeters } from "@/lib/geo/distance";
import type { Database } from "@/lib/supabase/types";

type Eintrag = Database["public"]["Functions"]["merkliste_orte"]["Returns"][number];

/**
 * Die persönliche Merkliste - "wo will ich als Nächstes hin".
 *
 * Reihenfolge: zuletzt gemerkt zuerst. Die Entfernung steht als Zusatz
 * dabei, sobald der Standort vorliegt, bestimmt aber nicht die Sortierung.
 */
export default function MerklistePage() {
  const { user, isLoading, requireAuth } = useAuth();
  const { umschalten } = useMerkliste();
  const router = useRouter();
  const [eintraege, setEintraege] = useState<Eintrag[] | null>(null);
  const [position, setPosition] = useState<EigenePosition | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      requireAuth("Deine Merkliste gehört zu deinem Konto.", () =>
        router.replace("/konto"),
      );
    }
  }, [isLoading, user, requireAuth, router]);

  // Die Liste kommt SOFORT, ohne auf den Standort zu warten. Vorher stand
  // hier ein `await holeEigenePosition()` davor - mit hoher Genauigkeit und
  // acht Sekunden Zeitlimit. Die Datenbank wurde also erst gefragt, wenn
  // das GPS geantwortet hatte, und bei schlechtem Empfang stand minutenlang
  // "Wird geladen" da für eine Abfrage, die Millisekunden dauert.
  const laden = useCallback(async () => {
    const { data, error } = await createClient().rpc("merkliste_orte", {
      p_lat: null,
      p_lon: null,
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

  // Der Standort läuft nebenher. Trifft er ein, wird die schon sichtbare
  // Liste nach Entfernung umsortiert - ohne zweite Datenbankabfrage, die
  // Koordinaten liegen ja vor.
  useEffect(() => {
    let verworfen = false;
    // Grob reicht: Angezeigt wird "4,2 km entfernt", nicht der Meter.
    // Eine zwischengespeicherte Position bis fünf Minuten Alter ist dafür
    // genau genug und kommt sofort statt nach Sekunden.
    holeEigenePosition({ genau: false, maxAlterMs: 300_000, timeoutMs: 5000 }).then((p) => {
      if (!verworfen && p) setPosition(p);
    });
    return () => {
      verworfen = true;
    };
  }, []);

  // Reihenfolge: zuletzt gemerkt zuerst - so liefert es die Datenbank,
  // hier wird nichts umsortiert. Die Entfernung wird nur ergänzt, sobald
  // der Standort da ist; sie ist eine Zusatzinfo, kein Ordnungskriterium.
  // (Nach Entfernung zu sortieren hiesse, dass die Liste unter dem Finger
  // die Reihenfolge wechselt, sobald das GPS antwortet.)
  const angezeigt = useMemo(() => {
    if (!eintraege || !position) return eintraege;
    return eintraege.map((e) => ({
      ...e,
      distance_m: haversineMeters(
        { lat: position.lat, lon: position.lon },
        { lat: e.lat, lon: e.lon },
      ),
    }));
  }, [eintraege, position]);

  async function entfernen(placeId: string) {
    // Sofort aus der Liste nehmen; die Datenbank zieht nach.
    setEintraege((alt) => (alt ?? []).filter((e) => e.id !== placeId));
    // Ueber den gemeinsamen Zustand, nicht direkt per RPC: Nur so
    // verschwindet der Stern gleichzeitig auf der Karte.
    const jetztDrin = await umschalten(placeId);
    if (jetztDrin) laden(); // hat nicht geklappt - lieber neu laden
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

      {angezeigt === null && <p className="text-sm text-muted">Wird geladen …</p>}

      {angezeigt?.length === 0 && (
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

      {angezeigt && angezeigt.length > 0 && (
        <ul className="flex flex-col gap-3">
          {angezeigt.map((e) => (
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
