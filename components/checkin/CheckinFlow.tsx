"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { ObservableType, PlaceObservableView } from "@/lib/supabase/types";
import { formatDistance } from "@/lib/geo/distance";
import { leseExif } from "@/lib/geo/exif";
import { ladeFotoHoch } from "@/lib/erfassen/fotoUpload";
import { StandortAuswahl } from "@/components/erfassen/StandortAuswahl";

type Props = {
  placeId: string;
  categoryId: string;
  erstelltVon: string | null;
  bereitsGemeldet: PlaceObservableView[];
  onClose: () => void;
};

type Schritt =
  | "lade-standort"
  | "auswahl"
  | "speichert"
  | "fehler"
  | "pin-korrigieren"
  | "erfolg"
  | "foto-angebot";

const FEHLER_TEXT: Record<string, string> = {
  GPS_UNGENAU:
    "Dein Standort ist gerade zu ungenau. Geh nach Möglichkeit ins Freie und versuch es nochmal.",
  NICHT_ANGEMELDET: "Dafür brauchst du ein Konto.",
};

export function CheckinFlow({
  placeId,
  categoryId,
  erstelltVon,
  bereitsGemeldet,
  onClose,
}: Props) {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const positionRef = useRef<{ lat: number; lon: number; accuracy: number | null } | null>(
    null,
  );
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const hatEingecheckt = useRef(false);

  const [schritt, setSchritt] = useState<Schritt>("lade-standort");
  const [fehlerText, setFehlerText] = useState("");
  const [zuWeitEntfernt, setZuWeitEntfernt] = useState<number | null>(null);
  const [weitereTypen, setWeitereTypen] = useState<ObservableType[]>([]);
  const [suchbegriff, setSuchbegriff] = useState("");
  const [ausgewaehlt, setAusgewaehlt] = useState<string[]>([]);
  const [neueFreischaltungen, setNeueFreischaltungen] = useState<ObservableType[]>([]);
  const [fotoStatus, setFotoStatus] = useState<"keins" | "laedt" | "fertig" | "fehler">(
    "keins",
  );

  const gemeldetSortiert = useMemo(
    () => [...bereitsGemeldet].sort((a, b) => b.confidence - a.confidence),
    [bereitsGemeldet],
  );
  const gemeldeteIds = useMemo(
    () => new Set(bereitsGemeldet.map((b) => b.observable_type_id)),
    [bereitsGemeldet],
  );

  useEffect(() => {
    standortHolen();
    supabase
      .from("observable_types")
      .select("*")
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setWeitereTypen(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- soll nur einmal beim Öffnen laufen
  }, []);

  function standortHolen() {
    setSchritt("lade-standort");
    if (!("geolocation" in navigator)) {
      setFehlerText("Dieses Gerät kann keinen Standort bestimmen.");
      setSchritt("fehler");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        positionRef.current = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setSchritt("auswahl");
      },
      () => {
        setFehlerText(
          "Wir konnten deinen Standort nicht bestimmen. Bitte Standortzugriff erlauben.",
        );
        setSchritt("fehler");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function eingecheckt() {
    const position = positionRef.current;
    if (!position) return;
    setSchritt("speichert");

    const { data, error } = await supabase.rpc("do_checkin", {
      p_place_id: placeId,
      p_lat: position.lat,
      p_lon: position.lon,
      p_accuracy_m: position.accuracy ?? undefined,
      p_observable_ids: ausgewaehlt,
    });

    if (error) {
      if (error.message.startsWith("ZU_WEIT_ENTFERNT:")) {
        setZuWeitEntfernt(Number(error.message.split(":")[1]));
        setFehlerText("");
      } else if (error.message === "NICHT_ANGEMELDET") {
        requireAuth("Um einzuchecken, brauchst du ein Konto.");
        setFehlerText(FEHLER_TEXT.NICHT_ANGEMELDET);
      } else {
        setFehlerText(FEHLER_TEXT[error.message] ?? "Das hat leider nicht geklappt.");
      }
      setSchritt("fehler");
      return;
    }

    hatEingecheckt.current = true;
    const freigeschaltet = weitereTypen.filter((typ) =>
      (data?.new_unlocks ?? []).includes(typ.id),
    );
    setNeueFreischaltungen(freigeschaltet);
    setSchritt("erfolg");
  }

  async function pinKorrigiert(position: { lat: number; lon: number }) {
    await supabase.rpc("update_place_location", {
      p_place_id: placeId,
      p_lat: position.lat,
      p_lon: position.lon,
    });
    setZuWeitEntfernt(null);
    await eingecheckt();
  }

  async function aufFotoAusgewaehlt(datei: File) {
    if (!user) return;
    setFotoStatus("laedt");
    const exif = await leseExif(datei);
    const ergebnis = await ladeFotoHoch({
      datei,
      placeId,
      hochgeladenVon: user.id,
      koordinaten: exif.lat !== null && exif.lon !== null ? { lat: exif.lat, lon: exif.lon } : null,
      aufgenommenAm: exif.aufgenommenAm,
    });
    setFotoStatus(ergebnis.ok ? "fertig" : "fehler");
  }

  function schliessen() {
    if (hatEingecheckt.current) router.refresh();
    onClose();
  }

  const gefundeneWeitere = weitereTypen.filter(
    (typ) =>
      !gemeldeteIds.has(typ.id) &&
      suchbegriff.trim().length > 0 &&
      typ.name_de.toLowerCase().includes(suchbegriff.trim().toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={schliessen}
          aria-label="Schließen"
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-zinc-400"
        >
          ×
        </button>
      </div>

      {schritt === "lade-standort" && (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-zinc-600">
          Wir suchen deinen Standort …
        </div>
      )}

      {schritt === "fehler" && zuWeitEntfernt === null && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-base text-zinc-700">{fehlerText}</p>
          <button
            type="button"
            onClick={standortHolen}
            className="h-11 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white"
          >
            Nochmal versuchen
          </button>
        </div>
      )}

      {schritt === "fehler" && zuWeitEntfernt !== null && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-base text-zinc-700">
            Du bist gerade {formatDistance(zuWeitEntfernt)} von diesem Ort entfernt.
          </p>
          <button
            type="button"
            onClick={eingecheckt}
            className="h-11 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white"
          >
            Nochmal versuchen
          </button>
          {erstelltVon && user?.id === erstelltVon && (
            <button
              type="button"
              onClick={() => setSchritt("pin-korrigieren")}
              className="text-sm font-medium text-zinc-500 underline-offset-2 hover:underline"
            >
              Ist der Pin falsch gesetzt? Jetzt korrigieren
            </button>
          )}
        </div>
      )}

      {schritt === "pin-korrigieren" && (
        <PinKorrektur placeId={placeId} onBestaetigt={pinKorrigiert} />
      )}

      {schritt === "auswahl" && (
        <div className="flex-1 overflow-y-auto px-6 pb-24">
          <h1 className="text-lg font-bold text-zinc-900">Was siehst du gerade?</h1>

          {gemeldetSortiert.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {gemeldetSortiert.map((typ) => (
                <Chip
                  key={typ.observable_type_id}
                  icon={typ.icon}
                  name={typ.name_de}
                  aktiv={ausgewaehlt.includes(typ.observable_type_id)}
                  onClick={() =>
                    setAusgewaehlt((vorher) =>
                      vorher.includes(typ.observable_type_id)
                        ? vorher.filter((x) => x !== typ.observable_type_id)
                        : [...vorher, typ.observable_type_id],
                    )
                  }
                />
              ))}
            </div>
          )}

          <div className="mt-5">
            <input
              type="text"
              value={suchbegriff}
              onChange={(e) => setSuchbegriff(e.target.value)}
              placeholder="Weitere hinzufügen …"
              className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-base text-zinc-900"
            />
            {gefundeneWeitere.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {gefundeneWeitere.map((typ) => (
                  <Chip
                    key={typ.id}
                    icon={typ.icon}
                    name={typ.name_de}
                    aktiv={ausgewaehlt.includes(typ.id)}
                    onClick={() =>
                      setAusgewaehlt((vorher) =>
                        vorher.includes(typ.id)
                          ? vorher.filter((x) => x !== typ.id)
                          : [...vorher, typ.id],
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="fixed inset-x-0 bottom-0 bg-white p-4">
            <button
              type="button"
              onClick={eingecheckt}
              className="h-12 w-full rounded-xl bg-orange-500 text-base font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Das habe ich gesehen
            </button>
          </div>
        </div>
      )}

      {schritt === "speichert" && (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-zinc-600">
          Wird gespeichert …
        </div>
      )}

      {schritt === "erfolg" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          {neueFreischaltungen.length > 0 ? (
            <>
              <p className="text-sm font-medium text-zinc-500">Neu freigeschaltet!</p>
              <div className="flex flex-col gap-3">
                {neueFreischaltungen.map((typ, i) => (
                  <div
                    key={typ.id}
                    style={{ animationDelay: `${i * 150}ms` }}
                    className="animate-[pop_400ms_ease-out_backwards] flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-left"
                  >
                    <span className="text-3xl" aria-hidden="true">
                      {typ.icon}
                    </span>
                    <span>
                      <span className="block font-semibold text-zinc-900">
                        {typ.kid_name ?? typ.name_de}
                      </span>
                      {typ.kid_description && (
                        <span className="block text-xs text-zinc-600">
                          {typ.kid_description}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-base text-zinc-700">Danke, dass du vorbeigeschaut hast! 👋</p>
          )}
          <button
            type="button"
            onClick={() => setSchritt("foto-angebot")}
            className="h-11 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white"
          >
            Weiter
          </button>
        </div>
      )}

      {schritt === "foto-angebot" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-base text-zinc-700">Magst du noch ein Foto hinzufügen?</p>
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
          {fotoStatus === "fertig" ? (
            <p className="text-sm text-green-700">Danke fürs Foto!</p>
          ) : fotoStatus === "fehler" ? (
            <p className="text-sm text-red-600">
              Das Foto konnte nicht hochgeladen werden.
            </p>
          ) : (
            <button
              type="button"
              disabled={fotoStatus === "laedt"}
              onClick={() => fotoInputRef.current?.click()}
              className="h-11 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white disabled:opacity-60"
            >
              {fotoStatus === "laedt" ? "Wird hochgeladen …" : "Foto auswählen"}
            </button>
          )}
          <button
            type="button"
            onClick={schliessen}
            className="text-sm font-medium text-zinc-500"
          >
            {fotoStatus === "fertig" ? "Fertig" : "Überspringen"}
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({
  icon,
  name,
  aktiv,
  onClick,
}: {
  icon: string | null;
  name: string;
  aktiv: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className={`flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
        aktiv
          ? "border-orange-500 bg-orange-50 text-orange-700"
          : "border-zinc-200 bg-white text-zinc-700"
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      {name}
    </button>
  );
}

function PinKorrektur({
  placeId,
  onBestaetigt,
}: {
  placeId: string;
  onBestaetigt: (position: { lat: number; lon: number }) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [start, setStart] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    supabase
      .rpc("place_location", { p_place_id: placeId })
      .then(({ data }) => setStart(data?.[0] ?? null));
  }, [placeId, supabase]);

  if (!start) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-zinc-600">
        Einen Moment …
      </div>
    );
  }

  return <StandortAuswahl start={start} onBestaetigt={onBestaetigt} />;
}
