"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { richteMaplibreWorkerEin } from "@/lib/maplibre/setup";

type Props = {
  start: { lat: number; lon: number };
  onBestaetigt: (position: { lat: number; lon: number }) => void;
};

/**
 * Karte mit einem einzigen verschiebbaren Pin. Der Pin startet an `start`
 * (EXIF-, Geräte- oder München-Fallback-Standort, siehe app/neu/page.tsx),
 * lässt sich per Ziehen oder Antippen der Karte neu setzen, und muss über
 * den Button explizit bestätigt werden - nie automatisch übernommen
 * (CLAUDE.md/PRD 6.2).
 */
export function StandortAuswahl({ start, onBestaetigt }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(start);

  useEffect(() => {
    if (!containerRef.current) return;

    richteMaplibreWorkerEin();
    const map = new MapLibreMap({
      container: containerRef.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL!,
      center: [start.lon, start.lat],
      zoom: 16,
      attributionControl: { compact: true },
    });

    const marker = new Marker({ draggable: true, color: "#F2A20C" })
      .setLngLat([start.lon, start.lat])
      .addTo(map);

    function aktualisieren(lngLat: { lat: number; lng: number }) {
      positionRef.current = { lat: lngLat.lat, lon: lngLat.lng };
    }

    marker.on("dragend", () => aktualisieren(marker.getLngLat()));
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      aktualisieren(e.lngLat);
    });

    return () => {
      marker.remove();
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `start` ist nur der Startwert, die Karte soll bei Änderungen nicht neu aufgebaut werden
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative flex-1">
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ position: "absolute", inset: 0 }}
        />
      </div>
      <div className="p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <p className="mb-2 text-center text-sm text-zinc-600">
          Stimmt der Pin? Zum Verschieben ziehen oder auf die Karte tippen.
        </p>
        <button
          type="button"
          onClick={() => onBestaetigt(positionRef.current)}
          className="h-12 w-full rounded-xl bg-orange-500 text-base font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Standort bestätigen
        </button>
      </div>
    </div>
  );
}
