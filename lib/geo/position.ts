export type EigenePosition = {
  lat: number;
  lon: number;
  accuracy: number | null;
};

/**
 * Aktuelle Geräteposition, oder null. Lehnt die Person ab, gibt es keinen
 * Standort und keinen Fehler - der Aufrufer entscheidet dann selbst, wie es
 * ohne weitergeht (CLAUDE.md: nie eine Sackgasse).
 */
export function holeEigenePosition(): Promise<EigenePosition | null> {
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
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}
