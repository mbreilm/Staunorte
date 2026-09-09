"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ladeFotoAlsAdminHoch } from "@/lib/admin/fotoUpload";

type Ort = Database["public"]["Functions"]["admin_orte_liste"]["Returns"][number];
type Foto = Database["public"]["Functions"]["admin_ort_fotos"]["Returns"][number];

const FOTO_BUCKET = "place-photos";

const STATUS_TEXT: Record<string, string> = {
  aktiv: "Aktiv",
  ruhend: "Ruhend",
  vermutlich_beendet: "Vermutlich beendet",
  beendet: "Beendet",
};

const QUELLE_TEXT: Record<string, string> = {
  user: "Nutzer",
  open_data: "Open Data",
};

/**
 * Durchsuchbare Gesamtliste aller Orte (auch ausgeblendete). "Optik ist
 * egal, Funktion zählt" - wie MeldungenListe.tsx, hier zusätzlich mit
 * Suche, Inline-Titelbearbeitung und Fotoverwaltung.
 */
export function OrteListe({ initial }: { initial: Ort[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [orte, setOrte] = useState(initial);
  const [suche, setSuche] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [aktionId, setAktionId] = useState<string | null>(null);
  const [bearbeitetId, setBearbeitetId] = useState<string | null>(null);
  const [titelEntwurf, setTitelEntwurf] = useState("");
  const [loeschBestaetigen, setLoeschBestaetigen] = useState<string | null>(null);
  const entprellungRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fotoverwaltung: pro Ort erst laden, wenn der Abschnitt aufgeklappt wird
  // (sonst N+1-Abfragen bei jedem Seitenaufruf).
  const [fotosOffenId, setFotosOffenId] = useState<string | null>(null);
  const [fotosNachOrt, setFotosNachOrt] = useState<Record<string, Foto[]>>({});
  const [fotosLaedtId, setFotosLaedtId] = useState<string | null>(null);
  const [fotoAktionId, setFotoAktionId] = useState<string | null>(null);
  const [fotoUploadOrtId, setFotoUploadOrtId] = useState<string | null>(null);

  function fotoUrl(pfad: string) {
    return supabase.storage.from(FOTO_BUCKET).getPublicUrl(pfad).data.publicUrl;
  }

  async function neuLaden(suchbegriff: string) {
    const { data, error } = await supabase.rpc("admin_orte_liste", {
      p_suche: suchbegriff.trim() || null,
    });
    if (error) {
      setFehler(error.message);
      return;
    }
    setFehler(null);
    setOrte(data ?? []);
  }

  function sucheGeaendert(wert: string) {
    setSuche(wert);
    if (entprellungRef.current) clearTimeout(entprellungRef.current);
    entprellungRef.current = setTimeout(() => neuLaden(wert), 300);
  }

  async function aktion(placeId: string, ausfuehren: () => PromiseLike<{ error: unknown }>) {
    setAktionId(placeId);
    setLoeschBestaetigen(null);
    const { error } = await ausfuehren();
    setAktionId(null);
    if (error) {
      setFehler(error instanceof Error ? error.message : String(error));
      return;
    }
    setFehler(null);
    return true;
  }

  async function alsBeendetMarkieren(ort: Ort) {
    const ok = await aktion(ort.id, () =>
      supabase.rpc("admin_ort_beendet", { p_place_id: ort.id }),
    );
    if (ok) {
      setOrte((liste) =>
        liste.map((o) => (o.id === ort.id ? { ...o, status: "beendet" } : o)),
      );
    }
  }

  async function ausblenden(ort: Ort) {
    const ok = await aktion(ort.id, () =>
      supabase.rpc("admin_ort_ausblenden", { p_place_id: ort.id }),
    );
    if (ok) {
      setOrte((liste) =>
        liste.map((o) => (o.id === ort.id ? { ...o, is_hidden: true } : o)),
      );
    }
  }

  async function loeschen(ort: Ort) {
    const ok = await aktion(ort.id, () =>
      supabase.rpc("admin_ort_loeschen", { p_place_id: ort.id }),
    );
    if (ok) {
      setOrte((liste) => liste.filter((o) => o.id !== ort.id));
    }
  }

  async function titelSpeichern(ort: Ort) {
    const neuerTitel = titelEntwurf.trim();
    const ok = await aktion(ort.id, () =>
      supabase.rpc("admin_ort_titel_aendern", {
        p_place_id: ort.id,
        p_titel: neuerTitel,
      }),
    );
    if (ok) {
      setOrte((liste) =>
        liste.map((o) => (o.id === ort.id ? { ...o, title: neuerTitel } : o)),
      );
      setBearbeitetId(null);
    }
  }

  async function fotosLaden(placeId: string) {
    setFotosLaedtId(placeId);
    const { data, error } = await supabase.rpc("admin_ort_fotos", {
      p_place_id: placeId,
    });
    setFotosLaedtId(null);
    if (error) {
      setFehler(error.message);
      return;
    }
    setFotosNachOrt((vorher) => ({ ...vorher, [placeId]: data ?? [] }));
  }

  function fotosUmschalten(placeId: string) {
    const neuOffen = fotosOffenId === placeId ? null : placeId;
    setFotosOffenId(neuOffen);
    if (neuOffen && !fotosNachOrt[neuOffen]) fotosLaden(neuOffen);
  }

  async function fotoLoeschen(placeId: string, fotoId: string) {
    setFotoAktionId(fotoId);
    const { error } = await supabase.rpc("admin_foto_loeschen", {
      p_photo_id: fotoId,
    });
    setFotoAktionId(null);
    if (error) {
      setFehler(error.message);
      return;
    }
    setFotosNachOrt((vorher) => ({
      ...vorher,
      [placeId]: (vorher[placeId] ?? []).filter((f) => f.id !== fotoId),
    }));
  }

  async function fotosHochladen(placeId: string, dateien: File[]) {
    setFotoUploadOrtId(placeId);
    for (const datei of dateien) {
      const ergebnis = await ladeFotoAlsAdminHoch(datei, placeId);
      if (!ergebnis.ok) setFehler(ergebnis.fehler);
    }
    setFotoUploadOrtId(null);
    await fotosLaden(placeId);
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="field">
        <input
          type="text"
          value={suche}
          onChange={(e) => sucheGeaendert(e.target.value)}
          placeholder="Nach Titel suchen …"
          className="input"
        />
      </div>

      {fehler && (
        <p className="text-sm" style={{ color: "var(--color-accent-700)" }}>
          {fehler}
        </p>
      )}

      {orte.length === 0 && <p className="text-sm text-muted">Keine Orte gefunden.</p>}

      <ul className="flex flex-col gap-3">
        {orte.map((ort) => {
          const gesperrt = aktionId === ort.id;
          const wirdBearbeitet = bearbeitetId === ort.id;
          const fotosOffen = fotosOffenId === ort.id;
          const fotos = fotosNachOrt[ort.id];

          return (
            <li key={ort.id} className="card">
              {wirdBearbeitet ? (
                <div className="field">
                  <input
                    type="text"
                    value={titelEntwurf}
                    onChange={(e) => setTitelEntwurf(e.target.value)}
                    className="input"
                    minLength={3}
                    maxLength={120}
                  />
                </div>
              ) : (
                <p className="card-title">{ort.title}</p>
              )}

              <p className="card-meta flex-wrap">
                <span className="tag tag-sm tag-accent">{STATUS_TEXT[ort.status] ?? ort.status}</span>
                <span className="tag tag-sm tag-neutral">{QUELLE_TEXT[ort.source] ?? ort.source}</span>
                {!ort.is_confirmed && <span className="tag tag-sm tag-outline">Unbestätigt</span>}
                {ort.is_hidden && <span className="tag tag-sm tag-outline">Ausgeblendet</span>}
                <span>{ort.checkin_count} Check-ins</span>
                <span>{new Date(ort.created_at).toLocaleDateString("de-DE")}</span>
                <span>{ort.ersteller_email ?? "–"}</span>
              </p>

              <div className="mt-1 flex flex-wrap gap-2">
                {wirdBearbeitet ? (
                  <>
                    <button
                      type="button"
                      disabled={gesperrt}
                      onClick={() => titelSpeichern(ort)}
                      className="btn btn-primary text-xs"
                    >
                      Speichern
                    </button>
                    <button
                      type="button"
                      onClick={() => setBearbeitetId(null)}
                      className="btn btn-ghost text-xs"
                    >
                      Abbrechen
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={gesperrt}
                    onClick={() => {
                      setBearbeitetId(ort.id);
                      setTitelEntwurf(ort.title);
                    }}
                    className="btn btn-secondary text-xs"
                  >
                    Titel bearbeiten
                  </button>
                )}

                {ort.status !== "beendet" && (
                  <button
                    type="button"
                    disabled={gesperrt}
                    onClick={() => alsBeendetMarkieren(ort)}
                    className="btn btn-secondary text-xs"
                  >
                    Als beendet markieren
                  </button>
                )}

                {!ort.is_hidden && (
                  <button
                    type="button"
                    disabled={gesperrt}
                    onClick={() => ausblenden(ort)}
                    className="btn btn-secondary text-xs"
                  >
                    Ausblenden
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fotosUmschalten(ort.id)}
                  className="btn btn-secondary text-xs"
                  aria-expanded={fotosOffen}
                >
                  {fotosOffen ? "Fotos verbergen" : "Fotos verwalten"}
                </button>

                {loeschBestaetigen === ort.id ? (
                  <>
                    <button
                      type="button"
                      disabled={gesperrt}
                      onClick={() => loeschen(ort)}
                      className="btn text-xs"
                      style={{ border: "1px solid var(--color-accent-400)", color: "var(--color-accent-700)" }}
                    >
                      Wirklich löschen?
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoeschBestaetigen(null)}
                      className="btn btn-ghost text-xs"
                    >
                      Abbrechen
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={gesperrt}
                    onClick={() => setLoeschBestaetigen(ort.id)}
                    className="btn text-xs"
                    style={{ border: "1px solid var(--color-accent-400)", color: "var(--color-accent-700)" }}
                  >
                    Löschen
                  </button>
                )}
              </div>

              {fotosOffen && (
                <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-divider)" }}>
                  {fotosLaedtId === ort.id && !fotos && (
                    <p className="text-xs text-muted">Fotos werden geladen …</p>
                  )}

                  {fotos && fotos.length === 0 && (
                    <p className="text-xs text-muted">Noch keine Fotos.</p>
                  )}

                  {fotos && fotos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {fotos.map((foto) => (
                        <div key={foto.id} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-Fotos ohne next/image-Konfiguration */}
                          <img
                            src={fotoUrl(foto.storage_path)}
                            alt=""
                            className="h-16 w-16 rounded-lg object-cover"
                            style={{ opacity: foto.moderation_status === "ok" ? 1 : 0.4 }}
                          />
                          <button
                            type="button"
                            aria-label="Foto löschen"
                            disabled={fotoAktionId === foto.id}
                            onClick={() => fotoLoeschen(ort.id, foto.id)}
                            className="btn btn-icon elev-sm absolute -right-1.5 -top-1.5"
                            style={{ width: 22, height: 22, fontSize: 11 }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="btn btn-secondary mt-2 inline-flex cursor-pointer text-xs">
                    {fotoUploadOrtId === ort.id ? "Wird hochgeladen …" : "Foto hinzufügen"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      disabled={fotoUploadOrtId === ort.id}
                      onChange={(e) => {
                        const dateien = Array.from(e.target.files ?? []);
                        if (dateien.length > 0) fotosHochladen(ort.id, dateien);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
