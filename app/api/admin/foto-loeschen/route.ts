// Löscht ein Foto endgültig: erst die Bilddatei, dann den Datensatz.
//
// Warum eine Server-Route und nicht wie bisher nur eine Datenbankfunktion:
// Supabase verbietet inzwischen das direkte Löschen in `storage.objects`.
// admin_foto_loeschen() versuchte genau das und verschluckte den Fehler -
// der Datensatz verschwand, die Datei blieb liegen und war weiterhin für
// jeden abrufbar, der die Adresse kannte. Bei einem Foto, das gemeldet
// wurde, weil Personen darauf erkennbar sind, ist das kein Schönheits-
// fehler, sondern der eigentliche Zweck des Löschens.
//
// Reihenfolge mit Absicht: erst die Datei, dann der Datensatz. Scheitert
// das Entfernen der Datei, bricht alles ab und der Datensatz bleibt
// stehen - so bleibt der Ort auffindbar, statt eine unauffindbare Leiche
// im Speicher zu hinterlassen.
import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin/requireAdmin";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET = "place-photos";

export async function POST(request: NextRequest) {
  const { supabase, istAdmin } = await getAdminContext();
  if (!istAdmin) {
    return NextResponse.json({ fehler: "kein_admin" }, { status: 403 });
  }

  let rumpf: unknown;
  try {
    rumpf = await request.json();
  } catch {
    return NextResponse.json({ fehler: "ungueltig" }, { status: 400 });
  }
  const fotoId = (rumpf as { fotoId?: unknown }).fotoId;
  if (typeof fotoId !== "string") {
    return NextResponse.json({ fehler: "fotoId fehlt" }, { status: 400 });
  }

  // Pfad über den Dienstschlüssel lesen: Auch ausgeblendete Fotos müssen
  // löschbar sein, und genau die versteckt die Zeilensicherheit.
  const dienst = createServiceClient();
  const { data: foto, error: leseFehler } = await dienst
    .from("place_photos")
    .select("storage_path")
    .eq("id", fotoId)
    .maybeSingle();

  if (leseFehler) {
    console.error("Foto nachschlagen fehlgeschlagen:", leseFehler.message);
    return NextResponse.json({ fehler: "lesen" }, { status: 500 });
  }
  if (!foto) {
    return NextResponse.json({ fehler: "nicht_gefunden" }, { status: 404 });
  }

  const { error: dateiFehler } = await dienst.storage
    .from(BUCKET)
    .remove([foto.storage_path]);

  if (dateiFehler) {
    console.error("Bilddatei löschen fehlgeschlagen:", dateiFehler.message);
    return NextResponse.json({ fehler: "datei" }, { status: 500 });
  }

  // Datensatz über die bestehende Funktion - die prüft die Adminrechte
  // ein zweites Mal, unabhängig von dieser Route.
  const { error: satzFehler } = await supabase.rpc("admin_foto_loeschen", {
    p_photo_id: fotoId,
  });
  if (satzFehler) {
    console.error("Fotodatensatz löschen fehlgeschlagen:", satzFehler.message);
    return NextResponse.json({ fehler: "datensatz" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
