import { getAdminContext } from "@/lib/admin/requireAdmin";
import { NichtAdmin } from "@/components/admin/NichtAdmin";
import { AdminNav } from "@/components/admin/AdminNav";
import { NutzerListe } from "@/components/admin/NutzerListe";

export default async function AdminNutzerPage() {
  const { supabase, user, istAdmin } = await getAdminContext();
  if (!istAdmin) return <NichtAdmin />;

  const { data: nutzer, error } = await supabase.rpc("admin_nutzer_liste", { p_suche: null });

  return (
    <main className="flex-1 p-6">
      <AdminNav />
      <h1 className="mt-4 text-lg">Nutzer verwalten</h1>
      {error ? (
        <p className="mt-4 text-sm" style={{ color: "var(--color-accent-700)" }}>
          Liste konnte nicht geladen werden: {error.message}
        </p>
      ) : (
        <NutzerListe initial={nutzer ?? []} eigeneId={user!.id} />
      )}
    </main>
  );
}
