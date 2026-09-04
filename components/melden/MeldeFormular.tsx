"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { ReportReason, ReportTargetType } from "@/lib/supabase/types";

const GRUENDE: { wert: ReportReason; text: string }[] = [
  { wert: "existiert_nicht", text: "Gibt es nicht (mehr)" },
  { wert: "falscher_ort", text: "Falscher Ort" },
  { wert: "unpassendes_foto", text: "Unpassendes Foto" },
  { wert: "personen_erkennbar", text: "Personen erkennbar" },
  { wert: "sonstiges", text: "Sonstiges" },
];

type Props = {
  targetType: ReportTargetType;
  targetId: string;
  onFertig: () => void;
};

/** Melde-Formular für Orte und Fotos (T12) - Gründe direkt aus reports.reason. */
export function MeldeFormular({ targetType, targetId, onFertig }: Props) {
  const { user, requireAuth } = useAuth();
  const [grund, setGrund] = useState<ReportReason | null>(null);
  const [kommentar, setKommentar] = useState("");
  const [sendetGerade, setSendetGerade] = useState(false);
  const [gesendet, setGesendet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function absenden() {
    if (!grund) return;
    if (!user) {
      requireAuth("Um etwas zu melden, brauchst du ein Konto.");
      return;
    }
    setSendetGerade(true);
    setFehler(null);

    const supabase = createClient();
    const { error } = await supabase.from("reports").insert({
      target_type: targetType,
      target_id: targetId,
      reporter_id: user.id,
      reason: grund,
      comment: kommentar || null,
    });

    setSendetGerade(false);
    if (error) {
      setFehler("Das hat leider nicht geklappt. Magst du es nochmal versuchen?");
      return;
    }
    setGesendet(true);
  }

  if (gesendet) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-base text-zinc-700">Danke, wir schauen uns das an.</p>
        <button
          type="button"
          onClick={onFertig}
          className="text-sm font-medium text-orange-600"
        >
          Fertig
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-lg font-bold text-zinc-900">Was stimmt nicht?</h1>

      <div className="flex flex-col gap-2">
        {GRUENDE.map((g) => (
          <button
            key={g.wert}
            type="button"
            onClick={() => setGrund(g.wert)}
            aria-pressed={grund === g.wert}
            className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
              grund === g.wert
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-zinc-200 text-zinc-700"
            }`}
          >
            {g.text}
          </button>
        ))}
      </div>

      <textarea
        value={kommentar}
        onChange={(e) => setKommentar(e.target.value)}
        rows={3}
        placeholder="Möchtest du noch etwas dazu sagen? (optional)"
        className="rounded-xl border border-zinc-200 px-3 py-2 text-base text-zinc-900"
      />

      {fehler && <p className="text-sm text-red-600">{fehler}</p>}

      <button
        type="button"
        disabled={!grund || sendetGerade}
        onClick={absenden}
        className="h-12 w-full rounded-xl bg-orange-500 text-base font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-40"
      >
        {sendetGerade ? "Wird gesendet …" : "Melden"}
      </button>
      <button
        type="button"
        onClick={onFertig}
        className="text-sm font-medium text-zinc-500"
      >
        Abbrechen
      </button>
    </div>
  );
}
