import { createClient } from "@/lib/supabase/server";

/**
 * Gemeinsame Zugriffsprüfung für alle /admin-Unterseiten. Die eigentliche
 * Durchsetzung passiert in der Datenbank (jede admin_*-Funktion prüft
 * ist_admin() selbst) - das hier verhindert nur, dass nicht-Admins
 * überhaupt erst die Seite mit leeren/fehlerhaften Listen zu sehen
 * bekommen.
 */
export async function getAdminContext() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const { data: profil } = user
    ? await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle()
    : { data: null };

  return { supabase, user, istAdmin: profil?.is_admin === true };
}
