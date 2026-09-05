"use client";

import Link from "next/link";
import type { PlaceNearby } from "@/lib/supabase/types";
import { formatDistance } from "@/lib/geo/distance";

type Props = {
  orte: PlaceNearby[];
  onTrotzdemAnlegen: () => void;
};

/**
 * Duplikat-Check beim Erfassen (T7): Orte im Umkreis von 100 m werden
 * gezeigt, bevor ein neuer Ort angelegt wird - "Meinst du diese?" statt
 * versehentlicher Duplikate.
 */
export function DuplikatListe({ orte, onTrotzdemAnlegen }: Props) {
  return (
    <div className="flex flex-1 flex-col px-6 py-6">
      <h1 className="text-2xl">Meinst du diesen Ort?</h1>
      <p className="mt-1 text-sm text-muted">
        In der Nähe gibt es schon {orte.length === 1 ? "einen Ort" : "diese Orte"}.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {orte.map((ort) => (
          <li key={ort.id}>
            <Link href={`/ort/${ort.id}`} className="card flex-row items-center justify-between">
              <span>
                <span className="card-title block">{ort.title}</span>
                <span className="card-meta">{formatDistance(ort.distance_m)} entfernt</span>
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--color-accent-600)" }}>
                Stattdessen einchecken →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <button type="button" onClick={onTrotzdemAnlegen} className="btn btn-ghost mt-6 w-full">
        Keiner davon – trotzdem neuen Ort anlegen
      </button>
    </div>
  );
}
