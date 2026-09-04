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
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)] p-6">
        <h1 className="text-lg">Eigene Zeiten</h1>

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
                className="btn h-10 w-10 p-0 text-sm"
                style={
                  aktiv
                    ? { background: "var(--color-accent)", color: "var(--color-bg)" }
                    : { background: "var(--color-surface)" }
                }
              >
                {kuerzel}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <label className="field text-sm">
            <span>Von</span>
            <input
              type="time"
              value={von}
              onChange={(e) => setVon(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="field text-sm">
            <span>Bis</span>
            <input
              type="time"
              value={bis}
              onChange={(e) => setBis(e.target.value)}
              className="input mt-1"
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
          className="btn btn-primary btn-block h-12 text-base"
        >
          Übernehmen
        </button>
        <button type="button" onClick={() => setZeigeEigene(false)} className="btn btn-ghost mt-3">
          Zurück
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)] p-6">
      <h1 className="text-lg">Wie sind die Arbeitszeiten?</h1>

      <div className="mt-4 flex flex-col gap-3">
        {PRESET_KACHELN.map((kachel) => (
          <button
            key={kachel.preset}
            type="button"
            onClick={() => onAuswahl({ preset: kachel.preset })}
            className="card relative gap-0 px-4 py-4 text-left"
          >
            {kachel.empfohlen && <span className="tag tag-accent absolute right-4 top-4">Empfohlen</span>}
            <span className="card-title block">{kachel.titel}</span>
            {kachel.untertitel && <span className="card-body mt-0.5 block">{kachel.untertitel}</span>}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setZeigeEigene(true)}
          className="card gap-0 px-4 py-4 text-left"
        >
          <span className="card-title block">Eigene Zeiten</span>
        </button>
      </div>

      <button type="button" onClick={onAbbrechen} className="btn btn-ghost mt-6">
        Weiß ich nicht
      </button>
    </div>
  );
}
