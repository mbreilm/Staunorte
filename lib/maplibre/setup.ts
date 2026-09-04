// MapLibre lädt seinen Tile-Worker normalerweise über einen relativ zur
// eigenen Bundle-Datei berechneten Pfad (new URL('./maplibre-gl-worker.mjs',
// import.meta.url)). Turbopack packt Module in hash-benannte Chunks um,
// wodurch dieser berechnete Pfad ins Leere zeigt - der Worker lädt dann
// nie, und mit ihm nie ein einziges Kartenkachel-Tile (Style/Sprite/
// TileJSON laufen dagegen normal, die sind reine Hauptthread-fetch()-
// Aufrufe). Fix: den Worker als statische Datei unter public/ ausliefern
// und MapLibre explizit dorthin zeigen lassen - muss vor jedem
// `new maplibregl.Map(...)` einmal gelaufen sein.
//
// public/maplibre-gl-worker.mjs und public/maplibre-gl-shared.mjs sind
// 1:1-Kopien der gleichnamigen Dateien aus node_modules/maplibre-gl/dist/
// (passend zur in package.json gepinnten Version) - der Worker importiert
// "shared" per relativem Pfad, deshalb müssen beide Dateien nebeneinander
// ausgeliefert werden. Bei einem maplibre-gl-Update beide manuell nachziehen.
import { setWorkerUrl } from "maplibre-gl";

let eingerichtet = false;

export function richteMaplibreWorkerEin() {
  if (eingerichtet) return;
  setWorkerUrl("/maplibre-gl-worker.mjs");
  eingerichtet = true;
}
