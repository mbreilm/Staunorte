// GPS aus Foto-EXIF lesen - siehe PRD 6.2: das ist eine Optimierung,
// kein tragender Mechanismus (viele Browser/iOS entfernen EXIF beim
// Teilen). Schlägt die Auswertung fehl, ist das kein Fehlerfall, nur
// "keine Koordinaten gefunden" - der Aufrufer fällt dann auf den
// Gerätestandort zurück.
import { parse } from "exifr";

export async function leseExifStandort(
  datei: File,
): Promise<{ lat: number; lon: number } | null> {
  try {
    const daten = await parse(datei, { gps: true });
    if (
      typeof daten?.latitude === "number" &&
      typeof daten?.longitude === "number"
    ) {
      return { lat: daten.latitude, lon: daten.longitude };
    }
  } catch {
    // Kaputtes oder fehlendes EXIF - kein Fehler, siehe oben.
  }
  return null;
}
