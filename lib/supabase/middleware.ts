// Verlängert die Supabase-Session bei jedem Request. Server Components
// dürfen selbst keine Cookies schreiben - ohne diesen Schritt würde die
// Session nie erneuert und Nutzer flögen nach kurzer Zeit ungewollt raus.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Ohne Session-Cookie gibt es nichts aufzufrischen. auth.getUser() macht
  // (anders als getSession()) bewusst immer eine echte Netzwerk-Anfrage an
  // Supabase Auth, um den Token serverseitig zu validieren - das kostet bei
  // jeder einzelnen Navigation eine volle Rundreise, auch für anonyme
  // Aufrufe. Lesen bleibt laut CLAUDE.md immer ohne Konto möglich, und die
  // große Mehrheit der Aufrufe (jeder erste Besuch, jeder Inkognito-Tab)
  // hat gar kein Auth-Cookie - dort können wir die Anfrage komplett
  // überspringen, ohne das Session-Refresh für angemeldete Nutzer zu
  // verändern.
  const hatSessionCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("-auth-token"));
  if (!hatSessionCookie) return response;

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
