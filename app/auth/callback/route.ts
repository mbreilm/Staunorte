// Rücksprungziel nach Klick auf den Anmelde-Link aus der E-Mail und nach
// einer OAuth-Anmeldung. Löst den mitgeschickten Nachweis gegen eine
// Session ein und leitet zurück in die App.
//
// Es gibt zwei Formen, und nur eine funktioniert hier zuverlässig:
//
//  a) `token_hash` + `type` — der Weg für E-Mail-Links. Der Nachweis steht
//     als normaler Query-Parameter in der Adresse, diese Route löst ihn
//     serverseitig ein. Funktioniert damit auch, wenn der Link in einem
//     anderen Browser oder auf einem anderen Gerät geöffnet wird als dort,
//     wo er angefordert wurde - der Normalfall, wenn man die Mail am Handy
//     liest. Die Vorlagen in supabase/templates/ bauen genau diese Adresse.
//
//  b) `code` — der PKCE-Weg, den OAuth-Anbieter (Google) benutzen. Der
//     Tausch braucht ein Cookie aus dem Browser, der die Anmeldung
//     gestartet hat, und bleibt deshalb OAuth vorbehalten.
//
// Nicht unterstützt und auch nicht unterstützbar: Supabases Standard-
// Vorlagen liefern die Zugangsdaten im URL-Fragment (`#access_token=…`)
// zurück. Fragmente schickt der Browser grundsätzlich nicht an den Server -
// eine Server-Route kann sie gar nicht sehen. Wer die Vorlagen aus
// supabase/templates/ nicht einspielt, landet deshalb immer hier im
// Fehlerfall. Siehe README.md in dem Ordner.
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const ERLAUBTE_TYPEN: readonly string[] = [
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
  "email",
];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // `next` kommt aus der Adresse und ist damit von außen bestimmbar. Nur
  // app-interne Ziele zulassen: "//fremde-seite.de" wäre sonst eine offene
  // Weiterleitung - der Link in der Mail sähe echt aus, landete aber auf
  // einer fremden Seite, und das mit frisch gültiger Anmeldung.
  const rohNext = searchParams.get("next") ?? "/";
  const next = rohNext.startsWith("/") && !rohNext.startsWith("//") ? rohNext : "/";

  const tokenHash = searchParams.get("token_hash");
  const typ = searchParams.get("type");
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (tokenHash && typ && ERLAUBTE_TYPEN.includes(typ)) {
    const { error } = await supabase.auth.verifyOtp({
      type: typ as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("Anmeldung fehlgeschlagen (verifyOtp):", error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("Anmeldung fehlgeschlagen (exchangeCodeForSession):", error.message);
  } else {
    // Der häufigste Fall, wenn etwas grundsätzlich nicht stimmt: siehe der
    // Hinweis zu den Standard-Vorlagen oben.
    console.error(
      "Anmeldung fehlgeschlagen: weder token_hash noch code in der Rücksprung-Adresse.",
    );
  }

  return NextResponse.redirect(`${origin}/konto?error=anmeldung_fehlgeschlagen`);
}
