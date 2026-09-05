"use client";

import { useEffect, useState } from "react";
import type { ObservableType, ObservableRarity } from "@/lib/supabase/types";
import { trackEvent } from "@/lib/analytics/plausible";

const SELTENHEIT_TEXT: Record<ObservableRarity, string> = {
  haeufig: "Häufig",
  selten: "Selten",
  legendaer: "Legendär",
};

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

  useEffect(() => {
    trackEvent("Album geöffnet");
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

  return (
    <>
      <p className="text-lg">
        {freischaltungNachTyp.size} von {typen.length} Fahrzeugen
      </p>

      {!angemeldet && (
        <p className="mt-2 text-sm text-muted">
          Fürs Sammeln brauchst du ein Konto. Ohne Anmeldung siehst du nur, welche
          Fahrzeuge es gibt.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-5">
        {[...gruppen.entries()].map(([gruppe, gruppenTypen]) => (
          <div key={gruppe}>
            {gruppe && <h6 className="mb-2">{gruppe}</h6>}
            <div className="grid grid-cols-3 gap-3">
              {gruppenTypen.map((typ) => {
                const freigeschaltet = angemeldet && freischaltungNachTyp.has(typ.id);
                return (
                  <button
                    key={typ.id}
                    type="button"
                    disabled={!freigeschaltet}
                    onClick={() => setAusgewaehlt(typ)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className="elev-sm flex aspect-square w-full items-center justify-center rounded-2xl text-3xl"
                      style={
                        freigeschaltet
                          ? { background: "var(--color-accent-100)" }
                          : {
                              background: "var(--color-neutral-200)",
                              border: "1.5px dashed var(--color-neutral-400)",
                            }
                      }
                    >
                      <span className={freigeschaltet ? "" : "opacity-50 grayscale"}>
                        {typ.icon}
                      </span>
                    </span>
                    {/* Auch gesperrt sichtbar: sonst weiß niemand, wonach er
                        noch Ausschau halten soll, um das Album zu vervollständigen. */}
                    <span
                      className="text-center text-[11.5px] leading-tight"
                      style={{ color: "var(--color-neutral-700)" }}
                    >
                      {typ.kid_name ?? typ.name_de}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {ausgewaehlt && ausgewaehlteFreischaltung && (
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
            <span className="text-6xl">{ausgewaehlt.icon}</span>
            <h2 className="mt-3 text-lg">{ausgewaehlt.kid_name ?? ausgewaehlt.name_de}</h2>
            <p className="text-sm text-muted">{ausgewaehlt.name_de}</p>
            {ausgewaehlt.kid_description && (
              <p className="mt-3 text-sm">{ausgewaehlt.kid_description}</p>
            )}
            <p className="tag tag-accent mt-3 inline-flex">
              {SELTENHEIT_TEXT[ausgewaehlt.rarity]}
            </p>
            <p className="mt-3 text-xs text-muted">
              Zuerst gesehen am{" "}
              {new Date(ausgewaehlteFreischaltung.unlocked_at).toLocaleDateString("de-DE")}
              {ausgewaehlteFreischaltung.places &&
                ` an ${ausgewaehlteFreischaltung.places.title}`}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
