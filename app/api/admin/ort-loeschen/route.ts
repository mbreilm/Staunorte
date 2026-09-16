// Löscht einen Ort endgültig - samt aller Bilddateien.
//
// Gleicher Grund wie bei foto-loeschen: admin_ort_loeschen() versuchte die
// Dateien direkt aus `storage.objects` zu entfernen, was Supabase nicht
// mehr zulässt; der Fehler wurde verschluckt und die Bilder blieben
// öffentlich abrufbar.
//
// Die Datensätze selbst hängen per Fremdschlüssel am Ort und gehen mit
// ihm; nur die Dateien im Speicher brauchen diesen Umweg.
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
  const placeId = (rumpf as { placeId?: unknown }).placeId;
  if (typeof placeId !== "string") {
    return NextResponse.json({ fehler: "placeId fehlt" }, { status: 400 });
  }

  const dienst = createServiceClient();
  const { data: fotos, error: leseFehler } = await dienst
    .from("place_photos")
    .select("storage_path")
    .eq("place_id", placeId);

  if (leseFehler) {
    console.error("Fotos nachschlagen fehlgeschlagen:", leseFehler.message);
    return NextResponse.json({ fehler: "lesen" }, { status: 500 });
  }

  if (fotos && fotos.length > 0) {
    const { error: dateiFehler } = await dienst.storage
      .from(BUCKET)
      .remove(fotos.map((f) => f.storage_path));
    if (dateiFehler) {
      console.error("Bilddateien löschen fehlgeschlagen:", dateiFehler.message);
      return NextResponse.json({ fehler: "dateien" }, { status: 500 });
    }
  }

  const { error: satzFehler } = await supabase.rpc("admin_ort_loeschen", {
    p_place_id: placeId,
  });
  if (satzFehler) {
    console.error("Ort löschen fehlgeschlagen:", satzFehler.message);
    return NextResponse.json({ fehler: "datensatz" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, dateien: fotos?.length ?? 0 });
}
