// Prüfung, ob Koordinaten überhaupt brauchbar sind. Liegt bewusst in
// lib/geo und nicht in der Kartenkomponente: Sie wird auch gebraucht,
// bevor Werte in die Datenbank oder an die Route gehen.
/**
 * Sind das brauchbare Koordinaten?
 *
 * MapLibre wirft bei ungültigen Werten `Invalid LngLat object: (NaN, NaN)`.
 * Das Tückische daran: Ist die Kameraposition der Karte einmal auf NaN
 * gesetzt, wirft danach JEDE weitere Berechnung darauf erneut - beim
 * Zeichnen, beim Verschieben, beim Nachladen. Die Karte reagiert dann auf
 * nichts mehr, während der Rest der App normal weiterläuft. Genau dieses
 * Bild gab es auf dem iPhone.
 *
 * Deshalb wird jeder Wert geprüft, bevor er die Karte erreicht: `null`,
 * `undefined`, Text und NaN fallen hier raus. Number.isFinite() deckt
 * zusätzlich Infinity ab.
 */
export function sindKoordinatenBrauchbar(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

