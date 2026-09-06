import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { PlaceObservableView } from "@/lib/supabase/types";
import { vorZeit, istAelterAlsTage } from "@/lib/format/relativeTime";
import { AKTIVITAETS_TEXT_DETAIL } from "@/lib/format/activity";
import { AktivitaetsBadge } from "@/components/place/AktivitaetsBadge";
import { ZurueckPfeil } from "@/components/icons/ZurueckPfeil";
import { GruppenIcon } from "@/components/icons/GruppenIcon";
import { CheckinButton } from "@/components/checkin/CheckinButton";
import { FotoGalerie } from "@/components/place/FotoGalerie";
import { RouteButton } from "@/components/place/RouteButton";
import { ArbeitszeitenBearbeitenButton } from "@/components/arbeitszeiten/ArbeitszeitenBearbeitenButton";
import { formatArbeitszeiten } from "@/lib/format/arbeitszeiten";
import { leiteMusterAb } from "@/lib/format/activityPattern";

const WERTENDE_CHECKINS_FUER_MUSTER = 8;

const FOTO_BUCKET = "place-photos";
const FOTO_ALTER_HINWEIS_TAGE = 90;

export default async function OrtDetailSeite({
  params,
}: PageProps<"/ort/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ort } = await supabase
    .from("places")
    .select(
      "id, title, address, note, category_id, checkin_count, status, source, is_confirmed, created_by",
    )
    .eq("id", id)
    .maybeSingle();

  if (!ort) notFound();

  // Alle folgenden Abfragen hängen nur von `id`/`ort.category_id`/
  // `ort.checkin_count` ab (schon bekannt) - deshalb ein einziges
  // Promise.all statt mehrerer nacheinander await'eter Blöcke. Jeder
  // zusätzliche sequenzielle Block addiert eine volle Netzwerk-Rundreise
  // zu Supabase; das machte den Seitenaufbau spürbar langsam (bis zu
  // mehreren Sekunden „Rendering" im Next.js-Dev-Indikator).
  const [
    { data: kategorie },
    { data: aktivitaet },
    { data: checkinsWoche },
    { data: position },
    { data: fotos },
    { data: beobachtungen },
    { data: arbeitszeiten },
    { data: aktivitaetsMuster },
  ] = await Promise.all([
    supabase
      .from("place_categories")
      .select("name_singular, safety_notice, observable_label, hours_label")
      .eq("id", ort.category_id)
      .maybeSingle(),
    supabase.rpc("place_is_active_now", { p_place_id: id }),
    // Kann fehlschlagen, solange Migration 0005 auf diesem Projekt noch
    // nicht eingespielt wurde - dann einfach ohne Wochenzahl anzeigen.
    supabase.rpc("place_checkins_this_week", { p_place_id: id }),
    supabase.rpc("place_location", { p_place_id: id }),
    supabase
      .from("place_photos")
      .select("id, storage_path, taken_at, created_at")
      .eq("place_id", id)
      .eq("moderation_status", "ok")
      .order("created_at", { ascending: false }),
    supabase
      .from("v_place_observables")
      .select("*")
      .eq("place_id", id)
      .order("last_seen_at", { ascending: false }),
    supabase.from("place_hours").select("*").eq("place_id", id),
    ort.checkin_count >= WERTENDE_CHECKINS_FUER_MUSTER
      ? supabase.from("place_activity").select("*").eq("place_id", id)
      : Promise.resolve({ data: null }),
  ]);

  const angegebeneZeiten = formatArbeitszeiten(arbeitszeiten ?? []);
  const beobachtetesMuster = aktivitaetsMuster ? leiteMusterAb(aktivitaetsMuster) : null;

  const aktivitaetsZustand = aktivitaet ?? "unbekannt";
  const aktivitaetsText = AKTIVITAETS_TEXT_DETAIL[aktivitaetsZustand];

  const jetztHier = (beobachtungen ?? []).filter((o) => o.bucket === "jetzt_hier");
  const kuerzlich = (beobachtungen ?? []).filter((o) => o.bucket === "kuerzlich");
  const archiv = (beobachtungen ?? []).filter((o) => o.bucket === "archiv");

  const galerieFotos = (fotos ?? []).map((foto) => {
    const datum = foto.taken_at ?? foto.created_at;
    return {
      id: foto.id,
      url: supabase.storage.from(FOTO_BUCKET).getPublicUrl(foto.storage_path).data
        .publicUrl,
      badgeText: istAelterAlsTage(datum, FOTO_ALTER_HINWEIS_TAGE)
        ? "älteres Foto"
        : vorZeit(datum),
    };
  });

  const standort = position?.[0] ?? null;

  return (
    <main className="flex-1 pb-10">
      {galerieFotos.length > 0 ? (
        <FotoGalerie fotos={galerieFotos} zurueckHref="/" />
      ) : (
        <div className="flex items-center px-4 pt-4">
          <Link href="/" aria-label="Zurück zur Karte" className="btn btn-icon elev-sm">
            <ZurueckPfeil />
          </Link>
        </div>
      )}

      <div className="px-6 pt-5">
        <AktivitaetsBadge zustand={aktivitaetsZustand} text={aktivitaetsText} />

        <h1 className="mt-3 text-[26px] leading-[1.1]">{ort.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {ort.address && <>{ort.address} · </>}
          {ort.checkin_count} Besuche
          {typeof checkinsWoche === "number" && <> · {checkinsWoche} diese Woche</>}
        </p>

        {(angegebeneZeiten || beobachtetesMuster) && (
          <div className="card mt-4 gap-1">
            {beobachtetesMuster ? (
              <>
                <strong className="text-sm">{beobachtetesMuster.text}</strong>
                {angegebeneZeiten && (
                  <span className="text-xs text-muted">laut Angabe: {angegebeneZeiten}</span>
                )}
              </>
            ) : (
              <strong className="text-sm">{angegebeneZeiten}</strong>
            )}
          </div>
        )}

        {ort.note && (
          <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--color-neutral-700)" }}>
            „{ort.note}“
          </p>
        )}

        {(jetztHier.length > 0 || kuerzlich.length > 0 || archiv.length > 0) && (
          <section className="mt-6">
            <h6>{kategorie?.observable_label ?? "Fahrzeuge"}</h6>

            {(jetztHier.length > 0 || kuerzlich.length > 0) && (
              <ul className="mt-2 flex flex-col gap-2">
                {jetztHier.map((beobachtung) => (
                  <BeobachtungsZeile
                    key={beobachtung.observable_type_id}
                    beobachtung={beobachtung}
                    variante="jetzt"
                  />
                ))}
                {kuerzlich.map((beobachtung) => (
                  <BeobachtungsZeile
                    key={beobachtung.observable_type_id}
                    beobachtung={beobachtung}
                    variante="kuerzlich"
                    zeitHinweis={`Zuletzt gesehen ${vorZeit(beobachtung.last_seen_at)}`}
                  />
                ))}
              </ul>
            )}

            {archiv.length > 0 && (
              <details className="mt-3">
                <summary className="btn btn-secondary btn-block">
                  Früher hier gesehen ({archiv.length})
                </summary>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {archiv.map((beobachtung) => (
                    <ArchivChip key={beobachtung.observable_type_id} beobachtung={beobachtung} />
                  ))}
                </div>
              </details>
            )}
          </section>
        )}

        <div className="mt-5">
          <ArbeitszeitenBearbeitenButton placeId={id} hatSchonZeiten={!!angegebeneZeiten} />
        </div>

        {kategorie?.safety_notice && (
          <div
            className="mt-4 rounded-2xl p-4 text-sm"
            style={{
              background: "var(--color-accent-100)",
              border: "1.5px solid var(--color-accent-300)",
              color: "var(--color-accent-800)",
            }}
          >
            {kategorie.safety_notice}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <div className="flex-1">
            <CheckinButton
              placeId={id}
              categoryId={ort.category_id}
              erstelltVon={ort.created_by}
              bereitsGemeldet={beobachtungen ?? []}
            />
          </div>
          {standort && <RouteButton lat={standort.lat} lon={standort.lon} />}
        </div>

        <div className="mt-6 text-center">
          <Link href={`/ort/${id}/melden`} className="btn btn-ghost text-xs" style={{ color: "var(--color-neutral-600)" }}>
            Diesen Ort melden
          </Link>
        </div>
      </div>
    </main>
  );
}

const BUCKET_STIL = {
  jetzt: {
    background: "var(--color-accent-2-100)",
    border: "1.5px solid var(--color-accent-2-300)",
    iconBg: "var(--color-accent-2-600)",
    label: "Jetzt hier",
    labelColor: "var(--color-accent-2-800)",
  },
  kuerzlich: {
    background: "var(--color-neutral-200)",
    border: "1.5px solid var(--color-neutral-300)",
    iconBg: "var(--color-neutral-400)",
    label: null,
    labelColor: "var(--color-neutral-700)",
  },
} as const;

function BeobachtungsZeile({
  beobachtung,
  variante,
  zeitHinweis,
}: {
  beobachtung: PlaceObservableView;
  variante: "jetzt" | "kuerzlich";
  zeitHinweis?: string;
}) {
  const stil = BUCKET_STIL[variante];
  return (
    <li
      className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5"
      style={{ background: stil.background, border: stil.border }}
    >
      <span
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
        aria-hidden="true"
        style={{ background: stil.iconBg }}
      >
        <GruppenIcon groupName={beobachtung.group_name} size={24} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <strong className="text-[15px]" style={{ color: variante === "kuerzlich" ? "var(--color-neutral-800)" : undefined }}>
          {beobachtung.name_de}
        </strong>
        {variante === "jetzt" ? (
          <span className="text-xs font-bold" style={{ color: stil.labelColor }}>
            {stil.label}
          </span>
        ) : (
          <span className="text-xs text-muted">{zeitHinweis}</span>
        )}
      </span>
    </li>
  );
}

function ArchivChip({ beobachtung }: { beobachtung: PlaceObservableView }) {
  return (
    <span
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm"
      style={{ border: "1.5px dashed var(--color-neutral-400)", color: "var(--color-neutral-700)" }}
    >
      <GruppenIcon groupName={beobachtung.group_name} size={18} aria-hidden="true" />
      {beobachtung.name_de}
    </span>
  );
}
