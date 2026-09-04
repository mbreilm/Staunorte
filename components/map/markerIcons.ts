// Zeichnet die Marker-Icons als kleine Bitmaps und registriert sie bei
// MapLibre. Warum Canvas statt eines eingebauten Circle-Layers: MapLibres
// circle-stroke kann keine gestrichelte Linie - für unbestätigte
// Open-Data-Orte brauchen wir aber genau das (gestrichelter Umriss).
//
// Stil "Ring mit Fahrzeug-Icon": heller Kreis mit farbigem Ring statt
// voller Füllung, Kran-Silhouette in der Mitte statt reinem Punkt.
//
// Es gibt 8 Kombinationen: Farbe (frisch/alt) × Rand (voll/gestrichelt) ×
// Aktivitäts-Punkt (an/aus). Jede wird einmal pro Kartensitzung gezeichnet
// und über map.addImage() als "iconKey" verfügbar gemacht.
import type { Map as MapLibreMap } from "maplibre-gl";

const GRAU = "#a19786"; // --color-neutral-500: "keine frische Sichtung" - keine Kategoriefarbe, sondern ein Datenzustand
const RING_GRUND = "#f9f4ed"; // --color-neutral-100: helle Ringfüllung, unabhängig von der Kategoriefarbe
const AKTIV_PUNKT = "#8fa073"; // --color-accent-2-500: Status-Grün für "gerade in Arbeitszeiten"

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
  ctx.fillStyle = RING_GRUND;
  ctx.fill();

  if (opts.gestrichelt) {
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 3.5;
  } else {
    ctx.setLineDash([]);
    ctx.lineWidth = 4;
  }
  ctx.strokeStyle = opts.farbe;
  ctx.stroke();
  ctx.setLineDash([]);

  zeichneKranSilhouette(ctx, mitte, mitte, radius * 0.62, opts.farbe);

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

// Minimalistische Turmdrehkran-Silhouette - passt zu keiner einzelnen
// Fahrzeugmeldung, sondern steht generisch für "Baustelle" auf der Karte.
function zeichneKranSilhouette(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  farbe: string,
) {
  ctx.strokeStyle = farbe;
  ctx.fillStyle = farbe;
  ctx.lineWidth = Math.max(1.5, s * 0.14);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const maststart = { x: cx - s * 0.05, y: cy + s * 0.85 };
  const mastende = { x: cx - s * 0.05, y: cy - s * 0.55 };

  ctx.beginPath();
  ctx.moveTo(maststart.x, maststart.y);
  ctx.lineTo(mastende.x, mastende.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mastende.x - s * 0.55, mastende.y + s * 0.12);
  ctx.lineTo(mastende.x + s * 0.75, mastende.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mastende.x, mastende.y);
  ctx.lineTo(mastende.x - s * 0.4, mastende.y + s * 0.32);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mastende.x + s * 0.55, mastende.y + s * 0.06);
  ctx.lineTo(mastende.x + s * 0.55, mastende.y + s * 0.5);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(mastende.x + s * 0.55, mastende.y + s * 0.58, s * 0.09, 0, Math.PI * 2);
  ctx.fill();
}
