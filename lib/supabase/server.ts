// Supabase-Client für Server Components, Server Actions und Route Handler.
// Liest/schreibt die Session über Cookies. In Next.js ist cookies() async,
// daher muss auch createClient() hier await'et werden.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Aufruf kam aus einer Server Component ohne Schreibzugriff auf
            // Cookies - unkritisch, solange die Middleware die Session pflegt.
          }
        },
      },
    },
  );
}
