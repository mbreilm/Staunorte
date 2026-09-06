"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import type { ActivityState, PlaceNearby } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { formatDistance } from "@/lib/geo/distance";
import { buildRouteUrl } from "@/lib/geo/routeLink";
import { AktivitaetsBadge } from "@/components/place/AktivitaetsBadge";
import { IconFotoPlatzhalter } from "@/lib/icons";

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

        <div className="relative px-6">
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="btn btn-icon elev-sm absolute right-6 top-0"
            style={{ background: "var(--color-bg)" }}
          >
            ×
          </button>

          <div className="flex gap-3.5">
            <div
              className="h-[88px] w-[88px] flex-none overflow-hidden rounded-[20px]"
              style={{ background: "var(--color-neutral-200)" }}
            >
              {fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-Fotos ohne next/image-Konfiguration
                <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ color: "var(--color-neutral-400)" }}
                >
                  <IconFotoPlatzhalter size={28} aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1 pr-8">
              <AktivitaetsBadge zustand={ort.activity} text={AKTIVITAETS_TEXT[ort.activity]} />
              <h2 className="truncate text-lg">{ort.title}</h2>
              <p className="text-xs text-muted">
                {formatDistance(ort.distance_m)} · {ort.fresh_observables} aktuelle{" "}
                {beobachtungsLabel}
              </p>
            </div>
          </div>

          <div className="mt-3.5 flex gap-2">
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
