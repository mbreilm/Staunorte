"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createClient } from "@/lib/supabase/client";
import type { PlaceNearby } from "@/lib/supabase/types";
import { haversineMeters } from "@/lib/geo/distance";
import { registerMarkerIcons, markerIconKey } from "./markerIcons";
import { LocationHint } from "./LocationHint";

// Fallback, falls die Env-Variablen mal fehlen - München-Zentrum.
const STANDARD_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "48.1372");
const STANDARD_LON = Number(process.env.NEXT_PUBLIC_DEFAULT_LON ?? "11.5756");
const KATEGORIE = process.env.NEXT_PUBLIC_DEFAULT_CATEGORY || "baustelle";
// Notfall-Fallback, nur falls place_categories.marker_style keine Farbe hat.
const NOTFALL_AKZENTFARBE = "#F2A20C";

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
function baueFeatureCollection(
  orte: PlaceNearby[],
): GeoJSON.FeatureCollection<GeoJSON.Point, OrtEigenschaften> {
  return {
    type: "FeatureCollection",
    features: orte.map((ort) => {
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

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const entprellungRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zeigeStandortHinweis, setZeigeStandortHinweis] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const supabase = createClient();

    // Kategoriefarbe laden, bevor Marker gezeichnet werden - die Farbe ist
    // Kategorie-Konfiguration (place_categories.marker_style), nicht im
    // Code hartkodiert (CLAUDE.md Regel 2: keine kategoriespezifischen
    // Werte im Frontend). Läuft parallel zum Kartenstil-Laden.
    async function ladeAkzentfarbe(): Promise<string> {
      try {
        const { data } = await supabase
          .from("place_categories")
          .select("marker_style")
          .eq("id", KATEGORIE)
          .maybeSingle();
        const style = data?.marker_style as { color?: string } | null;
        return style?.color ?? NOTFALL_AKZENTFARBE;
      } catch {
        return NOTFALL_AKZENTFARBE;
      }
    }
    const akzentfarbePromise = ladeAkzentfarbe();

    const map = new MapLibreMap({
      container: containerRef.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL!,
      center: [STANDARD_LON, STANDARD_LAT],
      zoom: 13,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    // Lädt Baustellen im aktuellen Kartenausschnitt über places_nearby().
    // Der Radius wird aus der sichtbaren Fläche abgeleitet (Abstand
    // Zentrum -> Kartenecke), damit beim Rauszoomen automatisch mehr
    // geladen wird und beim Reinzoomen weniger.
    async function ladeOrte() {
      const zentrum = map.getCenter();
      const ecke = map.getBounds().getNorthEast();
      const radius = Math.min(
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

      const { data, error } = await supabase.rpc("places_nearby", {
        p_lat: zentrum.lat,
        p_lon: zentrum.lng,
        p_radius_m: radius,
        p_category: KATEGORIE,
      });

      if (error) {
        // Bewusst kein Fehler-UI: ein einzelner fehlgeschlagener Nachlade-
        // Versuch beim Verschieben der Karte soll die Ansicht nicht
        // blockieren - die zuletzt geladenen Marker bleiben stehen.
        console.error("places_nearby fehlgeschlagen:", error.message);
        return;
      }

      const quelle = map.getSource("orte") as GeoJSONSource | undefined;
      quelle?.setData(baueFeatureCollection(data ?? []));
    }

    // Entprellt auf 300 ms, damit während des Schiebens/Zoomens nicht bei
    // jedem Zwischenschritt neu geladen wird.
    function ladeOrteEntprellt() {
      if (entprellungRef.current) clearTimeout(entprellungRef.current);
      entprellungRef.current = setTimeout(ladeOrte, ENTPRELLUNG_MS);
    }

    map.on("load", async () => {
      const akzentfarbe = await akzentfarbePromise;
      registerMarkerIcons(map, akzentfarbe);

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

      // Standortabfrage erst nach dem erklärenden Hinweis - nicht sofort
      // beim Laden. Die Karte selbst ist zu diesem Zeitpunkt schon
      // benutzbar (Zentrum München/Fallback).
      setZeigeStandortHinweis(true);

      ladeOrte();
    });

    map.on("moveend", ladeOrteEntprellt);

    return () => {
      if (entprellungRef.current) clearTimeout(entprellungRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function standortVerwenden() {
    setZeigeStandortHinweis(false);

    if (!("geolocation" in navigator)) return; // alter Browser: stiller Fallback

    navigator.geolocation.getCurrentPosition(
      (position) => {
        mapRef.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 14,
        });
      },
      () => {
        // Ablehnung oder Fehler (Timeout, kein GPS, ...): einfach beim
        // München-Fallback bleiben, keine Fehlermeldung, keine Sackgasse.
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <div className="relative flex-1">
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
      {zeigeStandortHinweis && (
        <LocationHint
          onUseLocation={standortVerwenden}
          onDismiss={() => setZeigeStandortHinweis(false)}
        />
      )}
    </div>
  );
}
