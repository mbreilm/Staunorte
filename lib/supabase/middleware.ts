// Verlängert die Supabase-Session bei jedem Request. Server Components
// dürfen selbst keine Cookies schreiben - ohne diesen Schritt würde die
// Session nie erneuert und Nutzer flögen nach kurzer Zeit ungewollt raus.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Löst den Token-Refresh aus. Nicht entfernen, auch wenn der Rückgabewert
  // ungenutzt bleibt - genau das ist der Zweck dieses Aufrufs.
  await supabase.auth.getUser();

  return response;
}
