"use client";

import { useState } from "react";
import type { ObservableType, ObservableRarity } from "@/lib/supabase/types";

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
      <p className="text-lg font-bold text-zinc-900">
        {freischaltungNachTyp.size} von {typen.length} Fahrzeugen
      </p>

      {!angemeldet && (
        <p className="mt-2 text-sm text-zinc-600">
          Fürs Sammeln brauchst du ein Konto. Ohne Anmeldung siehst du nur, welche
          Fahrzeuge es gibt.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-5">
        {[...gruppen.entries()].map(([gruppe, gruppenTypen]) => (
          <div key={gruppe}>
            {gruppe && (
              <p className="mb-2 text-xs font-medium text-zinc-500">{gruppe}</p>
            )}
            <div className="grid grid-cols-4 gap-2">
              {gruppenTypen.map((typ) => {
                const freigeschaltet = angemeldet && freischaltungNachTyp.has(typ.id);
                return (
                  <button
                    key={typ.id}
                    type="button"
                    disabled={!freigeschaltet}
                    onClick={() => setAusgewaehlt(typ)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-2xl text-3xl ${
                      freigeschaltet ? "bg-orange-50" : "bg-zinc-100 text-zinc-300"
                    }`}
                  >
                    {freigeschaltet ? typ.icon : "❓"}
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
          <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 pb-8 text-center shadow-xl">
            <div
              aria-hidden="true"
              className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-200"
            />
            <span className="text-6xl">{ausgewaehlt.icon}</span>
            <h2 className="mt-3 text-lg font-bold text-zinc-900">
              {ausgewaehlt.kid_name ?? ausgewaehlt.name_de}
            </h2>
            <p className="text-sm text-zinc-500">{ausgewaehlt.name_de}</p>
            {ausgewaehlt.kid_description && (
              <p className="mt-3 text-sm text-zinc-700">{ausgewaehlt.kid_description}</p>
            )}
            <p className="mt-3 text-xs font-medium text-orange-600">
              {SELTENHEIT_TEXT[ausgewaehlt.rarity]}
            </p>
            <p className="mt-3 text-xs text-zinc-400">
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
