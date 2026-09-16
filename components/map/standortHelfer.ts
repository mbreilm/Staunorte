// Hilfsmittel rund um den eigenen Standort und die Prüfung von
// Koordinaten - herausgelöst aus MapView.tsx, das mit 875 Zeilen zu viel
// auf einmal machte.
//
// Bewusst ohne React: Das hier sind reine Funktionen, die sich einzeln
// lesen und prüfen lassen. Genau hier sassen zwei der Fehler, die uns
// einen Abend gekostet haben - der synchrone Wurf der Permissions-API und
// die NaN-Koordinaten, die die Karte lahmlegten.

// Merkt sich, dass der Standort in diesem Browser schon einmal freigegeben
// wurde. Nötig wegen Safari auf dem iPhone: Dort lässt sich die erteilte
// Berechtigung nicht abfragen (siehe berechtigungsStatus()), und ohne diese
// Notiz hätten wir bei JEDEM Laden erneut danach gefragt - obwohl längst
// zugestimmt wurde.
const STANDORT_ERLAUBT_SCHLUESSEL = "baustellenjaeger:standort-erlaubt";

export function standortSchonErlaubt(): boolean {
  try {
    return window.localStorage.getItem(STANDORT_ERLAUBT_SCHLUESSEL) === "1";
  } catch {
    return false;
  }
}

export function standortErlaubnisMerken(): void {
  try {
    // Erst lesen: Die laufende Standortverfolgung meldet im Gehen dauernd
    // neue Positionen, und jedes Mal in den Speicher zu schreiben wäre
    // unnötige Arbeit auf dem Gerät.
    if (window.localStorage.getItem(STANDORT_ERLAUBT_SCHLUESSEL) === "1") return;
    window.localStorage.setItem(STANDORT_ERLAUBT_SCHLUESSEL, "1");
  } catch {
    // Kein Storage-Zugriff (privater Modus) - dann eben jedes Mal fragen.
  }
}

/**
 * Berechtigungsstatus für den Standort, oder `null`, wenn der Browser
 * darüber keine Auskunft gibt.
 *
 * Bewusst großzügig abgesichert: Safari auf iOS kennt den Deskriptor
 * "geolocation" nicht. Je nach Version fehlt `navigator.permissions` ganz
 * oder die Abfrage wirft - teils als abgelehntes Versprechen, teils sofort.
 * Ein sofortiger Wurf umgeht jedes angehängte `.catch()` und riss vorher
 * die ganze App mit sich (der Effekt starb, React baute den Baum ab, die
 * Seite war eingefroren). Deshalb hier alles in einer async-Funktion mit
 * try/catch - damit wird auch ein sofortiger Wurf zu einem stillen `null`.
 */
export async function berechtigungsStatus(): Promise<PermissionStatus | null> {
  try {
    if (!navigator.permissions?.query) return null;
    return await navigator.permissions.query({ name: "geolocation" });
  } catch {
    return null;
  }
}

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
