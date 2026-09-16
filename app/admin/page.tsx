import Link from "next/link";
import { getAdminContext } from "@/lib/admin/requireAdmin";
import { NichtAdmin } from "@/components/admin/NichtAdmin";
import { AdminNav } from "@/components/admin/AdminNav";

/**
 * Startseite des Admin-Bereichs: die Kennzahlen.
 *
 * Vorher standen hier die offenen Meldungen - die sind aber meistens leer.
 * Beim Öffnen interessiert zuerst "läuft es überhaupt", und dafür zählt
 * eine Zahl mehr als alle anderen: wie viele der importierten Orte hat
 * schon jemand bestätigt. Das PRD nennt unter 20 % nach acht Wochen als
 * Abbruchkriterium für das ganze Modell.
 */
export default async function AdminUebersichtSeite() {
  const { supabase, istAdmin } = await getAdminContext();
  if (!istAdmin) return <NichtAdmin />;

  const { data, error } = await supabase.rpc("admin_statistik");
  const s = data?.[0];

  const anteilBestaetigt =
    s && s.orte_gesamt > 0
      ? Math.round((s.orte_mit_checkin / s.orte_gesamt) * 100)
      : 0;

  return (
    <main className="flex-1 p-6">
      <AdminNav />
      <h1 className="mt-4 text-lg">Übersicht</h1>

      {error ? (
        <p className="mt-4 text-sm" style={{ color: "var(--color-accent-700)" }}>
          Kennzahlen konnten nicht geladen werden: {error.message}
        </p>
      ) : !s ? (
        <p className="mt-4 text-sm text-muted">Konnte nicht geladen werden.</p>
      ) : (
        <>
          <Abschnitt titel="Nutzung">
            <Kachel
              label="Sitzungen heute"
              wert={s.sitzungen_heute}
              unterzeile="Besuche, nicht Klicks"
            />
            <Kachel
              label="Sitzungen diese Woche"
              wert={s.sitzungen_diese_woche}
              unterzeile={`davon ${s.sitzungen_mit_konto_diese_woche} mit Konto`}
            />
            <Kachel
              label="Nutzer gesamt"
              wert={s.nutzer_gesamt}
              unterzeile={`+${s.nutzer_diese_woche} diese Woche`}
            />
          </Abschnitt>

          <Abschnitt titel="Trägt das Modell?">
            <Kachel
              label="Bestätigte Orte"
              wert={`${anteilBestaetigt} %`}
              unterzeile={`${s.orte_mit_checkin} von ${s.orte_gesamt} mit Check-in`}
              hervorgehoben
            />
            <Kachel
              label="Check-ins gesamt"
              wert={s.checkins_gesamt}
              unterzeile={`+${s.checkins_diese_woche} diese Woche`}
            />
            <Kachel
              label="Fotos gesamt"
              wert={s.fotos_gesamt}
              unterzeile="von Nutzern & Admins"
            />
          </Abschnitt>

          {anteilBestaetigt < 20 && s.orte_gesamt > 50 && (
            <p
              className="mt-4 rounded-2xl p-4 text-sm"
              style={{
                background: "var(--color-accent-100)",
                color: "var(--color-accent-800)",
              }}
            >
              Erst {anteilBestaetigt} % der Orte sind bestätigt. Laut PRD
              (Kapitel 11) ist das nach acht Wochen ab Launch das
              Abbruchkriterium fürs Crowdsourcing — solange der Start läuft, ist
              das normal.
            </p>
          )}

          {s.offene_meldungen > 0 && (
            <p className="mt-4 text-sm">
              <Link href="/admin/meldungen" className="hover:underline">
                {s.offene_meldungen} offene{" "}
                {s.offene_meldungen === 1 ? "Meldung" : "Meldungen"}
              </Link>{" "}
              warten auf Bearbeitung.
            </p>
          )}
        </>
      )}
    </main>
  );
}

function Abschnitt({
  titel,
  children,
}: {
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h6 className="mb-2" style={{ color: "var(--color-neutral-700)" }}>
        {titel}
      </h6>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{children}</div>
    </section>
  );
}

function Kachel({
  label,
  wert,
  unterzeile,
  hervorgehoben = false,
}: {
  label: string;
  wert: number | string;
  unterzeile: string;
  hervorgehoben?: boolean;
}) {
  return (
    <div
      className="card"
      style={
        hervorgehoben ? { borderColor: "var(--color-accent)" } : undefined
      }
    >
      <p className="card-kicker">{label}</p>
      <p className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
        {wert}
      </p>
      <p className="card-meta">{unterzeile}</p>
    </div>
  );
}
