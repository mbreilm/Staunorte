// Foto-Upload für die Admin-Fotoverwaltung. Nutzt dieselbe Verkleinerung/
// EXIF-Entfernung wie der normale Erfassen-Flow (CLAUDE.md Regel 6), trägt
// die DB-Zeile aber über admin_foto_hinzufuegen() nach - die normale
// place_photos-Insert-Policy verlangt einen eigenen Check-in in den letzten
// 24h, was für Admin-Uploads nicht zutrifft.
import { createClient } from "@/lib/supabase/client";
import { verkleinernUndKodieren } from "@/lib/erfassen/fotoUpload";

const FOTO_BUCKET = "place-photos";

export async function ladeFotoAlsAdminHoch(
  datei: File,
  placeId: string,
): Promise<{ ok: true; fotoId: string } | { ok: false; fehler: string }> {
  const supabase = createClient();

  let blob: Blob;
  try {
    blob = await verkleinernUndKodieren(datei);
  } catch {
    return { ok: false, fehler: "Foto konnte nicht verarbeitet werden." };
  }

  const pfad = `${placeId}/${crypto.randomUUID()}.webp`;

  const { error: uploadFehler } = await supabase.storage
    .from(FOTO_BUCKET)
    .upload(pfad, blob, { contentType: "image/webp" });
  if (uploadFehler) return { ok: false, fehler: uploadFehler.message };

  const { data: fotoId, error: insertFehler } = await supabase.rpc(
    "admin_foto_hinzufuegen",
    { p_place_id: placeId, p_storage_path: pfad },
  );
  if (insertFehler) return { ok: false, fehler: insertFehler.message };

  return { ok: true, fotoId: fotoId! };
}
