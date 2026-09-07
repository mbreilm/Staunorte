"use client";

import { useState } from "react";
import type { PlaceObservableView } from "@/lib/supabase/types";
import { vorZeit } from "@/lib/format/relativeTime";
import { GruppenIcon } from "@/components/icons/GruppenIcon";
import { fahrzeugBildUrl } from "@/lib/fahrzeugbild";
import { SELTENHEIT_TEXT } from "@/lib/format/rarity";

const BUCKET_STIL = {
  jetzt: {
    background: "var(--color-accent-2-100)",
    border: "1.5px solid var(--color-accent-2-300)",
    iconBg: "var(--color-accent-2-600)",
    label: "Jetzt hier",
    labelColor: "var(--color-accent-2-800)",
  },
  kuerzlich: {
    background: "var(--color-neutral-200)",
    border: "1.5px solid var(--color-neutral-300)",
    iconBg: "var(--color-neutral-400)",
    label: null,
    labelColor: "var(--color-neutral-700)",
  },
} as const;

type Props = {
  jetztHier: PlaceObservableView[];
  kuerzlich: PlaceObservableView[];
  archiv: PlaceObservableView[];
  observableLabel: string;
};

/**
 * Fahrzeugliste der Detailseite. Gruppen-Icons sehen für mehrere
 * Ausprägungen derselben Gruppe gleich aus (z.B. alle Bagger-Typen) -
 * Antippen öffnet deshalb denselben Foto-Dialog wie im Sammelalbum.
 */
export function FahrzeugListe({ jetztHier, kuerzlich, archiv, observableLabel }: Props) {
  const [ausgewaehlt, setAusgewaehlt] = useState<PlaceObservableView | null>(null);

  if (jetztHier.length === 0 && kuerzlich.length === 0 && archiv.length === 0) return null;

  const bildUrl = (b: PlaceObservableView) => fahrzeugBildUrl(b.image_path);

  return (
    <section className="mt-6">
      <h6>{observableLabel}</h6>

      {(jetztHier.length > 0 || kuerzlich.length > 0) && (
        <ul className="mt-2 flex flex-col gap-2">
          {jetztHier.map((beobachtung) => (
            <BeobachtungsZeile
              key={beobachtung.observable_type_id}
              beobachtung={beobachtung}
              variante="jetzt"
              onTap={() => setAusgewaehlt(beobachtung)}
            />
          ))}
          {kuerzlich.map((beobachtung) => (
            <BeobachtungsZeile
              key={beobachtung.observable_type_id}
              beobachtung={beobachtung}
              variante="kuerzlich"
              zeitHinweis={`Zuletzt gesehen ${vorZeit(beobachtung.last_seen_at)}`}
              onTap={() => setAusgewaehlt(beobachtung)}
            />
          ))}
        </ul>
      )}

      {archiv.length > 0 && (
        <details className="mt-3">
          <summary className="btn btn-secondary btn-block">
            Früher hier gesehen ({archiv.length})
          </summary>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {archiv.map((beobachtung) => (
              <ArchivChip
                key={beobachtung.observable_type_id}
                beobachtung={beobachtung}
                onTap={() => setAusgewaehlt(beobachtung)}
              />
            ))}
          </div>
        </details>
      )}

      {ausgewaehlt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => setAusgewaehlt(null)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="dialog elev-lg relative z-10 w-full max-w-md rounded-b-none p-6 pb-8 text-center">
            <button
              type="button"
              aria-label="Schließen"
              onClick={() => setAusgewaehlt(null)}
              className="btn btn-icon absolute right-3 top-3"
            >
              ×
            </button>
            <div
              aria-hidden="true"
              className="mx-auto mb-4 h-1.5 w-12 rounded-full"
              style={{ background: "var(--color-neutral-400)" }}
            />
            {bildUrl(ausgewaehlt) ? (
              <span className="block overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-Fotos ohne next/image-Konfiguration */}
                <img
                  src={bildUrl(ausgewaehlt)!}
                  alt={`Foto: ${ausgewaehlt.name_de}`}
                  decoding="async"
                  className="h-48 w-full object-cover"
                />
              </span>
            ) : (
              <span
                className="inline-flex items-center justify-center"
                style={{ color: "var(--color-accent-800)" }}
              >
                <GruppenIcon groupName={ausgewaehlt.group_name} size={64} />
              </span>
            )}
            <h2 className="mt-3 text-lg">{ausgewaehlt.name_de}</h2>
            {ausgewaehlt.kid_description && (
              <p className="mt-3 text-sm">{ausgewaehlt.kid_description}</p>
            )}
            <p className="tag tag-accent mt-3 inline-flex">
              {SELTENHEIT_TEXT[ausgewaehlt.rarity]}
            </p>
            <p className="mt-3 text-xs text-muted">
              Zuletzt hier gesehen {vorZeit(ausgewaehlt.last_seen_at)}
            </p>
            {/* Pflichtangabe: die Fotos stehen unter CC-BY/CC-BY-SA, das
                verlangt die Nennung von Urheber und Lizenz am Bild. */}
            {ausgewaehlt.image_credit && (
              <p className="mt-2 text-[10.5px] leading-snug" style={{ color: "var(--color-neutral-500)" }}>
                {ausgewaehlt.image_credit}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function BeobachtungsZeile({
  beobachtung,
  variante,
  zeitHinweis,
  onTap,
}: {
  beobachtung: PlaceObservableView;
  variante: "jetzt" | "kuerzlich";
  zeitHinweis?: string;
  onTap: () => void;
}) {
  const stil = BUCKET_STIL[variante];
  return (
    <li>
      <button
        type="button"
        onClick={onTap}
        className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left"
        style={{ background: stil.background, border: stil.border }}
      >
        <span
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
          aria-hidden="true"
          style={{ background: stil.iconBg }}
        >
          <GruppenIcon groupName={beobachtung.group_name} size={24} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <strong
            className="text-[15px]"
            style={{ color: variante === "kuerzlich" ? "var(--color-neutral-800)" : undefined }}
          >
            {beobachtung.name_de}
          </strong>
          {variante === "jetzt" ? (
            <span className="text-xs font-bold" style={{ color: stil.labelColor }}>
              {stil.label}
            </span>
          ) : (
            <span className="text-xs text-muted">{zeitHinweis}</span>
          )}
        </span>
      </button>
    </li>
  );
}

function ArchivChip({
  beobachtung,
  onTap,
}: {
  beobachtung: PlaceObservableView;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm"
      style={{ border: "1.5px dashed var(--color-neutral-400)", color: "var(--color-neutral-700)" }}
    >
      <GruppenIcon groupName={beobachtung.group_name} size={18} aria-hidden="true" />
      {beobachtung.name_de}
    </button>
  );
}
