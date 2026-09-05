"use client";

import { buildRouteUrl } from "@/lib/geo/routeLink";

/** Öffnet Apple/Google Maps zur Route - Geräteerkennung braucht den Client. */
export function RouteButton({ lat, lon }: { lat: number; lon: number }) {
  return (
    <a
      href={buildRouteUrl(lat, lon)}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-secondary h-14 flex-none px-5 text-base"
    >
      Route
    </a>
  );
}
