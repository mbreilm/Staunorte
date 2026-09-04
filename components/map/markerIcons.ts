// Zeichnet die Marker-Icons als kleine Bitmaps und registriert sie bei
// MapLibre. Warum Canvas statt eines eingebauten Circle-Layers: MapLibres
// circle-stroke kann keine gestrichelte Linie - für unbestätigte
// Open-Data-Orte brauchen wir aber genau das (gestrichelter Umriss).
//
// Es gibt 8 Kombinationen: Farbe (frisch/alt) × Rand (voll/gestrichelt) ×
// Aktivitäts-Punkt (an/aus). Jede wird einmal pro Kartensitzung gezeichnet
// und über map.addImage() als "iconKey" verfügbar gemacht.
import type { Map as MapLibreMap } from "maplibre-gl";

const GRAU = "#9CA3AF"; // neutrales Grau für "keine frische Sichtung" - keine Kategoriefarbe, sondern ein Datenzustand
const AKTIV_PUNKT = "#22C55E"; // Status-Grün für "gerade in Arbeitszeiten" - ebenfalls kategorieunabhängig

type IconVariante = {
  farbig: boolean;
  gestrichelt: boolean;
  aktiv: boolean;
};

const VARIANTEN: IconVariante[] = [
  { farbig: false, gestrichelt: false, aktiv: false },
  { farbig: false, gestrichelt: false, aktiv: true },
  { farbig: false, gestrichelt: true, aktiv: false },
  { farbig: false, gestrichelt: true, aktiv: true },
  { farbig: true, gestrichelt: false, aktiv: false },
  { farbig: true, gestrichelt: false, aktiv: true },
  { farbig: true, gestrichelt: true, aktiv: false },
  { farbig: true, gestrichelt: true, aktiv: true },
];

export function markerIconKey(v: IconVariante): string {
  return `platz-${v.farbig ? "farbig" : "grau"}-${v.gestrichelt ? "gestrichelt" : "voll"}-${v.aktiv ? "aktiv" : "ruhe"}`;
}

/**
 * Zeichnet alle 8 Icon-Varianten und registriert sie bei der Karte.
 * `akzentfarbe` kommt aus place_categories.marker_style - Kategorien
 * dürfen unterschiedliche Farben haben, siehe CLAUDE.md Regel 2.
 */
export function registerMarkerIcons(map: MapLibreMap, akzentfarbe: string) {
  for (const variante of VARIANTEN) {
    const key = markerIconKey(variante);
    if (map.hasImage(key)) continue;

    const bild = zeichneIcon({
      farbe: variante.farbig ? akzentfarbe : GRAU,
      gestrichelt: variante.gestrichelt,
      zeigePunkt: variante.aktiv,
    });
    map.addImage(key, bild, { pixelRatio: 2 });
  }
}

function zeichneIcon(opts: {
  farbe: string;
  gestrichelt: boolean;
  zeigePunkt: boolean;
}): ImageData {
  // 48 physische Pixel = 24 CSS-Pixel bei pixelRatio 2 - für scharfe
  // Marker auch auf Retina-Displays.
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const mitte = size / 2;
  const radius = size / 2 - 8; // Rand lässt Platz für den Aktivitäts-Punkt

  ctx.beginPath();
  ctx.arc(mitte, mitte, radius, 0, Math.PI * 2);

  if (opts.gestrichelt) {
    // Unbestätigter Open-Data-Ort: hohler Kreis, gestrichelter Rand.
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 3.5;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();
    ctx.strokeStyle = opts.farbe;
    ctx.stroke();
  } else {
    // Normalfall: gefüllter Kreis mit weißem Rand für Kontrast auf der Karte.
    ctx.fillStyle = opts.farbe;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.stroke();
  }

  if (opts.zeigePunkt) {
    const punktRadius = 6;
    const punktX = mitte + radius * 0.72;
    const punktY = mitte - radius * 0.72;
    ctx.beginPath();
    ctx.arc(punktX, punktY, punktRadius, 0, Math.PI * 2);
    ctx.fillStyle = AKTIV_PUNKT;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, size, size);
}
