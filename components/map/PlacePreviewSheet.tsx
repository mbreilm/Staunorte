"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import type { ActivityState, PlaceNearby } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { formatDistance } from "@/lib/geo/distance";
import { buildRouteUrl } from "@/lib/geo/routeLink";

const FOTO_BUCKET = "place-photos";

// Aktivität immer im Konjunktiv, nie als Zusage - siehe CLAUDE.md
// Design-Leitplanken.
const AKTIVITAETS_TEXT: Record<ActivityState, string> = {
  aktiv: "vermutlich aktiv",
  ruhe: "vermutlich ruhig",
  unbekannt: "Aktivität unbekannt",
};

const AKTIVITAETS_FARBE: Record<ActivityState, string> = {
  aktiv: "bg-green-100 text-green-800",
  ruhe: "bg-zinc-100 text-zinc-600",
  unbekannt: "bg-zinc-100 text-zinc-400",
};

// Ab dieser Zieh-Distanz (px) schließt das Sheet statt zurückzuschnappen.
const SCHLIESS_SCHWELLE_PX = 90;

type Props = {
  /** Ausgewählter Ort aus places_nearby(). null = Sheet ist geschlossen. */
  ort: PlaceNearby | null;
  /** place_categories.observable_label - keine hartkodierten Kategorietexte, siehe CLAUDE.md Regel 2. */
  beobachtungsLabel: string;
  onClose: () => void;
};

/**
 * Bottom-Sheet-Vorschau, die sich beim Antippen eines Markers öffnet.
 * Per Wischen nach unten (Ziehgriff) oder Tap auf den Hintergrund schließbar.
 */
export function PlacePreviewSheet({ ort, beobachtungsLabel, onClose }: Props) {
  const [dragY, setDragY] = useState(0);
  const [ziehtGerade, setZiehtGerade] = useState(false);
  const ziehStartY = useRef<number | null>(null);

  if (!ort) return null;

  const fotoUrl = ort.thumb_path
    ? createClient().storage.from(FOTO_BUCKET).getPublicUrl(ort.thumb_path).data
        .publicUrl
    : null;

  function aufZiehStart(e: ReactPointerEvent<HTMLDivElement>) {
    ziehStartY.current = e.clientY;
    setZiehtGerade(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function aufZiehBewegung(e: ReactPointerEvent<HTMLDivElement>) {
    if (ziehStartY.current === null) return;
    setDragY(Math.max(0, e.clientY - ziehStartY.current));
  }

  function aufZiehEnde() {
    if (dragY > SCHLIESS_SCHWELLE_PX) onClose();
    ziehStartY.current = null;
    setZiehtGerade(false);
    setDragY(0);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="relative z-10 w-full max-w-md rounded-t-3xl bg-white shadow-xl"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: ziehtGerade ? "none" : "transform 200ms ease-out",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div
          onPointerDown={aufZiehStart}
          onPointerMove={aufZiehBewegung}
          onPointerUp={aufZiehEnde}
          onPointerCancel={aufZiehEnde}
          className="flex touch-none justify-center py-3"
        >
          <div
            aria-hidden="true"
            className="h-1.5 w-12 rounded-full bg-zinc-200"
          />
        </div>

        <div className="px-6">
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-zinc-100">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-Fotos ohne next/image-Konfiguration
              <img
                src={fotoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-300">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle cx="9" cy="10" r="1.5" fill="currentColor" />
                  <path
                    d="M3 16l5-4 4 3 5-5 4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
          </div>

          <h2 className="mt-4 text-lg font-bold text-zinc-900">{ort.title}</h2>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-zinc-500">{formatDistance(ort.distance_m)}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${AKTIVITAETS_FARBE[ort.activity]}`}
            >
              {AKTIVITAETS_TEXT[ort.activity]}
            </span>
          </div>

          <p className="mt-2 text-sm text-zinc-600">
            {ort.fresh_observables} aktuelle {beobachtungsLabel} · {ort.checkin_count}{" "}
            Check-ins
          </p>

          <div className="mt-5 flex gap-2">
            <Link
              href={`/ort/${ort.id}`}
              className="flex h-11 flex-1 items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Details
            </Link>
            <a
              href={buildRouteUrl(ort.lat, ort.lon)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 flex-1 items-center justify-center rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-200"
            >
              Route öffnen
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
