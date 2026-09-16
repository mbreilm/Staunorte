"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map as MapLibreMap,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createClient } from "@/lib/supabase/client";
import type { ObservableType, PlaceNearby } from "@/lib/supabase/types";
import { haversineMeters } from "@/lib/geo/distance";
import { richteMaplibreWorkerEin } from "@/lib/maplibre/setup";
import { IconStandort } from "@/lib/icons";
import { useMerkliste } from "@/components/merkliste/MerklisteProvider";
import { sindKoordinatenBrauchbar } from "./standortHelfer";
import { useEigenerStandort } from "./useEigenerStandort";
import { registerMarkerIcons, markerIconKey } from "./markerIcons";
import { LocationHint } from "./LocationHint";
import { PlacePreviewSheet } from "./PlacePreviewSheet";
import { FilterPillRow } from "./FilterPillRow";
import { FilterSheet } from "./FilterSheet";

// Fallback, falls die Env-Variablen mal fehlen - München-Zentrum.
const STANDARD_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "48.1372");
const STANDARD_LON = Number(process.env.NEXT_PUBLIC_DEFAULT_LON ?? "11.5756");
const KATEGORIE = process.env.NEXT_PUBLIC_DEFAULT_CATEGORY || "baustelle";
// Notfall-Fallback, nur falls place_categories.marker_style keine Farbe hat.
const NOTFALL_AKZENTFARBE = "#c67139";
// Notfall-Fallback für observable_label - bewusst neutral, keine
// Kategoriesprache (CLAUDE.md Regel 2), nur falls die Abfrage fehlschlägt.
const NOTFALL_BEOBACHTUNGSLABEL = "Beobachtungen";

const ENTPRELLUNG_MS = 300;
const MIN_RADIUS_M = 300;
const MAX_RADIUS_M = 50_000;

type OrtEigenschaften = {
  id: string;
  title: string;
  iconKey: string;
};

// Baut aus den places_nearby()-Zeilen eine GeoJSON-FeatureCollection, wie
// MapLibre sie für Quellen erwartet. Die Icon-Auswahl (Farbe/Rand/Punkt)
// wird hier einmal pro Ort berechnet und als iconKey mitgegeben.
// "1500" statt "1.5 km" bei kleinen Umkreisen, damit der Wert in der Pille
// nicht auf eine Nachkommastelle gerundet und dadurch ungenau wirkt.
function formatiereRadius(meter: number): string {
  return meter >= 1000 ? `${Math.round(meter / 1000)} km` : `${meter} m`;
}

function baueFeatureCollection(
  orte: PlaceNearby[],
  gemerkt: ReadonlySet<string>,
): GeoJSON.FeatureCollection<GeoJSON.Point, OrtEigenschaften> {
  return {
    type: "FeatureCollection",
    features: orte
      .filter((ort) => sindKoordinatenBrauchbar(ort.lat, ort.lon))
      .map((ort) => {
      const farbig = ort.fresh_observables > 0;
      const gestrichelt = ort.source === "open_data" && !ort.is_confirmed;
      const aktiv = ort.activity === "aktiv";
      const istGemerkt = gemerkt.has(ort.id);

      return {
        type: "Feature",
        id: ort.id,
        geometry: { type: "Point", coordinates: [ort.lon, ort.lat] },
        properties: {
          id: ort.id,
          title: ort.title,
          iconKey: markerIconKey({ farbig, gestrichelt, aktiv, gemerkt: istGemerkt }),
        },
      };
    }),
  };
}

