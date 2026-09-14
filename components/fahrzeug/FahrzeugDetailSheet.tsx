"use client";

import type { ReactNode } from "react";
import type { ObservableRarity } from "@/lib/supabase/types";
import { GruppenIcon } from "@/components/icons/GruppenIcon";
import { fahrzeugBildUrl } from "@/lib/fahrzeugbild";
import { SELTENHEIT_TEXT } from "@/lib/format/rarity";

type Props = {
  name: string;
  groupName: string | null;
  imagePath: string | null;
  imageCredit: string | null;
  kidDescription: string | null;
  rarity: ObservableRarity;
  /** Zeile unter der Seltenheit - je nach Ort unterschiedlich, z. B.
   *  "Zuletzt hier gesehen vor 3 Tagen" oder "Noch nicht entdeckt." */
  fussnote?: ReactNode;
  /** Foto entsättigt zeigen (Sammelalbum: noch nicht gefundenes Fahrzeug). */
  ausgegraut?: boolean;
  onClose: () => void;
};

/**
 * Steckbrief eines Fahrzeugtyps als Bottom-Sheet: Foto, Name, kindgerechte
 * Beschreibung, Seltenheit. Gemeinsam genutzt von Sammelalbum, Detailseite
 * und den Fahrzeug-Chips im Erfassen- und Check-in-Flow - die Gruppen-Icons
 * allein sagen zu wenig darüber, wie ein Gerät tatsächlich aussieht.
 */
export function FahrzeugDetailSheet({
  name,
  groupName,
  imagePath,
  imageCredit,
  kidDescription,
  rarity,
  fussnote,
  ausgegraut = false,
  onClose,
}: Props) {
  const bildUrl = fahrzeugBildUrl(imagePath);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="dialog elev-lg relative z-10 w-full max-w-md rounded-b-none p-6 pb-8 text-center">
        <button
          type="button"
          aria-label="Schließen"
          onClick={onClose}
          className="btn btn-icon absolute right-3 top-3"
        >
          ×
        </button>
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1.5 w-12 rounded-full"
          style={{ background: "var(--color-neutral-400)" }}
        />

        {bildUrl ? (
          <span className="block overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-Fotos ohne next/image-Konfiguration */}
            <img
              src={bildUrl}
              alt={`Foto: ${name}`}
              decoding="async"
              className={
                ausgegraut
                  ? "h-48 w-full object-cover opacity-60 grayscale"
                  : "h-48 w-full object-cover"
              }
            />
          </span>
        ) : (
          <span
            className="inline-flex items-center justify-center"
            style={{
              color: ausgegraut
                ? "var(--color-neutral-500)"
                : "var(--color-accent-800)",
            }}
          >
            <GruppenIcon groupName={groupName} size={64} />
          </span>
        )}

        <h2 className="mt-3 text-lg">{name}</h2>
        {kidDescription && <p className="mt-3 text-sm">{kidDescription}</p>}
        <p className="tag tag-accent mt-3 inline-flex">{SELTENHEIT_TEXT[rarity]}</p>
        {fussnote && <p className="mt-3 text-xs text-muted">{fussnote}</p>}

        {/* Pflichtangabe: die Fotos stehen unter CC-BY/CC-BY-SA, das
            verlangt die Nennung von Urheber und Lizenz am Bild. */}
        {imageCredit && (
          <p
            className="mt-2 text-[10.5px] leading-snug"
            style={{ color: "var(--color-neutral-500)" }}
          >
            {imageCredit}
          </p>
        )}
      </div>
    </div>
  );
}
