"use client";

import { useState } from "react";
import {
  WOCHENTAG_KUERZEL,
  zeitZuMinuten,
  type ArbeitszeitenAuswahl as Auswahl,
} from "@/lib/arbeitszeiten/typen";

type Props = {
  onAuswahl: (auswahl: Auswahl) => void;
  onAbbrechen: () => void;
};

const PRESET_KACHELN = [
  { preset: "werktags" as const, titel: "Übliche Bauzeiten", untertitel: "Mo–Fr 7–16 Uhr", empfohlen: true },
  { preset: "werktags_sa" as const, titel: "Auch samstags", untertitel: "zusätzlich Sa 8–13 Uhr" },
  { preset: "durchgehend" as const, titel: "Rund um die Uhr", untertitel: undefined },
];

/**
 * Vollbild-Auswahl der Arbeitszeiten (T10) - meldet nur die Auswahl nach
 * oben, ohne selbst zu speichern. Der Aufrufer entscheidet, ob sofort in
 * place_hours geschrieben wird (Detailseite) oder erst später, weil der
 * Ort noch gar nicht existiert (Erfassungs-Flow, app/neu).
 */
export function ArbeitszeitenAuswahl({ onAuswahl, onAbbrechen }: Props) {
  const [zeigeEigene, setZeigeEigene] = useState(false);
  const [wochentage, setWochentage] = useState<number[]>([0, 1, 2, 3, 4]);
  const [von, setVon] = useState("07:00");
  const [bis, setBis] = useState("16:00");

  if (zeigeEigene) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white p-6">
        <h1 className="text-lg font-bold text-zinc-900">Eigene Zeiten</h1>

        <div className="mt-4 flex gap-2">
          {WOCHENTAG_KUERZEL.map((kuerzel, tag) => {
            const aktiv = wochentage.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={aktiv}
                onClick={() =>
                  setWochentage((vorher) =>
                    aktiv ? vorher.filter((t) => t !== tag) : [...vorher, tag].sort(),
                  )
                }
                className={`h-10 w-10 rounded-full text-sm font-medium transition-colors ${
                  aktiv ? "bg-orange-500 text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {kuerzel}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <label className="text-sm font-medium text-zinc-700">
            Von
            <input
              type="time"
              value={von}
              onChange={(e) => setVon(e.target.value)}
              className="mt-1 block h-11 rounded-xl border border-zinc-200 px-3 text-base text-zinc-900"
            />
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Bis
            <input
              type="time"
              value={bis}
              onChange={(e) => setBis(e.target.value)}
              className="mt-1 block h-11 rounded-xl border border-zinc-200 px-3 text-base text-zinc-900"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={wochentage.length === 0}
          onClick={() =>
            onAuswahl({
              preset: "custom",
              wochentage,
              startMin: zeitZuMinuten(von),
              endMin: zeitZuMinuten(bis),
            })
          }
          className="mt-6 h-12 w-full rounded-xl bg-orange-500 text-base font-semibold text-white disabled:opacity-40"
        >
          Übernehmen
        </button>
        <button
          type="button"
          onClick={() => setZeigeEigene(false)}
          className="mt-3 text-sm font-medium text-zinc-500"
        >
          Zurück
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white p-6">
      <h1 className="text-lg font-bold text-zinc-900">Wie sind die Arbeitszeiten?</h1>

      <div className="mt-4 flex flex-col gap-3">
        {PRESET_KACHELN.map((kachel) => (
          <button
            key={kachel.preset}
            type="button"
            onClick={() => onAuswahl({ preset: kachel.preset })}
            className="relative rounded-2xl border border-zinc-200 px-4 py-4 text-left transition-colors hover:border-orange-300"
          >
            {kachel.empfohlen && (
              <span className="absolute right-4 top-4 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                Empfohlen
              </span>
            )}
            <span className="block text-base font-semibold text-zinc-900">
              {kachel.titel}
            </span>
            {kachel.untertitel && (
              <span className="mt-0.5 block text-sm text-zinc-500">{kachel.untertitel}</span>
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setZeigeEigene(true)}
          className="rounded-2xl border border-zinc-200 px-4 py-4 text-left transition-colors hover:border-orange-300"
        >
          <span className="block text-base font-semibold text-zinc-900">Eigene Zeiten</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onAbbrechen}
        className="mt-6 text-sm font-medium text-zinc-500"
      >
        Weiß ich nicht
      </button>
    </div>
  );
}
