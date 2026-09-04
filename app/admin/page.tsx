import { createClient } from "@/lib/supabase/server";
import { MeldungenListe } from "@/components/admin/MeldungenListe";

export default async function AdminSeite() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const { data: profil } = user
    ? await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle()
    : { data: null };

  if (!profil?.is_admin) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center">
        <p className="text-sm text-muted">Diese Seite ist nur für Admins.</p>
      </main>
    );
  }

  const { data: meldungen } = await supabase.rpc("admin_meldungen_offen");

  return (
    <main className="flex-1 p-6">
      <h1 className="text-lg">Offene Meldungen</h1>
      <MeldungenListe meldungen={meldungen ?? []} />
    </main>
  );
}
