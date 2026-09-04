"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type Meldung =
  Database["public"]["Functions"]["admin_meldungen_offen"]["Returns"][number];

const GRUND_TEXT: Record<string, string> = {
  existiert_nicht: "Gibt es nicht (mehr)",
  falscher_ort: "Falscher Ort",
  unpassendes_foto: "Unpassendes Foto",
  personen_erkennbar: "Personen erkennbar",
  sonstiges: "Sonstiges",
};

const FOTO_BUCKET = "place-photos";

/**
 * Admin-Aktionen auf offenen Meldungen (T12). "Optik ist egal, Funktion
 * zählt" - schlichte Liste mit Textbuttons.
 */
export function MeldungenListe({ meldungen }: { meldungen: Meldung[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [laedtId, setLaedtId] = useState<string | null>(null);

  async function aktion(reportId: string, ausfuehren: () => PromiseLike<unknown>) {
    setLaedtId(reportId);
    await ausfuehren();
    setLaedtId(null);
    router.refresh();
  }

  if (meldungen.length === 0) {
    return <p className="mt-4 text-sm text-muted">Keine offenen Meldungen.</p>;
  }

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {meldungen.map((m) => {
        const gesperrt = laedtId === m.report_id;
        return (
          <li key={m.report_id} className="card">
            <p className="card-title">
              {m.target_type === "place" ? "Ort" : "Foto"}: {m.titel ?? m.target_id}
            </p>
            <p className="card-meta">
              {GRUND_TEXT[m.reason] ?? m.reason} ·{" "}
              {new Date(m.created_at).toLocaleString("de-DE")}
            </p>
            {m.comment && <p className="mt-1 text-sm">{m.comment}</p>}
            {m.foto_pfad && (
              // eslint-disable-next-line @next/next/no-img-element -- Admin-Ansicht, kein next/image nötig
              <img
                src={
                  supabase.storage.from(FOTO_BUCKET).getPublicUrl(m.foto_pfad).data
                    .publicUrl
                }
                alt=""
                className="mt-2 h-32 w-full rounded-lg object-cover"
              />
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={gesperrt}
                onClick={() =>
                  aktion(m.report_id, () =>
                    m.target_type === "place"
                      ? supabase.rpc("admin_ort_ausblenden", { p_place_id: m.target_id })
                      : supabase.rpc("admin_foto_ausblenden", { p_photo_id: m.target_id }),
                  )
                }
                className="btn btn-secondary text-xs"
              >
                Ausblenden
              </button>
              <button
                type="button"
                disabled={gesperrt}
                onClick={() =>
                  aktion(m.report_id, () =>
                    m.target_type === "place"
                      ? supabase.rpc("admin_ort_loeschen", { p_place_id: m.target_id })
                      : supabase.rpc("admin_foto_loeschen", { p_photo_id: m.target_id }),
                  )
                }
                className="btn text-xs"
                style={{ border: "1px solid var(--color-accent-400)", color: "var(--color-accent-700)" }}
              >
                Löschen
              </button>
              <button
                type="button"
                disabled={gesperrt}
                onClick={() =>
                  aktion(m.report_id, () =>
                    supabase.rpc("admin_meldung_erledigt", { p_report_id: m.report_id }),
                  )
                }
                className="btn btn-secondary text-xs"
              >
                Erledigt
              </button>
              {m.ersteller_id && (
                <button
                  type="button"
                  disabled={gesperrt}
                  onClick={() =>
                    aktion(m.report_id, () =>
                      supabase.rpc("admin_nutzer_sperren", { p_user_id: m.ersteller_id! }),
                    )
                  }
                  className="btn text-xs"
                  style={{ border: "1px solid var(--color-accent-400)", color: "var(--color-accent-700)" }}
                >
                  Nutzer sperren
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
