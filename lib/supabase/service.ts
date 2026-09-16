import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Client mit dem Dienstschlüssel - umgeht jede Zeilensicherheit.
 *
 * NUR in Server-Routen benutzen, und dort erst NACH einer eigenen
 * Rechteprüfung. Gelangt dieser Schlüssel jemals in den Browser, kann
 * jeder alles lesen und ändern.
 *
 * Gebraucht wird er bislang an genau einer Stelle: zum Löschen von
 * Bilddateien im Speicher. Das geht weder aus der Datenbank heraus
 * (Supabase verbietet direkte Löschungen in storage.objects) noch mit
 * einer normalen Anmeldung (es gibt keine Löschregel für den Bucket).
 */
export function createServiceClient() {
  const schluessel = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!schluessel) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt");
  }
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    schluessel,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
