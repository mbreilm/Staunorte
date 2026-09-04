// Foto-Upload (T8): vor dem Hochladen im Browser verkleinern und als
// WebP neu kodieren - dabei verschwindet EXIF automatisch (CLAUDE.md
// Regel 6: nie Originaldateien mit EXIF in den Storage schreiben).
import { createClient } from "@/lib/supabase/client";

const FOTO_BUCKET = "place-photos";
const MAX_KANTE_PX = 1600;
const WEBP_QUALITAET = 0.8;

export type UploadFortschritt = "verkleinern" | "hochladen";
export type UploadErgebnis = { ok: true } | { ok: false; fehler: string };

async function verkleinernUndKodieren(datei: File): Promise<Blob> {
  const bild = await createImageBitmap(datei, { imageOrientation: "from-image" });
  try {
    const skala = Math.min(1, MAX_KANTE_PX / Math.max(bild.width, bild.height));
    const breite = Math.round(bild.width * skala);
    const hoehe = Math.round(bild.height * skala);

    const canvas = document.createElement("canvas");
    canvas.width = breite;
    canvas.height = hoehe;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas nicht verfügbar");
    ctx.drawImage(bild, 0, 0, breite, hoehe);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITAET),
    );
    if (!blob) throw new Error("Kodierung fehlgeschlagen");
    return blob;
  } finally {
    bild.close();
  }
}

export async function ladeFotoHoch(opts: {
  datei: File;
  placeId: string;
  hochgeladenVon: string;
  koordinaten: { lat: number; lon: number } | null;
  aufgenommenAm: string | null;
  aufFortschritt?: (stufe: UploadFortschritt) => void;
}): Promise<UploadErgebnis> {
  const supabase = createClient();

  let blob: Blob;
  try {
    opts.aufFortschritt?.("verkleinern");
    blob = await verkleinernUndKodieren(opts.datei);
  } catch {
    return { ok: false, fehler: "Foto konnte nicht verarbeitet werden." };
  }

  opts.aufFortschritt?.("hochladen");
  const pfad = `${opts.placeId}/${crypto.randomUUID()}.webp`;

  const { error: uploadFehler } = await supabase.storage
    .from(FOTO_BUCKET)
    .upload(pfad, blob, { contentType: "image/webp" });
  if (uploadFehler) return { ok: false, fehler: uploadFehler.message };

  const { error: insertFehler } = await supabase.from("place_photos").insert({
    place_id: opts.placeId,
    storage_path: pfad,
    uploaded_by: opts.hochgeladenVon,
    taken_at: opts.aufgenommenAm,
    exif_lat: opts.koordinaten?.lat ?? null,
    exif_lon: opts.koordinaten?.lon ?? null,
  });
  if (insertFehler) return { ok: false, fehler: insertFehler.message };

  return { ok: true };
}
