import { getAdminContext } from "@/lib/admin/requireAdmin";
import { NichtAdmin } from "@/components/admin/NichtAdmin";
import { AdminNav } from "@/components/admin/AdminNav";

/**
 * Rückmeldungen aus dem Profil. Sie gehen zusätzlich per E-Mail raus -
 * diese Ansicht ist das Netz darunter: Geht eine Mail verloren (Limit
 * erreicht, Spam-Ordner), steht die Rückmeldung trotzdem hier.
 */
export default async function AdminFeedbackPage() {
  const { supabase, istAdmin } = await getAdminContext();
  if (!istAdmin) return <NichtAdmin />;

  const { data: rueckmeldungen, error } = await supabase.rpc("admin_feedback_liste");

  return (
    <main className="flex-1 p-6">
      <AdminNav />
      <h1 className="mt-4 text-lg">Rückmeldungen</h1>

      {error ? (
        <p className="mt-4 text-sm" style={{ color: "var(--color-accent-700)" }}>
          Liste konnte nicht geladen werden: {error.message}
        </p>
      ) : (rueckmeldungen ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-muted">Noch keine Rückmeldungen.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {(rueckmeldungen ?? []).map((r) => (
            <li key={r.id} className="card">
              <p className="card-meta flex-wrap">
                <span className="tag tag-sm tag-neutral">
                  {new Date(r.created_at).toLocaleString("de-DE")}
                </span>
                {r.user_email && (
                  <a href={`mailto:${r.user_email}`} className="hover:underline">
                    {r.user_email}
                  </a>
                )}
              </p>
              <Abschnitt titel="Gefällt" text={r.gefaellt} />
              <Abschnitt titel="Stört" text={r.stoert} />
              <Abschnitt titel="Fehlt" text={r.fehlt} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Abschnitt({ titel, text }: { titel: string; text: string | null }) {
  if (!text) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold" style={{ color: "var(--color-accent-700)" }}>
        {titel}
      </p>
      {/* whitespace-pre-line: Absätze aus dem Formular bleiben erhalten. */}
      <p className="whitespace-pre-line text-sm">{text}</p>
    </div>
  );
}
