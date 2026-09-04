// Supabase-Client für Browser-Komponenten ("use client").
// Session liegt in Cookies, damit Server- und Client-Client dieselbe
// Anmeldung sehen (siehe lib/supabase/server.ts).
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
