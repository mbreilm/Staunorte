"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MeldeFormular } from "@/components/melden/MeldeFormular";
import { ZurueckPfeil } from "@/components/icons/ZurueckPfeil";

type Foto = { id: string; url: string; badgeText: string };

/**
 * Fotogalerie der Detailseite mit Melden-Icon pro Foto (T12). Bei mehreren
 * Fotos zeigt ein Punkt-Indikator die Position im horizontalen Streifen,
 * Antippen öffnet einen Vollbild-Betrachter zum Durchblättern.
 */
export function FotoGalerie({ fotos, zurueckHref }: { fotos: Foto[]; zurueckHref: string }) {
  const [meldeFotoId, setMeldeFotoId] = useState<string | null>(null);
  const [aktiverIndex, setAktiverIndex] = useState(0);
  const [vollbildOffen, setVollbildOffen] = useState(false);
  const mehrereFotos = fotos.length > 1;

  function indexAusScroll(el: HTMLDivElement) {
    const breite = el.clientWidth;
    if (breite > 0) setAktiverIndex(Math.round(el.scrollLeft / breite));
  }

  return (
    <>
      <div className="relative">
        <div
          onScroll={(e) => indexAusScroll(e.currentTarget)}
          className="flex h-56 snap-x snap-mandatory gap-2 overflow-x-auto"
        >
          {fotos.map((foto) => (
            <Kachel
              key={foto.id}
              foto={foto}
              onTap={() => setVollbildOffen(true)}
              onMelden={() => setMeldeFotoId(foto.id)}
            />
          ))}
        </div>

        {mehrereFotos && <PunktLeiste anzahl={fotos.length} aktiv={aktiverIndex} />}

        <Link
          href={zurueckHref}
          aria-label="Zurück zur Karte"
          className="btn btn-icon elev-sm absolute left-3 top-3"
          style={{ background: "var(--color-bg)" }}
        >
          <ZurueckPfeil />
        </Link>
      </div>

      {vollbildOffen && (
        <Vollbild
          fotos={fotos}
          startIndex={aktiverIndex}
          onSchliessen={() => setVollbildOffen(false)}
          onMelden={(id) => setMeldeFotoId(id)}
        />
      )}

      {meldeFotoId && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
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

function Kachel({
  foto,
  onTap,
  onMelden,
}: {
  foto: Foto;
  onTap: () => void;
  onMelden: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onTap();
      }}
      className="relative h-full w-full flex-none snap-start"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-Fotos ohne next/image-Konfiguration */}
      <img src={foto.url} alt="" className="h-full w-full object-cover" />
      <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
        {foto.badgeText}
      </div>
      <button
        type="button"
        aria-label="Foto melden"
        onClick={(e) => {
          e.stopPropagation();
          onMelden();
        }}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sm text-white"
      >
        ⚠
      </button>
    </div>
  );
}

function PunktLeiste({ anzahl, aktiv }: { anzahl: number; aktiv: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
      {Array.from({ length: anzahl }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: i === aktiv ? "white" : "rgba(255,255,255,.5)" }}
        />
      ))}
    </div>
  );
}

function Vollbild({
  fotos,
  startIndex,
  onSchliessen,
  onMelden,
}: {
  fotos: Foto[];
  startIndex: number;
  onSchliessen: () => void;
  onMelden: (id: string) => void;
}) {
  const streifenRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    // Direkt zum angetippten Foto springen, ohne Wisch-Animation - der
    // Wechsel von der Übersicht ins Vollbild soll sich wie ein Zoom auf
    // genau dieses Foto anfühlen. startIndex ändert sich danach nicht mehr,
    // solange dieser Betrachter offen ist.
    const el = streifenRef.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function indexAusScroll(el: HTMLDivElement) {
    const breite = el.clientWidth;
    if (breite > 0) setIndex(Math.round(el.scrollLeft / breite));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div
        ref={streifenRef}
        onScroll={(e) => indexAusScroll(e.currentTarget)}
        className="flex h-full snap-x snap-mandatory overflow-x-auto"
      >
        {fotos.map((foto) => (
          <div key={foto.id} className="relative h-full w-full flex-none snap-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-Fotos ohne next/image-Konfiguration */}
            <img src={foto.url} alt="" className="h-full w-full object-contain" />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Schließen"
        onClick={onSchliessen}
        className="btn btn-icon elev-sm absolute left-3 top-3"
        style={{ background: "var(--color-bg)" }}
      >
        <span aria-hidden="true" className="text-xl leading-none">
          ×
        </span>
      </button>

      {fotos.length > 1 && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          {index + 1} / {fotos.length}
        </div>
      )}

      <button
        type="button"
        aria-label="Foto melden"
        onClick={() => onMelden(fotos[index].id)}
        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"
      >
        ⚠
      </button>
    </div>
  );
}
