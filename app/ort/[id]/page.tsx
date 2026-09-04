import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { PlaceObservableView } from "@/lib/supabase/types";
import { vorZeit, istAelterAlsTage } from "@/lib/format/relativeTime";
import {
  AKTIVITAETS_TEXT_DETAIL,
  AKTIVITAETS_FARBE_DETAIL,
} from "@/lib/format/activity";
import { CheckinButton } from "@/components/checkin/CheckinButton";
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

  const [{ data: kategorie }, { data: aktivitaet }, { data: checkinsWoche }] =
    await Promise.all([
      supabase
        .from("place_categories")
        .select("name_singular, safety_notice, observable_label, hours_label")
        .eq("id", ort.category_id)
        .maybeSingle(),
      supabase.rpc("place_is_active_now", { p_place_id: id }),
      // Kann fehlschlagen, solange Migration 0005 auf diesem Projekt noch
      // nicht eingespielt wurde - dann einfach ohne Wochenzahl anzeigen.
      supabase.rpc("place_checkins_this_week", { p_place_id: id }),
    ]);

  const { data: fotos } = await supabase
    .from("place_photos")
    .select("id, storage_path, taken_at, created_at")
    .eq("place_id", id)
    .eq("moderation_status", "ok")
    .order("created_at", { ascending: false });

  const { data: beobachtungen } = await supabase
    .from("v_place_observables")
    .select("*")
    .eq("place_id", id)
    .order("last_seen_at", { ascending: false });

  const [{ data: arbeitszeiten }, { data: aktivitaetsMuster }] = await Promise.all([
    supabase.from("place_hours").select("*").eq("place_id", id),
    ort.checkin_count >= WERTENDE_CHECKINS_FUER_MUSTER
      ? supabase.from("place_activity").select("*").eq("place_id", id)
      : Promise.resolve({ data: null }),
  ]);

  const angegebeneZeiten = formatArbeitszeiten(arbeitszeiten ?? []);
  const beobachtetesMuster = aktivitaetsMuster ? leiteMusterAb(aktivitaetsMuster) : null;

  const aktivitaetsText = aktivitaet
    ? AKTIVITAETS_TEXT_DETAIL[aktivitaet]
    : AKTIVITAETS_TEXT_DETAIL.unbekannt;
  const aktivitaetsFarbe = aktivitaet
    ? AKTIVITAETS_FARBE_DETAIL[aktivitaet]
    : AKTIVITAETS_FARBE_DETAIL.unbekannt;

  const jetztHier = (beobachtungen ?? []).filter((o) => o.bucket === "jetzt_hier");
  const kuerzlich = (beobachtungen ?? []).filter((o) => o.bucket === "kuerzlich");
  const archiv = (beobachtungen ?? []).filter((o) => o.bucket === "archiv");

  return (
    <main className="flex-1 pb-10">
      {fotos && fotos.length > 0 && (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto">
          {fotos.map((foto) => {
            const datum = foto.taken_at ?? foto.created_at;
            const url = supabase.storage
              .from(FOTO_BUCKET)
              .getPublicUrl(foto.storage_path).data.publicUrl;

            return (
              <div
                key={foto.id}
                className="relative aspect-[4/3] w-full flex-none snap-start"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-Fotos ohne next/image-Konfiguration */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
                  {istAelterAlsTage(datum, FOTO_ALTER_HINWEIS_TAGE)
                    ? "älteres Foto"
                    : vorZeit(datum)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-6 pt-6">
        <h1 className="text-xl font-bold text-zinc-900">{ort.title}</h1>
        {ort.address && (
          <p className="mt-1 text-sm text-zinc-500">{ort.address}</p>
        )}
        {ort.note && (
          <p className="mt-3 text-sm text-zinc-700">{ort.note}</p>
        )}

        <span
          className={`mt-4 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${aktivitaetsFarbe}`}
        >
          {aktivitaetsText}
        </span>

        {(jetztHier.length > 0 || kuerzlich.length > 0 || archiv.length > 0) && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-zinc-900">
              {kategorie?.observable_label ?? "Beobachtungen"}
            </h2>

            {jetztHier.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-green-700">Jetzt hier</p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {jetztHier.map((beobachtung) => (
                    <BeobachtungsZeile key={beobachtung.observable_type_id} beobachtung={beobachtung} />
                  ))}
                </ul>
              </div>
            )}

            {kuerzlich.length > 0 && (
              <div className="mt-3">
                <ul className="flex flex-col gap-1.5">
                  {kuerzlich.map((beobachtung) => (
                    <BeobachtungsZeile
                      key={beobachtung.observable_type_id}
                      beobachtung={beobachtung}
                      zeitHinweis={`Zuletzt gesehen ${vorZeit(beobachtung.last_seen_at)}`}
                    />
                  ))}
                </ul>
              </div>
            )}

            {archiv.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-zinc-500">
                  Früher hier gesehen ({archiv.length})
                </summary>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {archiv.map((beobachtung) => (
                    <BeobachtungsZeile key={beobachtung.observable_type_id} beobachtung={beobachtung} />
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}

        {(angegebeneZeiten || beobachtetesMuster) && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-zinc-900">
              {kategorie?.hours_label ?? "Arbeitszeiten"}
            </h2>
            {beobachtetesMuster ? (
              <>
                <p className="mt-1 text-sm text-zinc-700">{beobachtetesMuster.text}</p>
                {angegebeneZeiten && (
                  <p className="mt-0.5 text-xs text-zinc-400">
                    laut Angabe: {angegebeneZeiten}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-zinc-700">{angegebeneZeiten}</p>
            )}
            <div className="mt-1.5">
              <ArbeitszeitenBearbeitenButton
                placeId={id}
                hatSchonZeiten={!!angegebeneZeiten}
              />
            </div>
          </section>
        )}
        {!angegebeneZeiten && !beobachtetesMuster && (
          <div className="mt-6">
            <ArbeitszeitenBearbeitenButton placeId={id} hatSchonZeiten={false} />
          </div>
        )}

        <p className="mt-6 text-sm text-zinc-600">
          {ort.checkin_count} Check-ins insgesamt
          {typeof checkinsWoche === "number" && (
            <> · {checkinsWoche} diese Woche</>
          )}
        </p>

        {kategorie?.safety_notice && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            {kategorie.safety_notice}
          </div>
        )}

        <CheckinButton
          placeId={id}
          categoryId={ort.category_id}
          erstelltVon={ort.created_by}
          bereitsGemeldet={beobachtungen ?? []}
        />

        <div className="mt-8 text-center">
          <Link
            href={`/ort/${id}/melden`}
            className="text-xs text-zinc-400 underline-offset-2 hover:underline"
          >
            Diesen Ort melden
          </Link>
        </div>
      </div>
    </main>
  );
}

function BeobachtungsZeile({
  beobachtung,
  zeitHinweis,
}: {
  beobachtung: PlaceObservableView;
  zeitHinweis?: string;
}) {
  return (
    <li className="flex items-center gap-2 text-sm text-zinc-700">
      <span aria-hidden="true">{beobachtung.icon}</span>
      <span>{beobachtung.name_de}</span>
      {zeitHinweis && (
        <span className="text-xs text-zinc-400">· {zeitHinweis}</span>
      )}
    </li>
  );
}
