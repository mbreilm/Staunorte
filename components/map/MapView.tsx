"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map as MapLibreMap,
  Marker,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createClient } from "@/lib/supabase/client";
import type { ObservableType, PlaceNearby } from "@/lib/supabase/types";
import { haversineMeters } from "@/lib/geo/distance";
import { richteMaplibreWorkerEin } from "@/lib/maplibre/setup";
import { IconStandort } from "@/lib/icons";
import { onboardingSchonGelaufen } from "@/lib/onboarding";
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

// Bewusst kühl und damit außerhalb der warmen Erdton-Palette: Der eigene
// Standort darf nie mit einem Ort verwechselt werden, und Blau ist für
// "hier bin ich" auf Karten die weltweit gelernte Farbe.
const EIGENER_STANDORT_FARBE = "#2d6ea3";

// Zoomstufen rund um den eigenen Standort. Die Übersicht ist bewusst
// weiter draußen als der Zentrieren-Button: Beim Öffnen der App will man
// sehen, was in der Umgebung los ist (der Suchradius leitet sich aus dem
// sichtbaren Ausschnitt ab, weiter draußen = mehr Baustellen). Tippt man
// dagegen aktiv auf "Auf meinen Standort zentrieren", will man wissen, wo
// genau man steht - dort darf es näher heran.
const ZOOM_UEBERSICHT = 13;
const ZOOM_STANDORT_BUTTON = 15;

// Merkt sich, dass der Standort in diesem Browser schon einmal freigegeben
// wurde. Nötig wegen Safari auf dem iPhone: Dort lässt sich die erteilte
// Berechtigung nicht abfragen (siehe berechtigungsStatus()), und ohne diese
// Notiz hätten wir bei JEDEM Laden erneut danach gefragt - obwohl längst
// zugestimmt wurde.
const STANDORT_ERLAUBT_SCHLUESSEL = "baustellenjaeger:standort-erlaubt";

function standortSchonErlaubt(): boolean {
  try {
    return window.localStorage.getItem(STANDORT_ERLAUBT_SCHLUESSEL) === "1";
  } catch {
    return false;
  }
}

