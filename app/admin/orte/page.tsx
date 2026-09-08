import { getAdminContext } from "@/lib/admin/requireAdmin";
import { NichtAdmin } from "@/components/admin/NichtAdmin";
import { AdminNav } from "@/components/admin/AdminNav";
import { OrteListe } from "@/components/admin/OrteListe";

export default async function AdminOrtePage() {
  const { supabase, istAdmin } = await getAdminContext();
  if (!istAdmin) return <NichtAdmin />;

  const { data: orte, error } = await supabase.rpc("admin_orte_liste", { p_suche: null });

  return (
    <main className="flex-1 p-6">
      <AdminNav />
      <h1 className="mt-4 text-lg">Baustellen verwalten</h1>
      {error ? (
        <p className="mt-4 text-sm" style={{ color: "var(--color-accent-700)" }}>
          Liste konnte nicht geladen werden: {error.message}
        </p>
      ) : (
        <OrteListe initial={orte ?? []} />
      )}
    </main>
  );
}
