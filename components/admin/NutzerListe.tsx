"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type Nutzer = Database["public"]["Functions"]["admin_nutzer_liste"]["Returns"][number];

/**
 * Durchsuchbare Gesamtliste aller Nutzer. Sperren gab es schon (über die
 * Meldungen-Ansicht), hier zusätzlich Entsperren und Admin-Rechte -
 * gleiches Muster wie OrteListe.tsx.
 */
export function NutzerListe({ initial, eigeneId }: { initial: Nutzer[]; eigeneId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [nutzer, setNutzer] = useState(initial);
  const [suche, setSuche] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [aktionId, setAktionId] = useState<string | null>(null);
  const entprellungRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function neuLaden(suchbegriff: string) {
    const { data, error } = await supabase.rpc("admin_nutzer_liste", {
      p_suche: suchbegriff.trim() || null,
    });
    if (error) {
      setFehler(error.message);
      return;
    }
    setFehler(null);
    setNutzer(data ?? []);
  }

  function sucheGeaendert(wert: string) {
    setSuche(wert);
    if (entprellungRef.current) clearTimeout(entprellungRef.current);
    entprellungRef.current = setTimeout(() => neuLaden(wert), 300);
  }

  async function aktion(userId: string, ausfuehren: () => PromiseLike<{ error: unknown }>) {
    setAktionId(userId);
    const { error } = await ausfuehren();
    setAktionId(null);
    if (error) {
      setFehler(error instanceof Error ? error.message : String(error));
      return false;
    }
    setFehler(null);
    return true;
  }

  async function sperreUmschalten(n: Nutzer) {
    const funktion = n.is_blocked ? "admin_nutzer_entsperren" : "admin_nutzer_sperren";
    const ok = await aktion(n.id, () => supabase.rpc(funktion, { p_user_id: n.id }));
    if (ok) {
      setNutzer((liste) =>
        liste.map((x) => (x.id === n.id ? { ...x, is_blocked: !x.is_blocked } : x)),
      );
    }
  }

  async function adminUmschalten(n: Nutzer) {
    const ok = await aktion(n.id, () =>
      supabase.rpc("admin_nutzer_admin_setzen", { p_user_id: n.id, p_admin: !n.is_admin }),
    );
    if (ok) {
      setNutzer((liste) =>
        liste.map((x) => (x.id === n.id ? { ...x, is_admin: !x.is_admin } : x)),
      );
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="field">
        <input
          type="text"
          value={suche}
          onChange={(e) => sucheGeaendert(e.target.value)}
          placeholder="Nach E-Mail oder Name suchen …"
          className="input"
        />
      </div>

      {fehler && (
        <p className="text-sm" style={{ color: "var(--color-accent-700)" }}>
          {fehler}
        </p>
      )}

      {nutzer.length === 0 && <p className="text-sm text-muted">Keine Nutzer gefunden.</p>}

      <ul className="flex flex-col gap-3">
        {nutzer.map((n) => {
          const gesperrt = aktionId === n.id;
          const istEigenesKonto = n.id === eigeneId;

          return (
            <li key={n.id} className="card">
              <p className="card-title">{n.display_name || n.email || n.id}</p>
              <p className="card-meta flex-wrap">
                {n.email && <span>{n.email}</span>}
                {n.is_admin && <span className="tag tag-accent">Admin</span>}
                {n.is_blocked && <span className="tag tag-outline">Gesperrt</span>}
                <span>{n.anzahl_orte} Orte</span>
                <span>{n.anzahl_checkins} Check-ins</span>
                <span>seit {new Date(n.created_at).toLocaleDateString("de-DE")}</span>
              </p>

              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={gesperrt}
                  onClick={() => sperreUmschalten(n)}
                  className="btn btn-secondary text-xs"
                >
                  {n.is_blocked ? "Entsperren" : "Sperren"}
                </button>

                <button
                  type="button"
                  disabled={gesperrt || istEigenesKonto}
                  title={istEigenesKonto ? "Eigene Admin-Rechte können hier nicht geändert werden" : undefined}
                  onClick={() => adminUmschalten(n)}
                  className="btn btn-secondary text-xs"
                >
                  {n.is_admin ? "Admin-Rechte entziehen" : "Zum Admin machen"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
