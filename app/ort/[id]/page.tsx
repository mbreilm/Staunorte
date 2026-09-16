import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { vorZeit, istAelterAlsTage } from "@/lib/format/relativeTime";
import { AKTIVITAETS_TEXT_DETAIL } from "@/lib/format/activity";
import { AktivitaetsBadge } from "@/components/place/AktivitaetsBadge";
import { ZurueckPfeil } from "@/components/icons/ZurueckPfeil";
import { CheckinButton } from "@/components/checkin/CheckinButton";
import { FotoGalerie } from "@/components/place/FotoGalerie";
import { FahrzeugListe } from "@/components/place/FahrzeugListe";
import { RouteButton } from "@/components/place/RouteButton";
import { MerkenButton } from "@/components/merkliste/MerkenButton";
import { TeilenButton } from "@/components/place/TeilenButton";
import { ArbeitszeitenBearbeitenButton } from "@/components/arbeitszeiten/ArbeitszeitenBearbeitenButton";
import { formatArbeitszeiten } from "@/lib/format/arbeitszeiten";
import { leiteMusterAb } from "@/lib/format/activityPattern";

const WERTENDE_CHECKINS_FUER_MUSTER = 8;

const FOTO_BUCKET = "place-photos";
const FOTO_ALTER_HINWEIS_TAGE = 90;

/**
 * Eigene Linkvorschau je Baustelle.
 *
 * Ohne das sähe jeder geteilte Link gleich aus: "Baustellenjäger" mit dem
 * Logo. Wer einem Freund eine bestimmte Baustelle schickt, will aber
 * genau die zeigen - mit Namen, Adresse und dem Foto, das jemand dort
 * gemacht hat. Erst damit wird aus "schau mal, eine App" ein "schau mal,
 * diese Baustelle".
 */
export async function generateMetadata({
  params,
}: PageProps<"/ort/[id]">): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ort } = await supabase
    .from("places")
    .select("title, address, note")
    .eq("id", id)
    .maybeSingle();

  if (!ort) return { title: "Ort nicht gefunden" };

  const { data: foto } = await supabase
    .from("place_photos")
    .select("storage_path")
    .eq("place_id", id)
    .eq("moderation_status", "ok")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Foto der Baustelle, sonst das allgemeine Vorschaubild - ein Link ohne
  // Bild wird von Messengern oft gar nicht als Vorschau angezeigt.
  const bild = foto
    ? supabase.storage.from(FOTO_BUCKET).getPublicUrl(foto.storage_path).data
        .publicUrl
    : "/og-bild.png";

  const beschreibung = [ort.address, ort.note]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 200);

  return {
    title: ort.title,
    description: beschreibung || "Schau dir an, welche Fahrzeuge hier arbeiten.",
    openGraph: {
      type: "article",
      locale: "de_DE",
      siteName: "Baustellenjäger",
      title: ort.title,
      description: beschreibung || "Schau dir an, welche Fahrzeuge hier arbeiten.",
      url: `/ort/${id}`,
      images: [{ url: bild, alt: ort.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: ort.title,
      description: beschreibung || "Schau dir an, welche Fahrzeuge hier arbeiten.",
      images: [bild],
    },
  };
}

export default async function OrtDetailSeite({
  params,
  searchParams,
}: PageProps<"/ort/[id]">) {
  const { id } = await params;
  // ?von=admin: Die Detailseite wurde aus der Ortsverwaltung heraus
  // geöffnet. Dann führt der Zurück-Pfeil dorthin zurück statt auf die
  // Karte - sonst landet man als Admin nach jedem Blick auf einen Ort
  // wieder am Anfang und muss sich durch die Liste zurückarbeiten.
  const { von } = await searchParams;
  const ausAdmin = von === "admin";
  const zurueckHref = ausAdmin ? "/admin/orte" : "/";
  const zurueckLabel = ausAdmin ? "Zurück zur Ortsverwaltung" : "Zurück zur Karte";
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
    { data: merkEintrag },
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
    // Steht dieser Ort auf meiner Merkliste? Die Zeilenschutzregel liefert
    // ohnehin nur eigene Eintraege, ein Filter auf die Nutzerkennung ist
    // daher nicht noetig.
    supabase
      .from("place_bookmarks")
      .select("place_id")
      .eq("place_id", id)
      .maybeSingle(),
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
        <FotoGalerie
          fotos={galerieFotos}
          zurueckHref={zurueckHref}
          zurueckLabel={zurueckLabel}
        />
      ) : (
        <div className="flex items-center px-4 pt-4">
          <Link
            href={zurueckHref}
            aria-label={zurueckLabel}
            className="btn btn-icon elev-sm"
          >
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

        <FahrzeugListe
          jetztHier={jetztHier}
          kuerzlich={kuerzlich}
          archiv={archiv}
          observableLabel={kategorie?.observable_label ?? "Fahrzeuge"}
        />

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

        <div className="mt-2 flex gap-2">
          <MerkenButton placeId={id} initialGemerkt={merkEintrag !== null} />
          <TeilenButton titel={ort.title} />
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
