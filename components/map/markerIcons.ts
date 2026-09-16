// Zeichnet die Marker-Icons als kleine Bitmaps und registriert sie bei
// MapLibre. Warum Canvas statt eines eingebauten Circle-Layers: MapLibres
// circle-stroke kann keine gestrichelte Linie - für unbestätigte
// Open-Data-Orte brauchen wir aber genau das (gestrichelter Umriss).
//
// Stil "Ring mit Fahrzeug-Icon": heller Kreis mit farbigem Ring statt
// voller Füllung, Kran-Silhouette in der Mitte statt reinem Punkt.
//
// Es gibt 16 Kombinationen: Farbe (frisch/alt) × Rand (voll/gestrichelt) ×
// Aktivitäts-Punkt (an/aus) × Merkliste (ja/nein). Jede wird einmal pro
// Kartensitzung gezeichnet und über map.addImage() als "iconKey"
// verfügbar gemacht.
import type { Map as MapLibreMap } from "maplibre-gl";

const GRAU = "#a19786"; // --color-neutral-500: "keine frische Sichtung" - keine Kategoriefarbe, sondern ein Datenzustand
const RING_GRUND = "#f9f4ed"; // --color-neutral-100: helle Ringfüllung, unabhängig von der Kategoriefarbe
const AKTIV_PUNKT = "#8fa073";
// Der Stern für die eigene Merkliste. Bewusst der Akzentton der App und
// nicht das Aktivitäts-Grün: Das eine ist ein Zustand der Baustelle, das
// andere eine persönliche Notiz - die dürfen nicht verwechselbar sein.
const MERK_STERN = "#c67139"; // --color-accent-2-500: Status-Grün für "gerade in Arbeitszeiten"

type IconVariante = {
  farbig: boolean;
  gestrichelt: boolean;
  aktiv: boolean;
  gemerkt: boolean;
};

// Ausgeschrieben waeren es 16 Zeilen - erzeugt statt getippt, damit beim
// naechsten Zustand nicht wieder jede Kombination von Hand nachgezogen
// werden muss.
const VARIANTEN: IconVariante[] = [false, true].flatMap((farbig) =>
  [false, true].flatMap((gestrichelt) =>
    [false, true].flatMap((aktiv) =>
      [false, true].map((gemerkt) => ({ farbig, gestrichelt, aktiv, gemerkt })),
    ),
  ),
);

export function markerIconKey(v: IconVariante): string {
  return `platz-${v.farbig ? "farbig" : "grau"}-${v.gestrichelt ? "gestrichelt" : "voll"}-${v.aktiv ? "aktiv" : "ruhe"}-${v.gemerkt ? "gemerkt" : "offen"}`;
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
      zeigeStern: variante.gemerkt,
    });
    map.addImage(key, bild, { pixelRatio: 2 });
  }
}

function zeichneIcon(opts: {
  farbe: string;
  gestrichelt: boolean;
  zeigePunkt: boolean;
  zeigeStern: boolean;
}): ImageData {
  // 56 physische Pixel = 28 CSS-Pixel bei pixelRatio 2 - für scharfe
  // Marker auch auf Retina-Displays. Die Fläche ist groesser als der Ring
  // braucht: Der Merk-Stern sass vorher am Rand der Zeichenflaeche fest
  // und konnte deshalb nicht groesser werden.
  const size = 56;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const mitte = size / 2;
  // Fester Ringradius statt aus der Flaechengroesse abgeleitet: Der Kreis
  // soll gleich gross bleiben, auch wenn die Flaeche drumherum waechst.
  const radius = 16;

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

  // Stern unten links - gegenueber dem Aktivitaets-Punkt oben rechts,
  // damit sich beide nie ueberdecken. Deutlich groesser als der
  // Aktivitaets-Punkt: Er soll auf einen Blick auffallen, auch auf den
  // gestrichelten Rändern der importierten Orte.
  if (opts.zeigeStern) {
    zeichneStern(ctx, mitte - radius * 0.85, mitte + radius * 0.85, 11);
  }

  return ctx.getImageData(0, 0, size, size);
}

function zeichneStern(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    // Abwechselnd aussen und innen ergibt die fuenf Zacken.
    const laenge = i % 2 === 0 ? r : r * 0.45;
    const winkel = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(winkel) * laenge;
    const y = cy + Math.sin(winkel) * laenge;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  // Weisser Rand zuerst und breit: So bekommt der Stern einen Saum, der
  // ihn von allem darunter abhebt - auch vom gestrichelten Ring.
  ctx.lineWidth = 3.5;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.fillStyle = MERK_STERN;
  ctx.fill();
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
