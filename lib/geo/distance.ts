// Haversine-Formel: Abstand zwischen zwei Punkten auf einer Kugel.
// Für die kurzen Distanzen hier (Kilometer, nicht Kontinente) ist das
// genau genug - eine echte Ellipsoid-Berechnung wäre überdimensioniert.

const ERDRADIUS_M = 6_371_000;

export type LatLon = { lat: number; lon: number };

export function haversineMeters(a: LatLon, b: LatLon): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * ERDRADIUS_M * Math.asin(Math.sqrt(h));
}

// Für die Vorschau beim Antippen eines Markers: unter 1 km in ganzen
// Metern, ab 1 km in Kilometern mit einer Nachkommastelle (deutsches
// Komma statt Punkt).
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toFixed(1).replace(".", ",")} km`;
}