// Wird dauerhaft in app/layout.tsx gemountet statt pro Seitenaufruf neu
// erzeugt: die Karte (WebGL-Kontext, Worker, Stil/Sprites/Fonts, Marker-
// Icons, places_nearby()) wäre bei jedem Tab-Wechsel komplett neu
// aufzubauen, das machte den Wechsel zwischen Karte und Album spürbar
// träge. Stattdessen bleibt die Karte immer gemountet und wird beim
// Verlassen des Karten-Tabs nur unsichtbar geschaltet (nicht entfernt).
export function MapView() {
  const pathname = usePathname();
  const aktiverTab = pathname === "/";
  const { gemerkt } = useMerkliste();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const entprellungRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orteRef = useRef<PlaceNearby[]>([]);
  const [beobachtungsLabel, setBeobachtungsLabel] = useState(
    NOTFALL_BEOBACHTUNGSLABEL,
  );
  const [ausgewaehlterOrt, setAusgewaehlterOrt] = useState<PlaceNearby | null>(
    null,
  );

  // Filter (T-Filter): Radius-Override, "Jetzt aktiv", "Fahrzeuge aktuell
  // gesehen" und Fahrzeugtyp-Auswahl. Die eigentliche Filterlogik läuft in
  // der Datenbank (places_nearby(), CLAUDE.md Regel 5) - das Frontend hält
  // hier nur die Auswahl und lädt bei Änderung neu.
  const [observableTypes, setObservableTypes] = useState<ObservableType[]>([]);
  const [filterOffen, setFilterOffen] = useState(false);
  const [radiusUeberschreibungM, setRadiusUeberschreibungM] = useState<
    number | null
  >(null);
  const [radiusAnzeigeM, setRadiusAnzeigeM] = useState(3000);
  const [nurAktiv, setNurAktiv] = useState(false);
  const [nurFahrzeugeSichtbar, setNurFahrzeugeSichtbar] = useState(false);
  const [nurGemerkte, setNurGemerkte] = useState(false);
  const [ausgewaehlteTypIds, setAusgewaehlteTypIds] = useState<string[]>([]);

  // ladeOrte() entsteht erst innerhalb des Karten-Effekts (unten) und
  // schließt dort über die Map-Instanz; die Filter-Werte kommen deshalb über
  // eine Ref herein statt über Closure-Variablen, die beim ersten Rendern
  // eingefroren wären.
  const filterRef = useRef({
    radiusUeberschreibungM: null as number | null,
    nurAktiv: false,
    nurFahrzeugeSichtbar: false,
    nurGemerkte: false,
    ausgewaehlteTypIds: [] as string[],
  });
  const ladeOrteRef = useRef<() => void>(() => {});

  // Standort, Marker, Verfolgung und Zentrieren stecken in einem eigenen
  // Baustein - siehe useEigenerStandort.ts.
  const {
    zeigeStandortHinweis,
    hinweisSchliessen,
    standortHinweisOderDirekt,
    standortVerwenden,
    aufStandortZentrieren,
    aufraeumen,
    zentrierenAbbrechen,
  } = useEigenerStandort(mapRef, aktiverTab);
  // Der Kartenaufbau laeuft nur einmal und wuerde `gemerkt` sonst in seinem
  // ersten Stand einfrieren - deshalb ueber eine Ref hereinreichen.
  const gemerktRef = useRef<ReadonlySet<string>>(gemerkt);
  const warAktivRef = useRef(false);
  const kartenBereitRef = useRef(false);


  useEffect(() => {
    if (!containerRef.current) return;

    richteMaplibreWorkerEin();
    const supabase = createClient();

    // Kategorie-Metadaten laden, bevor Marker gezeichnet werden - Farbe und
    // Beschriftung sind Kategorie-Konfiguration (place_categories), nicht im
    // Code hartkodiert (CLAUDE.md Regel 2: keine kategoriespezifischen
    // Werte im Frontend). Läuft parallel zum Kartenstil-Laden.
    async function ladeKategorie(): Promise<{
      farbe: string;
      beobachtungsLabel: string;
    }> {
      try {
        const { data } = await supabase
          .from("place_categories")
          .select("marker_style, observable_label")
          .eq("id", KATEGORIE)
          .maybeSingle();
        const style = data?.marker_style as { color?: string } | null;
        return {
          farbe: style?.color ?? NOTFALL_AKZENTFARBE,
          beobachtungsLabel: data?.observable_label ?? NOTFALL_BEOBACHTUNGSLABEL,
        };
      } catch {
        return {
          farbe: NOTFALL_AKZENTFARBE,
          beobachtungsLabel: NOTFALL_BEOBACHTUNGSLABEL,
        };
      }
    }
    const kategoriePromise = ladeKategorie();

    const map = new MapLibreMap({
      container: containerRef.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL!,
      center: [STANDARD_LON, STANDARD_LAT],
      zoom: 13,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    // Diagnose-Zugang. Die Karte ist das Herzstück der App, lässt sich aber
    // von außen nicht befragen - beim Suchen des NaN-Fehlers auf dem iPhone
    // hat genau das Stunden gekostet. Über `window.karte` kommt man in der
    // Browser-Konsole an die Kameraposition heran. Nur lesender Zugriff auf
    // etwas, das ohnehin im Browser des Betrachters läuft; kein Risiko.
    (window as unknown as { karte?: MapLibreMap }).karte = map;

    // Lädt Baustellen im aktuellen Kartenausschnitt über places_nearby().
    // Der Radius wird aus der sichtbaren Fläche abgeleitet (Abstand
    // Zentrum -> Kartenecke), damit beim Rauszoomen automatisch mehr
    // geladen wird und beim Reinzoomen weniger.
    async function ladeOrte() {
      const zentrum = map.getCenter();
      const ecke = map.getBounds().getNorthEast();
      const radius =
        filterRef.current.radiusUeberschreibungM ??
        Math.min(
          MAX_RADIUS_M,
          Math.max(
            MIN_RADIUS_M,
            Math.round(
              haversineMeters(
                { lat: zentrum.lat, lon: zentrum.lng },
                { lat: ecke.lat, lon: ecke.lng },
              ),
            ),
          ),
        );
      setRadiusAnzeigeM(radius);

      const { data, error } = await supabase.rpc("places_nearby", {
        p_lat: zentrum.lat,
        p_lon: zentrum.lng,
        p_radius_m: radius,
        p_category: KATEGORIE,
        p_only_active: filterRef.current.nurAktiv,
        p_observable_type_ids: filterRef.current.ausgewaehlteTypIds.length
          ? filterRef.current.ausgewaehlteTypIds
          : null,
        p_only_bookmarked: filterRef.current.nurGemerkte,
      });

      if (error) {
        // Bewusst kein Fehler-UI: ein einzelner fehlgeschlagener Nachlade-
        // Versuch beim Verschieben der Karte soll die Ansicht nicht
        // blockieren - die zuletzt geladenen Marker bleiben stehen.
        console.error("places_nearby fehlgeschlagen:", error.message);
        return;
      }

      // "Fahrzeuge aktuell gesehen" ist kein DB-Parameter: places_nearby()
      // liefert fresh_observables schon mit, ein Nachfiltern hier spart einen
      // eigenen RPC-Parameter für ein rein clientseitiges Anzeigekriterium.
      const gefiltert = filterRef.current.nurFahrzeugeSichtbar
        ? (data ?? []).filter((ort) => ort.fresh_observables > 0)
        : (data ?? []);

      orteRef.current = gefiltert;
      const quelle = map.getSource("orte") as GeoJSONSource | undefined;
      quelle?.setData(baueFeatureCollection(gefiltert, gemerktRef.current));
    }
    ladeOrteRef.current = ladeOrte;

    // Entprellt auf 300 ms, damit während des Schiebens/Zoomens nicht bei
    // jedem Zwischenschritt neu geladen wird.
    function ladeOrteEntprellt() {
      if (entprellungRef.current) clearTimeout(entprellungRef.current);
      entprellungRef.current = setTimeout(ladeOrte, ENTPRELLUNG_MS);
    }

    map.on("load", async () => {
      const kategorie = await kategoriePromise;
      const akzentfarbe = kategorie.farbe;
      registerMarkerIcons(map, akzentfarbe);
      setBeobachtungsLabel(kategorie.beobachtungsLabel);

      map.addSource("orte", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 50,
        // Ab Zoomstufe 12 werden einzelne Punkte statt Clustern gezeigt.
        clusterMaxZoom: 11,
      });

      // Cluster-Blasen: Kreis + Anzahl als Text.
      map.addLayer({
        id: "cluster-kreise",
        type: "circle",
        source: "orte",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": akzentfarbe,
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 26],
        },
      });

      map.addLayer({
        id: "cluster-zahl",
        type: "symbol",
        source: "orte",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 13,
        },
        paint: { "text-color": "#ffffff" },
      });

      // Einzelne Orte: vorgezeichnetes Icon je nach Frische/Bestätigung/Aktivität.
      map.addLayer({
        id: "einzelne-orte",
        type: "symbol",
        source: "orte",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["get", "iconKey"],
          "icon-allow-overlap": true,
          "icon-anchor": "center",
        },
      });

      // Tap auf einen Cluster zoomt so weit rein, bis er sich auflöst.
      map.on("click", "cluster-kreise", async (e: MapLayerMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["cluster-kreise"],
        });
        const clusterId = features[0]?.properties?.cluster_id;
        const geometry = features[0]?.geometry;
        if (clusterId === undefined || geometry?.type !== "Point") return;

        const quelle = map.getSource("orte") as GeoJSONSource;
        const zielZoom = await quelle.getClusterExpansionZoom(clusterId);
        map.easeTo({
          center: geometry.coordinates as [number, number],
          zoom: zielZoom,
        });
      });

      map.on("mouseenter", "cluster-kreise", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "cluster-kreise", () => {
        map.getCanvas().style.cursor = "";
      });

      // Tap auf einen einzelnen Ort öffnet die Vorschau (T5). Die vollen
      // Ortsdaten stehen nicht im GeoJSON (nur id/title/iconKey), sondern
      // kommen aus orteRef - dem zuletzt geladenen places_nearby()-Ergebnis.
      map.on("click", "einzelne-orte", (e: MapLayerMouseEvent) => {
        const id = e.features?.[0]?.properties?.id;
        if (!id) return;
        const ort = orteRef.current.find((o) => o.id === id);
        if (ort) setAusgewaehlterOrt(ort);
      });

      map.on("mouseenter", "einzelne-orte", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "einzelne-orte", () => {
        map.getCanvas().style.cursor = "";
      });

      kartenBereitRef.current = true;
      ladeOrte();
    });

    // Bewusst NICHT im "load"-Handler: der wartet auf den Kartenstil von
    // einem fremden Server. Ist der gerade langsam, stünde die Ortung
    // minutenlang still, obwohl Kamerabewegungen (flyTo) auch vor dem
    // Stil schon funktionieren. Die Ortung läuft deshalb parallel.
    standortHinweisOderDirekt();

    map.on("moveend", ladeOrteEntprellt);

    // Schiebt oder zoomt jemand selbst, bevor die erste Ortung da ist, wird
    // nicht mehr automatisch zentriert - ein Sprung mitten in die eigene
    // Bewegung wäre ärgerlich. `originalEvent` unterscheidet dabei die
    // Geste von unserem eigenen flyTo(). Der Zentrieren-Button bleibt.
    map.on("movestart", (e) => {
      if (e.originalEvent) zentrierenAbbrechen();
    });

    return () => {
      if (entprellungRef.current) clearTimeout(entprellungRef.current);
      aufraeumen();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- die Karte wird bewusst nur einmal aufgebaut; standortHinweisOderDirekt arbeitet ausschließlich auf Refs und Settern
  }, []);

  // Merkliste geaendert? Dann die Marker sofort neu zeichnen - ohne die
  // Orte erneut zu laden. Nimmt jemand auf der Listenseite oder der
  // Detailseite einen Ort herunter, verschwindet der Stern damit auch auf
  // der Karte, ohne dass die Seite neu geladen werden muss.
  useEffect(() => {
    gemerktRef.current = gemerkt;
    const quelle = mapRef.current?.getSource("orte") as GeoJSONSource | undefined;
    quelle?.setData(baueFeatureCollection(orteRef.current, gemerkt));
  }, [gemerkt]);

  // Beim Zurueckkehren zur Karte die Orte neu laden.
  //
  // Die Karte bleibt dauerhaft eingehaengt und laedt sonst nur beim
  // Verschieben, Zoomen oder Filtern nach. Alles, was anderswo passiert,
  // bekaeme sie nie mit: ein gerade erfasster Ort fehlte auf der Karte,
  // ein Marker bliebe nach dem Check-in grau statt farbig, ein im
  // Admin-Bereich ausgeblendeter Ort staende weiter da - jeweils bis man
  // die Karte einmal anfasst.
  //
  // Bewusst hier und nicht an jeder einzelnen Aktion: Sonst muss man bei
  // jedem neuen Feature daran denken, die Karte zu benachrichtigen, und
  // vergisst genau eines. Kosten sind eine Abfrage pro Rueckkehr - dieselbe,
  // die beim Verschieben ohnehin laeuft.
  useEffect(() => {
    // Nur beim WECHSEL auf die Karte, nicht beim ersten Einhaengen - dort
    // laedt die Karte ohnehin selbst, sonst faenden zwei Abfragen statt
    // einer statt.
    const wurdeAktiv = aktiverTab && !warAktivRef.current;
    warAktivRef.current = aktiverTab;
    // Geprueft wird, ob die Karte existiert - NICHT, ob ihr Stil fertig
    // geladen ist. Der Unterschied ist entscheidend: Die Orte kommen auch
    // ueber "moveend" herein, ganz ohne das "load"-Ereignis. Mit der
    // falschen Bedingung blockierte der Waechter genau dann, wenn er
    // greifen sollte.
    if (wurdeAktiv && mapRef.current) ladeOrteRef.current();
  }, [aktiverTab]);

  // Fahrzeugtyp-Katalog für den Filter (Gruppen kommen aus der DB, CLAUDE.md
  // Regel 2) - unabhängig vom Kartenaufbau, da FilterSheet auch ohne
  // geladene Karte anzeigbar sein soll.
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("observable_types")
      .select("*")
      .order("group_name")
      .then(({ data }) => {
        if (data) setObservableTypes(data);
      });
  }, []);

  // Bei jeder Filteränderung sofort neu laden, nicht erst beim nächsten
  // Kartenschwenk.
  useEffect(() => {
    filterRef.current = {
      radiusUeberschreibungM,
      nurAktiv,
      nurFahrzeugeSichtbar,
      nurGemerkte,
      ausgewaehlteTypIds,
    };
    if (kartenBereitRef.current) ladeOrteRef.current();
  }, [
    radiusUeberschreibungM,
    nurAktiv,
    nurFahrzeugeSichtbar,
    nurGemerkte,
    ausgewaehlteTypIds,
  ]);

  function radiusWaehlen(meter: number) {
    setRadiusUeberschreibungM((aktuell) => (aktuell === meter ? null : meter));
  }

  function typToggle(id: string) {
    setAusgewaehlteTypIds((aktuell) =>
      aktuell.includes(id) ? aktuell.filter((t) => t !== id) : [...aktuell, id],
    );
  }

  const typFilterLabel =
    ausgewaehlteTypIds.length === 0
      ? null
      : ausgewaehlteTypIds.length === 1
        ? (observableTypes.find((t) => t.id === ausgewaehlteTypIds[0])?.name_de ??
          null)
        : `${ausgewaehlteTypIds.length} Fahrzeugtypen`;

  // Zwei getrennte Wrapper statt einem: `position: fixed` erzeugt in
  // modernen Browsern IMMER einen eigenen Stacking-Context, unabhängig vom
  // z-index. Ein einzelner `fixed`-Wrapper um Karte + Sheets/FAB würde deren
  // z-Index (30/40/50) gegen die BottomNav (z-40) einsperren und dabei als
  // Ganzes nach DOM-Reihenfolge einsortieren - die BottomNav käme dadurch
  // immer über das Vorschau-Sheet zu liegen, obwohl dessen z-50 höher ist.
  // Der Karten-Canvas braucht selbst kein z-Index (bleibt unter der
  // BottomNav), die Overlay-Elemente stecken deshalb in einem eigenen,
  // NICHT positionierten Wrapper - der erzeugt keinen Stacking-Context, ihre
  // z-Index-Werte vergleichen sich also wieder direkt mit dem der BottomNav.
  return (
    <>
      <div
        className="fixed inset-0"
        style={{
          visibility: aktiverTab ? "visible" : "hidden",
          pointerEvents: aktiverTab ? "auto" : "none",
        }}
      >
        {/* Inline style statt nur Tailwind-Klasse: maplibre-gl.css setzt auf
            diesem Element ungelayert `.maplibregl-map { position: relative }`.
            Tailwind v4 packt seine Utilities in ein CSS-Layer, und ungelayertes
            CSS gewinnt immer gegen gelayertes - unabhängig von Spezifität oder
            Reihenfolge. Ohne den Inline-Style bricht das die absolute
            Positionierung und die Karte bekommt Höhe 0. */}
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ position: "absolute", inset: 0 }}
        />
      </div>
      <div
        style={{
          visibility: aktiverTab ? "visible" : "hidden",
          pointerEvents: aktiverTab ? "auto" : "none",
        }}
      >
        {zeigeStandortHinweis && (
          <LocationHint
            // Nicht `onUseLocation={standortVerwenden}`: React reicht jedem
            // Klick-Handler das Ereignis als erstes Argument durch. Das
            // landete dann als Zoomstufe in der Karte und machte ihre
            // Kameraposition zu NaN - danach warf jede Fingerbewegung,
            // und die Karte war tot. TypeScript kann das nicht sehen,
            // weil eine Funktion mit optionalem Parameter zu `() => void`
            // passt.
            onUseLocation={() => standortVerwenden()}
            onDismiss={hinweisSchliessen}
          />
        )}
        <FilterPillRow
          radiusLabel={formatiereRadius(radiusAnzeigeM)}
          nurAktiv={nurAktiv}
          onNurAktivToggle={() => setNurAktiv((v) => !v)}
          onFilterOeffnen={() => setFilterOffen(true)}
          typFilterLabel={typFilterLabel}
        />
        {filterOffen && (
          <FilterSheet
            radiusUeberschreibungM={radiusUeberschreibungM}
            onRadiusWaehlen={radiusWaehlen}
            nurAktiv={nurAktiv}
            onNurAktivToggle={() => setNurAktiv((v) => !v)}
            nurFahrzeugeSichtbar={nurFahrzeugeSichtbar}
            onNurFahrzeugeSichtbarToggle={() => setNurFahrzeugeSichtbar((v) => !v)}
            nurGemerkte={nurGemerkte}
            onNurGemerkteToggle={() => setNurGemerkte((v) => !v)}
            typen={observableTypes}
            ausgewaehlteTypIds={ausgewaehlteTypIds}
            onTypToggle={typToggle}
            onSchliessen={() => setFilterOffen(false)}
          />
        )}
        <PlacePreviewSheet
          ort={ausgewaehlterOrt}
          beobachtungsLabel={beobachtungsLabel}
          onClose={() => setAusgewaehlterOrt(null)}
        />
        <button
          type="button"
          onClick={aufStandortZentrieren}
          aria-label="Auf meinen Standort zentrieren"
          className="btn btn-icon elev-lg fixed z-30"
          style={{
            background: "var(--color-bg)",
            right: "1rem",
            bottom: "max(9.75rem, calc(env(safe-area-inset-bottom) + 8.75rem))",
          }}
        >
          <IconStandort size={22} />
        </button>
        <Link
          href="/neu"
          aria-label="Ort erfassen"
          className="btn btn-primary elev-lg fixed z-30 flex h-14 w-14 items-center justify-center text-3xl leading-none"
          style={{
            right: "1rem",
            bottom: "max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))",
          }}
        >
          +
        </Link>
      </div>
    </>
  );
}
