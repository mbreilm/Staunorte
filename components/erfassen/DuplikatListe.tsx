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
      <h1 className="text-lg font-bold text-zinc-900">Meinst du diesen Ort?</h1>
      <p className="mt-1 text-sm text-zinc-600">
        In der Nähe gibt es schon {orte.length === 1 ? "einen Ort" : "diese Orte"}.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {orte.map((ort) => (
          <li key={ort.id}>
            <Link
              href={`/ort/${ort.id}`}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3"
            >
              <span>
                <span className="block text-sm font-semibold text-zinc-900">
                  {ort.title}
                </span>
                <span className="block text-xs text-zinc-500">
                  {formatDistance(ort.distance_m)} entfernt
                </span>
              </span>
              <span className="text-sm font-medium text-orange-600">
                Stattdessen einchecken →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onTrotzdemAnlegen}
        className="mt-6 h-11 w-full rounded-xl text-sm font-medium text-zinc-500"
      >
        Keiner davon – trotzdem neuen Ort anlegen
      </button>
    </div>
  );
}