function standortErlaubnisMerken(): void {
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
async function berechtigungsStatus(): Promise<PermissionStatus | null> {
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
function sindKoordinatenBrauchbar(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

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
): GeoJSON.FeatureCollection<GeoJSON.Point, OrtEigenschaften> {
  return {
    type: "FeatureCollection",
    features: orte
      .filter((ort) => sindKoordinatenBrauchbar(ort.lat, ort.lon))
      .map((ort) => {
      const farbig = ort.fresh_observables > 0;
      const gestrichelt = ort.source === "open_data" && !ort.is_confirmed;
      const aktiv = ort.activity === "aktiv";

      return {
        type: "Feature",
        id: ort.id,
        geometry: { type: "Point", coordinates: [ort.lon, ort.lat] },
        properties: {
          id: ort.id,
          title: ort.title,
          iconKey: markerIconKey({ farbig, gestrichelt, aktiv }),
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const entprellungRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orteRef = useRef<PlaceNearby[]>([]);
  const [zeigeStandortHinweis, setZeigeStandortHinweis] = useState(false);
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
  const [ausgewaehlteTypIds, setAusgewaehlteTypIds] = useState<string[]>([]);

  // ladeOrte() entsteht erst innerhalb des Karten-Effekts (unten) und
  // schließt dort über die Map-Instanz; die Filter-Werte kommen deshalb über
  // eine Ref herein statt über Closure-Variablen, die beim ersten Rendern
  // eingefroren wären.
  const filterRef = useRef({
    radiusUeberschreibungM: null as number | null,
    nurAktiv: false,
    nurFahrzeugeSichtbar: false,
    ausgewaehlteTypIds: [] as string[],
  });
  const ladeOrteRef = useRef<() => void>(() => {});
  const kartenBereitRef = useRef(false);

  // Eigener Standort: Marker + laufende Verfolgung. `verfolgungGewuenscht`
  // merkt sich, dass die Person den Standort freigegeben hat - die
  // Verfolgung selbst pausiert, solange die Karte nicht der aktive Tab ist
  // (watchPosition im Hintergrund kostet unnötig Akku).
  const standortMarkerRef = useRef<Marker | null>(null);
  const letzterStandortRef = useRef<{ lat: number; lon: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const verfolgungGewuenschtRef = useRef(false);
  // Gewünschte Zoomstufe, sobald die ERSTE Position hereinkommt - danach
  // wieder null. Nötig, weil die erste Ortung je nach Gerät mehrere
  // Sekunden dauert: Wir können nicht auf getCurrentPosition() allein
  // bauen (dessen Timeout lief beim Kaltstart oft ab, bevor macOS eine
  // Position lieferte - die Karte blieb dann auf München stehen).
  const zentrierenZoomRef = useRef<number | null>(null);

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
      quelle?.setData(baueFeatureCollection(gefiltert));
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
      if (e.originalEvent) zentrierenZoomRef.current = null;
    });

    return () => {
      if (entprellungRef.current) clearTimeout(entprellungRef.current);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      standortMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- die Karte wird bewusst nur einmal aufgebaut; standortHinweisOderDirekt arbeitet ausschließlich auf Refs und Settern
  }, []);

  // Wird der Standort ANDERSWO freigegeben - im Onboarding beim ersten
  // Start oder in den Browser-Einstellungen -, bekommt die Karte das sonst
  // nicht mit: Sie hat ihre Entscheidung beim Aufbau getroffen und bliebe
  // über München stehen. Die Permissions-API meldet solche Wechsel, und wir
  // holen die Zentrierung dann nach.
  useEffect(() => {
    let status: PermissionStatus | null = null;
    let verworfen = false;

    berechtigungsStatus().then((s) => {
      if (verworfen || !s) return;
      status = s;
      s.onchange = () => {
        if (s.state !== "granted") return;
        setZeigeStandortHinweis(false);
        standortVerwenden();
      };
    });

    return () => {
      verworfen = true;
      if (status) status.onchange = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- soll nur einmal eingehängt werden; standortVerwenden arbeitet ausschließlich auf Refs und Settern
  }, []);

  // Standortverfolgung pausiert, solange die Karte nicht der aktive Tab ist:
  // Die Karte bleibt dauerhaft gemountet (siehe oben), watchPosition würde
  // sonst auch im Album und im Konto weiterlaufen und Akku ziehen.
  useEffect(() => {
    if (!verfolgungGewuenschtRef.current) return;

    if (aktiverTab && watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) =>
          standortMarkerSetzen(position.coords.latitude, position.coords.longitude),
        () => {},
        { enableHighAccuracy: true, maximumAge: 10_000 },
      );
    }
    if (!aktiverTab && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
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
      ausgewaehlteTypIds,
    };
    if (kartenBereitRef.current) ladeOrteRef.current();
  }, [radiusUeberschreibungM, nurAktiv, nurFahrzeugeSichtbar, ausgewaehlteTypIds]);

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

  // Setzt bzw. verschiebt den Punkt "hier bin ich". Der Marker wird einmal
  // gebaut und danach nur noch umgesetzt, damit beim Gehen kein neues
  // DOM-Element pro Positionsmeldung entsteht.
  function standortMarkerSetzen(lat: number, lon: number) {
    const map = mapRef.current;
    if (!map) return;
    // Manche Geräte melden unbrauchbare Werte, statt einen Fehler zu
    // liefern. Eine solche Position darf die Karte nie erreichen.
    if (!sindKoordinatenBrauchbar(lat, lon)) {
      console.error("Unbrauchbare Position verworfen:", lat, lon);
      return;
    }
    letzterStandortRef.current = { lat, lon };
    // Eine Position bekommen wir nur mit Erlaubnis - das ist also der
    // verlässlichste Beleg dafür, dass zugestimmt wurde.
    standortErlaubnisMerken();

    if (!standortMarkerRef.current) {
      const punkt = document.createElement("div");
      punkt.setAttribute("aria-hidden", "true");
      punkt.style.width = "18px";
      punkt.style.height = "18px";
      punkt.style.borderRadius = "50%";
      punkt.style.background = EIGENER_STANDORT_FARBE;
      punkt.style.border = "3px solid #ffffff";
      punkt.style.boxShadow = "0 0 0 1px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.3)";
      standortMarkerRef.current = new Marker({ element: punkt })
        .setLngLat([lon, lat])
        .addTo(map);
    } else {
      standortMarkerRef.current.setLngLat([lon, lat]);
    }

    // Erste Position nach einem "zentrieren"-Wunsch: jetzt dorthin.
    //
    // Geflogen wird nur, wenn der Kartenstil schon steht. Ein flyTo() ist
    // eine Animation, und MapLibre sperrt währenddessen die Bedienung der
    // Karte. Startet die Animation, bevor der Stil geladen ist, kann sie
    // hängen bleiben - dann bleibt die Karte dauerhaft gesperrt und
    // reagiert auf keine Berührung mehr. Am Schreibtisch fällt das nie
    // auf, weil der Stil längst da ist; am Handy im Mobilfunknetz ist er
    // es oft noch nicht.
    //
    // Vorher gibt es deshalb jumpTo(): setzt die Kamera sofort und ohne
    // Animation. Nichts wird gesperrt, und sobald der Stil eintrifft,
    // zeichnet MapLibre an der richtigen Stelle.
    const zielZoom = zentrierenZoomRef.current;
    if (zielZoom !== null) {
      zentrierenZoomRef.current = null;
      const ziel = { center: [lon, lat] as [number, number], zoom: zielZoom };
      if (map.loaded()) map.flyTo(ziel);
      else map.jumpTo(ziel);
    }
  }

  function standortVerfolgen() {
    verfolgungGewuenschtRef.current = true;
    if (watchIdRef.current !== null) return; // läuft schon
    if (!("geolocation" in navigator)) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) =>
        standortMarkerSetzen(position.coords.latitude, position.coords.longitude),
      () => {
        // Ablehnung oder Fehler: kein Punkt, keine Meldung - die Karte
        // bleibt ohne eigenen Standort nutzbar (keine Sackgasse).
      },
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
  }

  // Entscheidet beim Öffnen der Karte, ob der erklärende Hinweis nötig ist:
  //  - "granted": Der Standort ist in diesem Browser schon freigegeben. Dann
  //    noch einmal um Erlaubnis zu bitten wäre unnötig - die Karte fliegt
  //    direkt zur eigenen Position.
  //  - "denied": Ein Tap auf "Standort verwenden" würde gar keinen
  //    Browser-Dialog mehr auslösen und liefe ins Leere (Sackgasse). Der
  //    Hinweis bleibt deshalb weg; der Zentrieren-Button bleibt sichtbar.
  //  - "prompt" / Permissions-API nicht verfügbar: wie bisher erst erklären,
  //    dann fragen.
  //  - "prompt", aber das Onboarding läuft gerade zum ersten Mal: Das fragt
  //    selbst nach dem Standort. Hier noch einmal zu fragen wäre die zweite
  //    Frage in Folge. Wir warten stattdessen auf die Freigabe (siehe den
  //    Effekt weiter unten, der auf Änderungen der Berechtigung hört).
  async function standortHinweisOderDirekt() {
    const zustand = (await berechtigungsStatus())?.state ?? null;

    if (zustand === "granted") {
      standortVerwenden();
      return;
    }
    if (zustand === "denied") return;

    // `null` heißt nicht "abgelehnt", sondern "der Browser sagt es uns
    // nicht" - der Normalfall auf dem iPhone. Dann entscheidet unsere
    // eigene Notiz: Wer schon einmal zugestimmt hat, wird nicht erneut
    // gefragt. Ohne das kam der Hinweis dort bei jedem Laden wieder.
    if (zustand === null && standortSchonErlaubt()) {
      standortVerwenden();
      return;
    }

    if (!onboardingSchonGelaufen()) return;
    setZeigeStandortHinweis(true);
  }

  function standortVerwenden(zoom: number = ZOOM_UEBERSICHT) {
    setZeigeStandortHinweis(false);

    // Zweiter Riegel gegen denselben Fehler: Was hier hereinkommt, geht
    // direkt in die Kameraposition der Karte. Ein einziger unsauberer
    // Aufruf reicht, um sie unbrauchbar zu machen.
    const zielZoom = Number.isFinite(zoom) ? zoom : ZOOM_UEBERSICHT;

    if (!("geolocation" in navigator)) return; // alter Browser: stiller Fallback

    // Zentriert wird, sobald die erste Position da ist - egal ob sie aus
    // getCurrentPosition() oder aus der laufenden Verfolgung kommt.
    zentrierenZoomRef.current = zielZoom;
    standortVerfolgen();
    navigator.geolocation.getCurrentPosition(
      (position) =>
        standortMarkerSetzen(position.coords.latitude, position.coords.longitude),
      () => {
        // Ablehnung oder Fehler (Timeout, kein GPS, ...): einfach beim
        // München-Fallback bleiben, keine Fehlermeldung, keine Sackgasse.
        // Ein späterer Treffer der Verfolgung zentriert dann immer noch.
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  // "Auf meinen Standort zentrieren": Ist die Position schon bekannt, geht
  // es sofort dorthin; sonst wird sie jetzt geholt (und dabei gleich die
  // laufende Verfolgung gestartet).
  function aufStandortZentrieren() {
    setZeigeStandortHinweis(false);
    const bekannt = letzterStandortRef.current;
    if (bekannt) {
      const karte = mapRef.current;
      const ziel = {
        center: [bekannt.lon, bekannt.lat] as [number, number],
        zoom: ZOOM_STANDORT_BUTTON,
      };
      // Gleiche Vorsicht wie oben: animiert nur bei geladenem Stil.
      if (karte?.loaded()) karte.flyTo(ziel);
      else karte?.jumpTo(ziel);
      standortVerfolgen();
      return;
    }
    standortVerwenden(ZOOM_STANDORT_BUTTON);
  }

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
            onDismiss={() => setZeigeStandortHinweis(false)}
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
