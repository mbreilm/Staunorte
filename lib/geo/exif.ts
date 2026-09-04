// EXIF aus Foto lesen - GPS UND Aufnahmedatum in einem Durchgang, damit
// die Datei nicht zweimal geparst werden muss (Standort wird sofort für
// den Erfassungs-Flow gebraucht, das Datum erst beim Foto-Upload).
//
// Siehe PRD 6.2: GPS aus EXIF ist eine Optimierung, kein tragender
// Mechanismus (viele Browser/iOS entfernen EXIF beim Teilen). Schlägt
// die Auswertung fehl, ist das kein Fehlerfall, nur "nichts gefunden".
import { parse } from "exifr";

export type ExifDaten = {
  lat: number | null;
  lon: number | null;
  aufgenommenAm: string | null;
};

export async function leseExif(datei: File): Promise<ExifDaten> {
  try {
    const daten = await parse(datei, { gps: true, pick: ["DateTimeOriginal"] });
    const hatKoordinaten =
      typeof daten?.latitude === "number" && typeof daten?.longitude === "number";
    const datum: Date | undefined = daten?.DateTimeOriginal;

    return {
      lat: hatKoordinaten ? daten.latitude : null,
      lon: hatKoordinaten ? daten.longitude : null,
      aufgenommenAm: datum instanceof Date ? datum.toISOString() : null,
    };
  } catch {
    // Kaputtes oder fehlendes EXIF - kein Fehler, siehe oben.
    return { lat: null, lon: null, aufgenommenAm: null };
  }
}
