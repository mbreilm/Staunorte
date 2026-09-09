import Link from "next/link";
import { getAdminContext } from "@/lib/admin/requireAdmin";
import { NichtAdmin } from "@/components/admin/NichtAdmin";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminAnalyticsPage() {
  const { supabase, istAdmin } = await getAdminContext();
  if (!istAdmin) return <NichtAdmin />;

  const { data, error } = await supabase.rpc("admin_statistik");
  const statistik = data?.[0];

  const kacheln = statistik
    ? [
        {
          label: "Orte gesamt",
          wert: statistik.orte_gesamt,
          unterzeile: `+${statistik.orte_diese_woche} diese Woche`,
        },
        {
          label: "Check-ins gesamt",
          wert: statistik.checkins_gesamt,
          unterzeile: `+${statistik.checkins_diese_woche} diese Woche`,
        },
        {
          label: "Nutzer gesamt",
          wert: statistik.nutzer_gesamt,
          unterzeile: `+${statistik.nutzer_diese_woche} diese Woche`,
        },
        {
          // Seitenaufrufe, nicht eindeutige Besucher - siehe page_views (0015).
          label: "Seitenaufrufe heute",
          wert: statistik.seitenaufrufe_heute,
          unterzeile: "seit Mitternacht",
        },
        {
          label: "Fotos gesamt",
          wert: statistik.fotos_gesamt,
          unterzeile: "von Nutzern & Admins",
        },
      ]
    : [];

  return (
    <main className="flex-1 p-6">
      <AdminNav />
      <h1 className="mt-4 text-lg">Analytics</h1>

      {error ? (
        <p className="mt-4 text-sm" style={{ color: "var(--color-accent-700)" }}>
          Kennzahlen konnten nicht geladen werden: {error.message}
        </p>
      ) : !statistik ? (
        <p className="mt-4 text-sm text-muted">Konnte nicht geladen werden.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {kacheln.map((k) => (
              <div key={k.label} className="card">
                <p className="card-kicker">{k.label}</p>
                <p className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
                  {k.wert}
                </p>
                <p className="card-meta">{k.unterzeile}</p>
              </div>
            ))}
          </div>

          {statistik.offene_meldungen > 0 && (
            <p className="mt-4 text-sm">
              <Link href="/admin">
                {statistik.offene_meldungen} offene{" "}
                {statistik.offene_meldungen === 1 ? "Meldung" : "Meldungen"}
              </Link>{" "}
              warten auf Bearbeitung.
            </p>
          )}
        </>
      )}
    </main>
  );
}
