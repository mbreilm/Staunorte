// Foto-Upload (T8): vor dem Hochladen im Browser verkleinern und als
// WebP neu kodieren - dabei verschwindet EXIF automatisch (CLAUDE.md
// Regel 6: nie Originaldateien mit EXIF in den Storage schreiben).
import { createClient } from "@/lib/supabase/client";
import { leseExif } from "@/lib/geo/exif";

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

export type MehrfachUploadFortschritt = {
  index: number;
  gesamt: number;
  stufe: UploadFortschritt;
};

/**
 * Lädt mehrere Fotos nacheinander hoch (nicht parallel: das Verkleinern
 * mehrerer großer Fotos gleichzeitig belastet auf schwächeren Mobilgeräten
 * spürbar Speicher und Akku). EXIF wird pro Foto einzeln gelesen, damit
 * jedes Foto seine eigenen Koordinaten/sein eigenes Aufnahmedatum bekommt.
 */
export async function ladeFotosHoch(opts: {
  dateien: File[];
  placeId: string;
  hochgeladenVon: string;
  aufFortschritt?: (fortschritt: MehrfachUploadFortschritt) => void;
}): Promise<{ erfolgreich: number; fehlgeschlagen: number }> {
  let erfolgreich = 0;
  let fehlgeschlagen = 0;

  for (let i = 0; i < opts.dateien.length; i++) {
    const datei = opts.dateien[i];
    const exif = await leseExif(datei);
    const ergebnis = await ladeFotoHoch({
      datei,
      placeId: opts.placeId,
      hochgeladenVon: opts.hochgeladenVon,
      koordinaten:
        exif.lat !== null && exif.lon !== null ? { lat: exif.lat, lon: exif.lon } : null,
      aufgenommenAm: exif.aufgenommenAm,
      aufFortschritt: (stufe) =>
        opts.aufFortschritt?.({ index: i, gesamt: opts.dateien.length, stufe }),
    });
    if (ergebnis.ok) erfolgreich++;
    else fehlgeschlagen++;
  }

  return { erfolgreich, fehlgeschlagen };
}
