// Server-Proxy für Nominatim-Reverse-Geocoding (Titelvorschlag beim
// Ort-erfassen-Flow, T7). Zwei Gründe, warum das nicht direkt im Browser
// läuft:
//  1. Nominatims Nutzungsbedingungen verlangen einen aussagekräftigen
//     User-Agent-Header - den kann JS im Browser nicht setzen (verbotener
//     Header), ein serverseitiger fetch() schon.
//  2. Nominatim erlaubt maximal 1 Anfrage/Sekunde. Die Drosselung unten
//     gilt pro warmer Serverinstanz - für die Größenordnung dieser App
//     (kostenfreier Dienst, geringe Last) ausreichend, siehe docs/PRD.md.
import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_USER_AGENT =
  "Baustellenjaeger/0.1 (+https://github.com/mbreilm/Staunorte)";
const MIN_ABSTAND_MS = 1000;

let letzteAnfrageMs = 0;

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ error: "lat/lon fehlt" }, { status: 400 });
  }

  const wartenMs = Math.max(0, MIN_ABSTAND_MS - (Date.now() - letzteAnfrageMs));
  if (wartenMs > 0) await new Promise((r) => setTimeout(r, wartenMs));
  letzteAnfrageMs = Date.now();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
      {
        headers: { "User-Agent": NOMINATIM_USER_AGENT },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return NextResponse.json({ strasse: null });

    const daten = await res.json();
    const strasse = (daten?.address?.road ?? daten?.address?.pedestrian ?? null) as
      | string
      | null;
    return NextResponse.json({ strasse });
  } catch {
    // Netzwerkfehler/Timeout: kein Fehlerfall für den Flow, der Titel
    // bleibt dann einfach leer und die Person tippt ihn selbst.
    return NextResponse.json({ strasse: null });
  }
}
