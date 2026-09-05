"use client";

import { useState } from "react";
import Link from "next/link";
import { MeldeFormular } from "@/components/melden/MeldeFormular";

type Foto = { id: string; url: string; badgeText: string };

/** Fotogalerie der Detailseite mit Melden-Icon pro Foto (T12). */
export function FotoGalerie({ fotos, zurueckHref }: { fotos: Foto[]; zurueckHref: string }) {
  const [meldeFotoId, setMeldeFotoId] = useState<string | null>(null);

  return (
    <>
      <div className="relative">
        <div className="flex h-56 snap-x snap-mandatory gap-2 overflow-x-auto">
          {fotos.map((foto) => (
            <div key={foto.id} className="relative h-full w-full flex-none snap-start">
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-Fotos ohne next/image-Konfiguration */}
              <img src={foto.url} alt="" className="h-full w-full object-cover" />
              <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
                {foto.badgeText}
              </div>
              <button
                type="button"
                aria-label="Foto melden"
                onClick={() => setMeldeFotoId(foto.id)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sm text-white"
              >
                ⚠
              </button>
            </div>
          ))}
        </div>
        <Link
          href={zurueckHref}
          aria-label="Zurück zur Karte"
          className="btn btn-icon elev-sm absolute left-3 top-3"
          style={{ background: "var(--color-bg)" }}
        >
          <ZurueckPfeil />
        </Link>
      </div>

      {meldeFotoId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => setMeldeFotoId(null)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="elev-lg relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[var(--color-surface)]">
            <MeldeFormular
              targetType="photo"
              targetId={meldeFotoId}
              onFertig={() => setMeldeFotoId(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}

function ZurueckPfeil() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 5l-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
