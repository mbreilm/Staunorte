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
import { FotoGalerie } from "@/components/place/FotoGalerie";
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

  return (
    <main className="flex-1 pb-10">
      <div className="flex items-center px-4 pt-4">
        <Link href="/" aria-label="Zurück zur Karte" className="btn btn-icon">
          <ZurueckPfeil />
        </Link>
      </div>

      {galerieFotos.length > 0 && <FotoGalerie fotos={galerieFotos} />}

      <div className="px-6 pt-6">
        <h1 className="text-3xl">{ort.title}</h1>
        {ort.address && <p className="mt-1 text-sm text-muted">{ort.address}</p>}
        {ort.note && <p className="mt-3 text-sm">{ort.note}</p>}

        <span className={`mt-4 inline-block ${aktivitaetsFarbe}`}>
          {aktivitaetsText}
        </span>

        {(jetztHier.length > 0 || kuerzlich.length > 0 || archiv.length > 0) && (
          <section className="mt-6">
            <h2 className="card-kicker">
              {kategorie?.observable_label ?? "Beobachtungen"}
            </h2>

            {jetztHier.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold" style={{ color: "var(--color-accent-2-700)" }}>
                  Jetzt hier
                </p>
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
                <summary className="cursor-pointer text-xs font-medium text-muted">
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
            <h2 className="card-kicker">{kategorie?.hours_label ?? "Arbeitszeiten"}</h2>
            {beobachtetesMuster ? (
              <>
                <p className="mt-1 text-sm">{beobachtetesMuster.text}</p>
                {angegebeneZeiten && (
                  <p className="mt-0.5 text-xs text-muted">
                    laut Angabe: {angegebeneZeiten}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm">{angegebeneZeiten}</p>
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

        <p className="mt-6 text-sm text-muted">
          {ort.checkin_count} Check-ins insgesamt
          {typeof checkinsWoche === "number" && (
            <> · {checkinsWoche} diese Woche</>
          )}
        </p>

        {kategorie?.safety_notice && (
          <div
            className="mt-4 rounded-2xl p-4 text-sm"
            style={{ background: "var(--color-accent-100)", color: "var(--color-accent-800)" }}
          >
            {kategorie.safety_notice}
          </div>
        )}

        <div className="mt-6">
          <CheckinButton
            placeId={id}
            categoryId={ort.category_id}
            erstelltVon={ort.created_by}
            bereitsGemeldet={beobachtungen ?? []}
          />
        </div>

        <div className="mt-8 text-center">
          <Link href={`/ort/${id}/melden`} className="btn btn-ghost text-xs">
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
    <li className="card flex-row items-center gap-3 px-3 py-2.5 text-sm">
      <span className="text-xl" aria-hidden="true">
        {beobachtung.icon}
      </span>
      <span className="flex-1">{beobachtung.name_de}</span>
      {zeitHinweis && <span className="text-xs text-muted">{zeitHinweis}</span>}
    </li>
  );
}

function ZurueckPfeil() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 5l-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
