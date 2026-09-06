"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { ObservableType, PlaceObservableView } from "@/lib/supabase/types";
import { formatDistance } from "@/lib/geo/distance";
import {
  ladeFotosHoch,
  type MehrfachUploadFortschritt,
} from "@/lib/erfassen/fotoUpload";
import { StandortAuswahl } from "@/components/erfassen/StandortAuswahl";
import { GruppenIcon } from "@/components/icons/GruppenIcon";
import { trackEvent } from "@/lib/analytics/plausible";

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
  const [albumFortschritt, setAlbumFortschritt] = useState<number | null>(null);
  const [fotoStatus, setFotoStatus] = useState<
    "keins" | "laedt" | "fertig" | "teilweise" | "fehler"
  >("keins");
  const [fotoFortschritt, setFotoFortschritt] = useState<MehrfachUploadFortschritt | null>(
    null,
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

  async function eingecheckt(beobachtungsIds: string[] = ausgewaehlt) {
    const position = positionRef.current;
    if (!position) return;
    setSchritt("speichert");

    const { data, error } = await supabase.rpc("do_checkin", {
      p_place_id: placeId,
      p_lat: position.lat,
      p_lon: position.lon,
      p_accuracy_m: position.accuracy ?? undefined,
      p_observable_ids: beobachtungsIds,
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
    trackEvent("Check-in abgeschlossen");
    const freigeschaltet = weitereTypen.filter((typ) =>
      (data?.new_unlocks ?? []).includes(typ.id),
    );
    setNeueFreischaltungen(freigeschaltet);

    // Album-Fortschritt nur für die Feier-Anzeige - eine einzelne
    // count-Abfrage, kein Duplikat der eigentlichen Freischalt-Logik.
    if (freigeschaltet.length > 0 && user) {
      const { count } = await supabase
        .from("user_observable_unlocks")
        .select("observable_type_id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setAlbumFortschritt(count ?? null);
    }

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

  async function aufFotosAusgewaehlt(dateien: File[]) {
    if (!user) return;
    setFotoStatus("laedt");
    const { erfolgreich, fehlgeschlagen } = await ladeFotosHoch({
      dateien,
      placeId,
      hochgeladenVon: user.id,
      aufFortschritt: setFotoFortschritt,
    });
    setFotoStatus(
      fehlgeschlagen === 0 ? "fertig" : erfolgreich > 0 ? "teilweise" : "fehler",
    );
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

  const zeigtFeier = schritt === "erfolg" && neueFreischaltungen.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)]">
      {!zeigtFeier && (
        <div className="flex justify-end p-4">
          <button
            type="button"
            onClick={schliessen}
            aria-label="Schließen"
            className="btn btn-icon text-xl"
          >
            ×
          </button>
        </div>
      )}

      {schritt === "lade-standort" && (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted">
          Wir suchen deinen Standort …
        </div>
      )}

      {schritt === "fehler" && zuWeitEntfernt === null && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-base">{fehlerText}</p>
          <button type="button" onClick={standortHolen} className="btn btn-primary">
            Nochmal versuchen
          </button>
        </div>
      )}

      {schritt === "fehler" && zuWeitEntfernt !== null && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-base">
            Du bist gerade {formatDistance(zuWeitEntfernt)} von diesem Ort entfernt.
          </p>
          <button type="button" onClick={() => eingecheckt()} className="btn btn-primary">
            Nochmal versuchen
          </button>
          {erstelltVon && user?.id === erstelltVon && (
            <button
              type="button"
              onClick={() => setSchritt("pin-korrigieren")}
              className="btn btn-ghost text-sm"
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
        <div className="flex-1 overflow-y-auto px-6 pb-32">
          <h1 className="text-2xl">Was siehst du gerade?</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Tippe alles an, was du sehen kannst. Was du nicht antippst, verschwindet
            mit der Zeit von selbst.
          </p>

          {gemeldetSortiert.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {gemeldetSortiert.map((typ) => (
                <Chip
                  key={typ.observable_type_id}
                  groupName={typ.group_name}
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

          <div className="field mt-5">
            <input
              type="text"
              value={suchbegriff}
              onChange={(e) => setSuchbegriff(e.target.value)}
              placeholder="Weitere hinzufügen …"
              className="input"
            />
            {gefundeneWeitere.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {gefundeneWeitere.map((typ) => (
                  <Chip
                    key={typ.id}
                    groupName={typ.group_name}
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

          <div className="fixed inset-x-0 bottom-0 bg-[var(--color-bg)] p-4">
            <button
              type="button"
              onClick={() => eingecheckt()}
              className="btn btn-primary btn-block h-14 text-base"
            >
              Das habe ich gesehen
            </button>
            <button
              type="button"
              onClick={() => eingecheckt([])}
              className="btn btn-ghost btn-block h-10 text-[13px]"
              style={{ color: "var(--color-neutral-600)" }}
            >
              Nur „Ich war da“
            </button>
          </div>
        </div>
      )}

      {schritt === "speichert" && (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted">
          Wird gespeichert …
        </div>
      )}

      {schritt === "erfolg" && !zeigtFeier && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-base">Danke, dass du vorbeigeschaut hast! 👋</p>
          <button
            type="button"
            onClick={() => setSchritt("foto-angebot")}
            className="btn btn-primary"
          >
            Weiter
          </button>
        </div>
      )}

      {zeigtFeier && (
        <div
          className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center"
          style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
        >
          <span
            className="text-xs font-bold uppercase"
            style={{ color: "var(--color-accent-200)", letterSpacing: "0.09em" }}
          >
            Neu im Album
          </span>

          <div className="mt-5 flex flex-wrap justify-center gap-3.5">
            {neueFreischaltungen.map((typ, i) => (
              <span
                key={typ.id}
                style={{
                  background: "var(--color-bg)",
                  // Der Kreis steht auf der Akzentfläche - das Icon erbt
                  // sonst deren helle Schriftfarbe und verschwindet.
                  color: "var(--color-accent-800)",
                  animationDelay: `${i * 150}ms`,
                }}
                className="elev-lg flex h-28 w-28 flex-none animate-[stPop_500ms_cubic-bezier(.3,1.4,.5,1)_backwards] items-center justify-center rounded-full"
              >
                <GruppenIcon groupName={typ.group_name} size={56} />
              </span>
            ))}
          </div>

          <h2 className="mt-5 text-3xl" style={{ color: "var(--color-bg)" }}>
            {neueFreischaltungen.length === 1
              ? neueFreischaltungen[0].kid_name ?? neueFreischaltungen[0].name_de
              : `${neueFreischaltungen.length} neue Fahrzeuge entdeckt!`}
          </h2>
          {neueFreischaltungen.length === 1 && neueFreischaltungen[0].kid_description && (
            <p
              className="mt-2 max-w-xs text-sm leading-relaxed"
              style={{ color: "var(--color-accent-100)" }}
            >
              {neueFreischaltungen[0].kid_description}
            </p>
          )}

          {albumFortschritt !== null && weitereTypen.length > 0 && (
            <>
              <p className="mt-5 text-sm font-bold" style={{ color: "var(--color-accent-200)" }}>
                {albumFortschritt} von {weitereTypen.length} Fahrzeugen
              </p>
              <div
                className="mt-2 h-2.5 w-full max-w-xs overflow-hidden rounded-full"
                style={{ background: "var(--color-accent-700)" }}
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (albumFortschritt / weitereTypen.length) * 100)}%`,
                    background: "var(--color-bg)",
                  }}
                />
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => router.push("/album")}
            className="btn btn-block mx-auto mt-7 h-14 max-w-xs text-base"
            style={{ background: "var(--color-bg)", color: "var(--color-accent-800)" }}
          >
            Im Album ansehen
          </button>
          <button
            type="button"
            onClick={() => setSchritt("foto-angebot")}
            className="btn btn-ghost mx-auto mt-1 max-w-xs text-sm"
            style={{ color: "var(--color-accent-100)" }}
          >
            Noch ein Foto hinzufügen?
          </button>
        </div>
      )}

      {schritt === "foto-angebot" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-base">Magst du noch Fotos hinzufügen?</p>
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const dateien = Array.from(e.target.files ?? []);
              if (dateien.length > 0) aufFotosAusgewaehlt(dateien);
            }}
          />
          {fotoStatus === "fertig" ? (
            <p className="text-sm" style={{ color: "var(--color-accent-2-700)" }}>
              Danke fürs Foto!
            </p>
          ) : fotoStatus === "teilweise" ? (
            <p className="text-sm" style={{ color: "var(--color-accent-700)" }}>
              Nicht alle Fotos konnten hochgeladen werden.
            </p>
          ) : fotoStatus === "fehler" ? (
            <p className="text-sm" style={{ color: "var(--color-accent-700)" }}>
              Das Foto konnte nicht hochgeladen werden.
            </p>
          ) : (
            <button
              type="button"
              disabled={fotoStatus === "laedt"}
              onClick={() => fotoInputRef.current?.click()}
              className="btn btn-primary"
            >
              {fotoStatus === "laedt"
                ? fotoFortschritt && fotoFortschritt.gesamt > 1
                  ? `Foto ${fotoFortschritt.index + 1} von ${fotoFortschritt.gesamt} …`
                  : "Wird hochgeladen …"
                : "Fotos auswählen"}
            </button>
          )}
          <button type="button" onClick={schliessen} className="btn btn-ghost text-sm">
            {fotoStatus === "fertig" || fotoStatus === "teilweise" ? "Fertig" : "Überspringen"}
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({
  groupName,
  name,
  aktiv,
  onClick,
}: {
  groupName: string | null;
  name: string;
  aktiv: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className="btn min-h-12 gap-2.5 pl-1.5 pr-4"
      style={
        aktiv
          ? { background: "var(--color-accent-100)", color: "var(--color-accent-800)", border: "2px solid var(--color-accent-300)" }
          : { border: "2px solid var(--color-divider)" }
      }
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ background: aktiv ? "var(--color-accent-200)" : "var(--color-neutral-200)" }}
      >
        <GruppenIcon groupName={groupName} size={22} />
      </span>
      <b className="text-[14.5px]">{name}</b>
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
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
        Einen Moment …
      </div>
    );
  }

  return <StandortAuswahl start={start} onBestaetigt={onBestaetigt} />;
}
