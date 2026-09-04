"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { ObservableType, PlaceNearby } from "@/lib/supabase/types";
import { leseExif, type ExifDaten } from "@/lib/geo/exif";
import {
  ladeEntwurf,
  speichereEntwurf,
  loescheEntwurf,
  type OrtEntwurf,
} from "@/lib/erfassen/entwurf";
import { ladeFotoHoch, type UploadFortschritt } from "@/lib/erfassen/fotoUpload";
import { StandortAuswahl } from "@/components/erfassen/StandortAuswahl";
import { DuplikatListe } from "@/components/erfassen/DuplikatListe";
import { FahrzeugChips } from "@/components/erfassen/FahrzeugChips";

const STANDARD_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "48.1372");
const STANDARD_LON = Number(process.env.NEXT_PUBLIC_DEFAULT_LON ?? "11.5756");
const KATEGORIE = process.env.NEXT_PUBLIC_DEFAULT_CATEGORY || "baustelle";
const DUPLIKAT_RADIUS_M = 100;

type EnumAttribut = { type: "enum"; label: string; values: string[] };
type AttributSchema = Record<string, EnumAttribut>;

function istEnumAttribut(wert: unknown): wert is EnumAttribut {
  return (
    typeof wert === "object" &&
    wert !== null &&
    (wert as { type?: unknown }).type === "enum" &&
    Array.isArray((wert as { values?: unknown }).values)
  );
}

type Schritt = "foto" | "standort" | "duplikate" | "formular" | "speichern";

