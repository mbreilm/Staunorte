"use client";

import { useEffect, useState } from "react";
import type { ObservableType } from "@/lib/supabase/types";
import { trackEvent } from "@/lib/analytics/plausible";
import { GruppenIcon } from "@/components/icons/GruppenIcon";
import { fahrzeugBildUrl } from "@/lib/fahrzeugbild";
import { SELTENHEIT_TEXT } from "@/lib/format/rarity";

type Freischaltung = {
  observable_type_id: string;
  unlocked_at: string;
  first_place_id: string | null;
  places: { title: string } | null;
};

type Props = {
  typen: ObservableType[];
  freischaltungen: Freischaltung[];
  angemeldet: boolean;
};

export function AlbumGrid({ typen, freischaltungen, angemeldet }: Props) {
  const [ausgewaehlt, setAusgewaehlt] = useState<ObservableType | null>(null);
  const [hervorgehobenId, setHervorgehobenId] = useState<string | null>(null);

  const bildUrl = (typ: ObservableType) => fahrzeugBildUrl(typ.image_path);

  useEffect(() => {
    trackEvent("Album geöffnet");
  }, []);

  // Sprung von der Freischalt-Feier (CheckinFlow): "#typ-<id>" zeigt genau
  // auf die gerade neu gefundene Kachel, statt nur oben im Album zu landen.
  // Kann erst nach dem Mount bekannt sein (window.location existiert beim
  // Server-Render nicht) - ein lazy useState-Initializer würde hier einen
  // Hydration-Mismatch auslösen, ein Effekt ist die richtige Stelle dafür.
  useEffect(() => {
    const id = window.location.hash.match(/^#typ-(.+)$/)?.[1];
    if (!id) return;
    const ziel = document.getElementById(`typ-${id}`);
    if (!ziel) return;

    ziel.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hervorgehobenId lässt sich erst nach dem Mount aus window.location.hash bestimmen, s.o.
    setHervorgehobenId(id);
    const timer = setTimeout(() => setHervorgehobenId(null), 2200);
    return () => clearTimeout(timer);
  }, []);

  const freischaltungNachTyp = new Map(
    freischaltungen.map((f) => [f.observable_type_id, f]),
  );

  const gruppen = new Map<string, ObservableType[]>();
  for (const typ of typen) {
    const gruppe = typ.group_name ?? "";
    if (!gruppen.has(gruppe)) gruppen.set(gruppe, []);
    gruppen.get(gruppe)!.push(typ);
  }

  const ausgewaehlteFreischaltung = ausgewaehlt
    ? freischaltungNachTyp.get(ausgewaehlt.id)
    : null;

  const anteil =
    typen.length > 0 ? Math.min(100, (freischaltungNachTyp.size / typen.length) * 100) : 0;

  return (
    <>
      <h1 className="text-[26px] leading-tight">Sammelalbum</h1>
      <p className="mt-0.5 text-[13.5px] text-muted">
        {freischaltungNachTyp.size} von {typen.length} Fahrzeugen gefunden
      </p>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full"
        style={{ background: "var(--color-neutral-300)" }}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${anteil}%`, background: "var(--color-accent)" }}
        />
      </div>

      {!angemeldet && (
        <p className="mt-3 text-sm text-muted">
          Fürs Sammeln brauchst du ein Konto. Ohne Anmeldung siehst du nur, welche
          Fahrzeuge es gibt.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-5">
        {[...gruppen.entries()].map(([gruppe, gruppenTypen]) => (
          <div key={gruppe}>
            {gruppe && <h6 className="mb-2">{gruppe}</h6>}
            <div className="grid grid-cols-3 gap-[10px]">
              {gruppenTypen.map((typ) => {
                const freigeschaltet = angemeldet && freischaltungNachTyp.has(typ.id);
                const hervorgehoben = typ.id === hervorgehobenId;
                return (
                  <button
                    key={typ.id}
                    id={`typ-${typ.id}`}
                    type="button"
                    onClick={() => setAusgewaehlt(typ)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    {/* Mit Foto: gesperrt wird entsättigt und abgedunkelt.
                        Ohne Foto bleibt das Gruppen-Icon, dort geht das nur
                        über die Farbe - ein Strich-Icon hat nichts zu
                        entsättigen. hervorgehoben markiert kurz die Kachel,
                        zu der von der Freischalt-Feier aus gesprungen wurde. */}
                    <span
                      className={`flex aspect-square w-full items-center justify-center overflow-hidden rounded-[22px] transition-shadow duration-500 ${freigeschaltet ? "elev-sm" : ""}`}
                      style={{
                        ...(freigeschaltet
                          ? {
                              background: "var(--color-surface)",
                              color: "var(--color-accent-800)",
                            }
                          : {
                              background: "var(--color-neutral-200)",
                              border: "1.5px dashed var(--color-neutral-400)",
                              color: "var(--color-neutral-500)",
                            }),
                        ...(hervorgehoben
                          ? { boxShadow: "0 0 0 4px var(--color-accent-2-400)" }
                          : {}),
                      }}
                    >
                      {bildUrl(typ) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-Fotos ohne next/image-Konfiguration
                        <img
                          src={bildUrl(typ)!}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className={
                            freigeschaltet
                              ? "h-full w-full object-cover"
                              : "h-full w-full object-cover opacity-60 grayscale"
                          }
                        />
                      ) : (
                        <GruppenIcon groupName={typ.group_name} size={40} />
                      )}
                    </span>
                    {/* Auch gesperrt sichtbar: sonst weiß niemand, wonach er
                        noch Ausschau halten soll, um das Album zu vervollständigen. */}
                    <span
                      className="text-center text-[11.5px] leading-tight"
                      style={{ color: "var(--color-neutral-700)" }}
                    >
                      {typ.name_de}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

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
                  className={
                    ausgewaehlteFreischaltung
                      ? "h-48 w-full object-cover"
                      : "h-48 w-full object-cover opacity-60 grayscale"
                  }
                />
              </span>
            ) : (
              <span
                className="inline-flex items-center justify-center"
                style={{
                  color: ausgewaehlteFreischaltung
                    ? "var(--color-accent-800)"
                    : "var(--color-neutral-500)",
                }}
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
            {ausgewaehlteFreischaltung ? (
              <p className="mt-3 text-xs text-muted">
                Zuerst gesehen am{" "}
                {new Date(ausgewaehlteFreischaltung.unlocked_at).toLocaleDateString("de-DE")}
                {ausgewaehlteFreischaltung.places &&
                  ` an ${ausgewaehlteFreischaltung.places.title}`}
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted">Noch nicht entdeckt.</p>
            )}
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
    </>
  );
}
