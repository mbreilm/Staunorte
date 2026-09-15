// Nimmt eine Rückmeldung aus dem Profil entgegen: speichert sie in der
// Datenbank und schickt sie als E-Mail an den Betreiber.
//
// Warum serverseitig und nicht direkt aus dem Browser: Der Schlüssel des
// Versanddienstes darf den Server nie verlassen. Im Browser wäre er für
// jeden lesbar, der die Entwicklerwerkzeuge öffnet - und damit eine
// fremde Versanderlaubnis auf unsere Domain.
//
// Reihenfolge mit Absicht: erst speichern, dann mailen. Scheitert der
// Versand (Tageslimit erreicht, Dienst gestört), ist die Rückmeldung
// trotzdem sicher und im Admin-Bereich nachlesbar. Andersherum wäre sie
// weg. Die Person bekommt in dem Fall trotzdem "danke" zu sehen - dass
// unser Postfach klemmt, ist nicht ihr Problem.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EMPFAENGER = "hallo@baustellenjaeger.com";
const ABSENDER = "Baustellenjäger <hallo@baustellenjaeger.com>";
const MAX_LAENGE = 2000;

function kuerzen(wert: unknown): string | null {
  if (typeof wert !== "string") return null;
  const sauber = wert.trim();
  return sauber ? sauber.slice(0, MAX_LAENGE) : null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ fehler: "nicht_angemeldet" }, { status: 401 });
  }

  let rumpf: unknown;
  try {
    rumpf = await request.json();
  } catch {
    return NextResponse.json({ fehler: "ungueltig" }, { status: 400 });
  }

  const eingabe = rumpf as Record<string, unknown>;
  const gefaellt = kuerzen(eingabe.gefaellt);
  const stoert = kuerzen(eingabe.stoert);
  const fehlt = kuerzen(eingabe.fehlt);

  if (!gefaellt && !stoert && !fehlt) {
    return NextResponse.json({ fehler: "leer" }, { status: 400 });
  }

  // Speichern über die Datenbankfunktion - dort sitzt auch die
  // Mengenbegrenzung (fünf Rückmeldungen pro Stunde und Konto).
  const { error } = await supabase.rpc("feedback_senden", {
    p_gefaellt: gefaellt,
    p_stoert: stoert,
    p_fehlt: fehlt,
  });

  if (error) {
    if (error.message.includes("ZU_VIELE_RUECKMELDUNGEN")) {
      return NextResponse.json({ fehler: "zu_viele" }, { status: 429 });
    }
    console.error("Feedback speichern fehlgeschlagen:", error.message);
    return NextResponse.json({ fehler: "speichern" }, { status: 500 });
  }

  await mailVersuchen({ gefaellt, stoert, fehlt, absender: user.email ?? "unbekannt" });

  return NextResponse.json({ ok: true });
}

async function mailVersuchen(daten: {
  gefaellt: string | null;
  stoert: string | null;
  fehlt: string | null;
  absender: string;
}) {
  const schluessel = process.env.RESEND_API_KEY;
  if (!schluessel) {
    // Kein Schlüssel hinterlegt: Die Rückmeldung ist gespeichert, nur der
    // Versand entfällt. Bewusst kein Fehler nach außen.
    console.error("RESEND_API_KEY fehlt - Feedback nur gespeichert, nicht gemailt.");
    return;
  }

  const abschnitt = (titel: string, text: string | null) =>
    text ? `${titel}\n${text}\n\n` : "";

  const text =
    `Neue Rückmeldung über die App\n` +
    `Von: ${daten.absender}\n\n` +
    abschnitt("── Was gefällt ──", daten.gefaellt) +
    abschnitt("── Was stört ──", daten.stoert) +
    abschnitt("── Was fehlt ──", daten.fehlt) +
    `Antworten geht direkt auf diese Mail.`;

  try {
    const antwort = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${schluessel}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ABSENDER,
        to: [EMPFAENGER],
        // Damit "Antworten" im Postfach direkt zur Person führt.
        reply_to: daten.absender,
        subject: `Rückmeldung von ${daten.absender}`,
        text,
      }),
    });

    if (!antwort.ok) {
      console.error(
        "Feedback-Mail abgelehnt:",
        antwort.status,
        (await antwort.text()).slice(0, 300),
      );
    }
  } catch (fehler) {
    console.error("Feedback-Mail fehlgeschlagen:", fehler);
  }
}
