export type EigenePosition = {
  lat: number;
  lon: number;
  accuracy: number | null;
};

export type PositionsWunsch = {
  /**
   * Genaue Ortung anfordern (GPS statt Funkzellen). Kostet Zeit und Akku -
   * richtig beim Erfassen eines Ortes, unnötig, wenn nur "4,2 km entfernt"
   * angezeigt werden soll.
   */
  genau?: boolean;
  /** Wie alt eine bereits bekannte Position sein darf, in Millisekunden. */
  maxAlterMs?: number;
  timeoutMs?: number;
};

/**
 * Aktuelle Geräteposition, oder null. Lehnt die Person ab, gibt es keinen
 * Standort und keinen Fehler - der Aufrufer entscheidet dann selbst, wie es
 * ohne weitergeht (CLAUDE.md: nie eine Sackgasse).
 *
 * Die Voreinstellungen sind auf Genauigkeit ausgelegt (Ort erfassen). Wer
 * nur eine grobe Entfernung braucht, fordert mit `{ genau: false }` eine
 * schnelle, notfalls zwischengespeicherte Position an - das ist auf dem
 * Handy der Unterschied zwischen sofort und mehreren Sekunden.
 */
export function holeEigenePosition(
  wunsch: PositionsWunsch = {},
): Promise<EigenePosition | null> {
  const { genau = true, maxAlterMs = 0, timeoutMs = 8000 } = wunsch;
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: genau, timeout: timeoutMs, maximumAge: maxAlterMs },
    );
  });
}
