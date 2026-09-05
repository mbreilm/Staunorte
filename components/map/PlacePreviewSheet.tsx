"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import type { ActivityState, PlaceNearby } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { formatDistance } from "@/lib/geo/distance";
import { buildRouteUrl } from "@/lib/geo/routeLink";
import { AktivitaetsBadge } from "@/components/place/AktivitaetsBadge";

const FOTO_BUCKET = "place-photos";

// Aktivität immer im Konjunktiv, nie als Zusage - siehe CLAUDE.md
// Design-Leitplanken.
const AKTIVITAETS_TEXT: Record<ActivityState, string> = {
  aktiv: "vermutlich aktiv",
  ruhe: "vermutlich ruhig",
  unbekannt: "Aktivität unbekannt",
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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="dialog elev-lg relative z-10 w-full max-w-md gap-0 rounded-b-none p-0"
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
            className="h-1.5 w-12 rounded-full"
            style={{ background: "var(--color-neutral-400)" }}
          />
        </div>

        <div className="px-6">
          <div
            className="aspect-video w-full overflow-hidden rounded-2xl"
            style={{ background: "var(--color-neutral-200)" }}
          >
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-Fotos ohne next/image-Konfiguration
              <img
                src={fotoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ color: "var(--color-neutral-400)" }}
              >
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

          <div className="mt-4">
            <AktivitaetsBadge zustand={ort.activity} text={AKTIVITAETS_TEXT[ort.activity]} />
          </div>

          <h2 className="mt-2 text-2xl">{ort.title}</h2>

          <p className="mt-1 text-sm text-muted">
            {formatDistance(ort.distance_m)} · {ort.fresh_observables} aktuelle{" "}
            {beobachtungsLabel} · {ort.checkin_count} Check-ins
          </p>

          <div className="mt-5 flex gap-2">
            <Link href={`/ort/${ort.id}`} className="btn btn-primary flex-1">
              Details
            </Link>
            <a
              href={buildRouteUrl(ort.lat, ort.lon)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary flex-1"
            >
              Route öffnen
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