export default function OrtErfassen() {
  const { user, isLoading, requireAuth } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<File | null>(null);
  const exifDatenRef = useRef<ExifDaten>({ lat: null, lon: null, aufgenommenAm: null });

  const [schritt, setSchritt] = useState<Schritt>("foto");
  const [entwurf, setEntwurf] = useState<OrtEntwurf>(ladeEntwurf);
  const [standortBereitsBekannt] = useState(() => ladeEntwurf().lat !== null);
  const [duplikate, setDuplikate] = useState<PlaceNearby[]>([]);
  const [fahrzeugTypen, setFahrzeugTypen] = useState<ObservableType[]>([]);
  const [attributSchema, setAttributSchema] = useState<AttributSchema>({});
  const [kategorieName, setKategorieName] = useState("");
  const [beobachtungsLabel, setBeobachtungsLabel] = useState("");
  const [ladeStandort, setLadeStandort] = useState(false);
  const [speichertGerade, setSpeichertGerade] = useState(false);
  const [fotoFortschritt, setFotoFortschritt] = useState<UploadFortschritt | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  // Konto nötig (PRD 6.2) - erscheint erst hier, blockiert also nicht den
  // ersten Eindruck der App an anderer Stelle.
  useEffect(() => {
    if (!isLoading && !user) {
      requireAuth("Um einen Ort anzulegen, brauchst du ein Konto.");
    }
  }, [isLoading, user, requireAuth]);

  // Fahrzeugkatalog + Kategorie-Metadaten einmal laden - unabhängig vom
  // aktuellen Schritt, damit sie beim Erreichen des Formulars schon da sind.
  useEffect(() => {
    supabase
      .from("observable_types")
      .select("*")
      .eq("category_id", KATEGORIE)
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setFahrzeugTypen(data ?? []));

    supabase
      .from("place_categories")
      .select("name_singular, observable_label, attribute_schema")
      .eq("id", KATEGORIE)
      .maybeSingle()
      .then(({ data }) => {
        setKategorieName(data?.name_singular ?? "");
        setBeobachtungsLabel(data?.observable_label ?? "");
        const schema: AttributSchema = {};
        const roh = data?.attribute_schema;
        if (roh && typeof roh === "object" && !Array.isArray(roh)) {
          for (const [schluessel, wert] of Object.entries(roh)) {
            if (istEnumAttribut(wert)) schema[schluessel] = wert;
          }
        }
        setAttributSchema(schema);
      });
  }, [supabase]);

  function entwurfAktualisieren(teil: Partial<OrtEntwurf>) {
    setEntwurf((vorher) => {
      const naechster = { ...vorher, ...teil };
      speichereEntwurf(naechster);
      return naechster;
    });
  }

  async function nachStandortBestaetigt(position: { lat: number; lon: number }) {
    entwurfAktualisieren({ lat: position.lat, lon: position.lon });
    await pruefeDuplikateUndGeheWeiter(position);

    // Titelvorschlag im Hintergrund holen - blockiert den Flow nicht.
    fetch(`/api/geocode?lat=${position.lat}&lon=${position.lon}`)
      .then((res) => res.json())
      .then((daten: { strasse: string | null }) => {
        if (!daten.strasse) return;
        const vorschlag = `${kategorieName} ${daten.strasse}`.trim();
        setEntwurf((vorher) => {
          if (vorher.titel) return vorher; // Nutzer hat schon getippt
          const naechster = { ...vorher, titel: vorschlag };
          speichereEntwurf(naechster);
          return naechster;
        });
      })
      .catch(() => {
        // Kein Titelvorschlag - Titel bleibt leer, Person tippt selbst.
      });
  }

  async function pruefeDuplikateUndGeheWeiter(position: { lat: number; lon: number }) {
    const { data } = await supabase.rpc("places_nearby", {
      p_lat: position.lat,
      p_lon: position.lon,
      p_radius_m: DUPLIKAT_RADIUS_M,
      p_category: KATEGORIE,
    });
    if (data && data.length > 0) {
      setDuplikate(data);
      setSchritt("duplikate");
    } else {
      setSchritt("formular");
    }
  }

  async function aufFotoAusgewaehlt(datei: File) {
    fotoRef.current = datei;
    setLadeStandort(true);

    // EXIF nur einmal lesen - das Datum wird erst beim Upload gebraucht,
    // die Koordinaten ggf. sofort für den Standort-Schritt.
    exifDatenRef.current = await leseExif(datei);

    if (standortBereitsBekannt && entwurf.lat !== null && entwurf.lon !== null) {
      // Standort schon aus einem früheren Entwurf bekannt - nicht erneut abfragen.
      setLadeStandort(false);
      await pruefeDuplikateUndGeheWeiter({ lat: entwurf.lat, lon: entwurf.lon });
      return;
    }

    const { lat, lon } = exifDatenRef.current;
    if (lat !== null && lon !== null) {
      setLadeStandort(false);
      setSchritt("standort");
      entwurfAktualisieren({ lat, lon });
      return;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLadeStandort(false);
          setSchritt("standort");
          entwurfAktualisieren({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        () => {
          setLadeStandort(false);
          setSchritt("standort");
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      setLadeStandort(false);
      setSchritt("standort");
    }
  }

  async function speichern() {
    if (entwurf.lat === null || entwurf.lon === null) return;
    setSpeichertGerade(true);
    setFehler(null);

    const { data: neueId, error } = await supabase.rpc("create_place", {
      p_title: entwurf.titel,
      p_lat: entwurf.lat,
      p_lon: entwurf.lon,
      p_observable_ids: entwurf.ausgewaehlteFahrzeuge,
      p_note: entwurf.notiz || undefined,
      p_attributes: entwurf.attribute,
      p_category: KATEGORIE,
    });

    if (error) {
      if (error.message.startsWith("DUPLIKAT:")) {
        const id = error.message.split(":")[1];
        loescheEntwurf();
        router.push(`/ort/${id}`);
        return;
      }
      if (error.message === "NICHT_ANGEMELDET") {
        requireAuth("Um einen Ort anzulegen, brauchst du ein Konto.");
      } else if (error.message === "GESPERRT") {
        setFehler("Dieses Konto kann gerade keine Orte anlegen.");
      } else {
        setFehler("Das hat leider nicht geklappt. Magst du es nochmal versuchen?");
      }
      setSpeichertGerade(false);
      return;
    }

    // Direkt eingecheckt (PRD 6.2) - mit denselben Fahrzeugauswahlen, ohne
    // zusätzliche Rückfrage. Schlägt das aus irgendeinem Grund fehl,
    // blockiert das nicht die Navigation zum neuen Ort.
    if (neueId) {
      await supabase.rpc("do_checkin", {
        p_place_id: neueId,
        p_lat: entwurf.lat,
        p_lon: entwurf.lon,
        p_observable_ids: entwurf.ausgewaehlteFahrzeuge,
      });
    }

    // Foto hochladen (T8) - erst jetzt möglich, die RLS-Regel auf
    // place_photos verlangt einen bestehenden Check-in. Ein Fehlschlag
    // hier verwirft nicht den bereits angelegten Ort, siehe TICKETS.md T8
    // ("ohne den ganzen Flow zu verlieren").
    if (neueId && fotoRef.current && user) {
      await ladeFotoHoch({
        datei: fotoRef.current,
        placeId: neueId,
        hochgeladenVon: user.id,
        koordinaten:
          exifDatenRef.current.lat !== null && exifDatenRef.current.lon !== null
            ? { lat: exifDatenRef.current.lat, lon: exifDatenRef.current.lon }
            : null,
        aufgenommenAm: exifDatenRef.current.aufgenommenAm,
        aufFortschritt: setFotoFortschritt,
      });
    }

    loescheEntwurf();
    router.push(`/ort/${neueId}`);
  }

  if (schritt === "foto") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-base text-zinc-700">
          Mach ein Foto oder wähl eins aus deiner Galerie, um loszulegen.
        </p>
        <input
          ref={fotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const datei = e.target.files?.[0];
            if (datei) aufFotoAusgewaehlt(datei);
          }}
        />
        <button
          type="button"
          disabled={ladeStandort}
          onClick={() => fotoInputRef.current?.click()}
          className="h-12 w-full max-w-xs rounded-xl bg-orange-500 text-base font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
        >
          {ladeStandort ? "Einen Moment …" : "Foto auswählen"}
        </button>
      </main>
    );
  }

  if (schritt === "standort") {
    return (
      <StandortAuswahl
        start={{
          lat: entwurf.lat ?? STANDARD_LAT,
          lon: entwurf.lon ?? STANDARD_LON,
        }}
        onBestaetigt={nachStandortBestaetigt}
      />
    );
  }

  if (schritt === "duplikate") {
    return (
      <DuplikatListe
        orte={duplikate}
        onTrotzdemAnlegen={() => setSchritt("formular")}
      />
    );
  }

  // schritt === "formular"
  return (
    <main className="flex-1 px-6 py-6 pb-10">
      <h1 className="text-lg font-bold text-zinc-900">Ort erfassen</h1>

      <label className="mt-4 block text-sm font-medium text-zinc-700">
        Titel
        <input
          type="text"
          value={entwurf.titel}
          onChange={(e) => entwurfAktualisieren({ titel: e.target.value })}
          placeholder={`${kategorieName} …`}
          className="mt-1 h-11 w-full rounded-xl border border-zinc-200 px-3 text-base text-zinc-900"
        />
      </label>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-zinc-700">
          Welche {beobachtungsLabel || "Merkmale"} siehst du?
        </p>
        <FahrzeugChips
          typen={fahrzeugTypen}
          ausgewaehlt={entwurf.ausgewaehlteFahrzeuge}
          onToggle={(id) =>
            entwurfAktualisieren({
              ausgewaehlteFahrzeuge: entwurf.ausgewaehlteFahrzeuge.includes(id)
                ? entwurf.ausgewaehlteFahrzeuge.filter((x) => x !== id)
                : [...entwurf.ausgewaehlteFahrzeuge, id],
            })
          }
        />
      </div>

      <details className="mt-5">
        <summary className="cursor-pointer text-sm font-medium text-zinc-500">
          Mehr Details (optional)
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          {Object.entries(attributSchema).map(([schluessel, feld]) => (
            <label key={schluessel} className="block text-sm font-medium text-zinc-700">
              {feld.label}
              <select
                value={entwurf.attribute[schluessel] ?? ""}
                onChange={(e) => {
                  const naechsteAttribute = { ...entwurf.attribute };
                  if (e.target.value) naechsteAttribute[schluessel] = e.target.value;
                  else delete naechsteAttribute[schluessel];
                  entwurfAktualisieren({ attribute: naechsteAttribute });
                }}
                className="mt-1 h-11 w-full rounded-xl border border-zinc-200 px-3 text-base text-zinc-900"
              >
                <option value="">Nicht angegeben</option>
                {feld.values.map((wert) => (
                  <option key={wert} value={wert}>
                    {wert}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <label className="block text-sm font-medium text-zinc-700">
            Notiz
            <textarea
              value={entwurf.notiz}
              onChange={(e) => entwurfAktualisieren({ notiz: e.target.value })}
              rows={3}
              placeholder="z. B. guter Blick vom Spielplatz aus"
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base text-zinc-900"
            />
          </label>
        </div>
      </details>

      {fehler && <p className="mt-4 text-sm text-red-600">{fehler}</p>}

      <button
        type="button"
        disabled={
          !entwurf.titel.trim() ||
          entwurf.ausgewaehlteFahrzeuge.length === 0 ||
          speichertGerade
        }
        onClick={speichern}
        className="mt-6 h-12 w-full rounded-xl bg-orange-500 text-base font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-40"
      >
        {fotoSpeicherText(speichertGerade, fotoFortschritt)}
      </button>
    </main>
  );
}

function fotoSpeicherText(
  speichertGerade: boolean,
  fotoFortschritt: UploadFortschritt | null,
): string {
  if (!speichertGerade) return "Ort speichern";
  if (fotoFortschritt === "verkleinern") return "Foto wird verkleinert …";
  if (fotoFortschritt === "hochladen") return "Foto wird hochgeladen …";
  return "Wird gespeichert …";
}
