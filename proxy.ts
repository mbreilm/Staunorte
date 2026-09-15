import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // www.* auf die Hauptadresse umleiten. Das ist nicht Kosmetik: Die
  // Anmelde-Cookies von Supabase gelten immer nur für genau einen Host.
  // Wer sich auf www.baustellenjaeger.com anmeldet und später
  // baustellenjaeger.com öffnet, wäre dort wieder abgemeldet - und
  // umgekehrt. Es darf deshalb nur eine gültige Adresse geben.
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("www.")) {
    const ziel = request.nextUrl.clone();
    ziel.protocol = "https:";
    ziel.hostname = host.replace(/^www\./, "").split(":")[0];
    ziel.port = "";
    // 308 statt 307: dauerhaft, und die Anfragemethode bleibt erhalten.
    return NextResponse.redirect(ziel, 308);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
