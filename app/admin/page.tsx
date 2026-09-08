import { getAdminContext } from "@/lib/admin/requireAdmin";
import { NichtAdmin } from "@/components/admin/NichtAdmin";
import { AdminNav } from "@/components/admin/AdminNav";
import { MeldungenListe } from "@/components/admin/MeldungenListe";

export default async function AdminSeite() {
  const { supabase, istAdmin } = await getAdminContext();
  if (!istAdmin) return <NichtAdmin />;

  const { data: meldungen } = await supabase.rpc("admin_meldungen_offen");

  return (
    <main className="flex-1 p-6">
      <AdminNav />
      <h1 className="mt-4 text-lg">Offene Meldungen</h1>
      <MeldungenListe meldungen={meldungen ?? []} />
    </main>
  );
}
