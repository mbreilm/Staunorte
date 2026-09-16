"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import { onboardingSchonGelaufen } from "@/lib/onboarding";
import {
  berechtigungsStatus,
  sindKoordinatenBrauchbar,
  standortErlaubnisMerken,
  standortSchonErlaubt,
} from "./standortHelfer";

// Bewusst kühl und damit außerhalb der warmen Erdton-Palette: Der eigene
// Standort darf nie mit einem Ort verwechselt werden, und Blau ist für
// "hier bin ich" auf Karten die weltweit gelernte Farbe.
const EIGENER_STANDORT_FARBE = "#2d6ea3";

// Zoomstufen rund um den eigenen Standort. Die Übersicht ist bewusst
// weiter draußen als der Zentrieren-Button: Beim Öffnen der App will man
// sehen, was in der Umgebung los ist (der Suchradius leitet sich aus dem
// sichtbaren Ausschnitt ab, weiter draußen = mehr Baustellen). Tippt man
// dagegen aktiv auf "Auf meinen Standort zentrieren", will man wissen, wo
// genau man steht - dort darf es näher heran.
const ZOOM_UEBERSICHT = 13;
const ZOOM_STANDORT_BUTTON = 15;

/**
 * Alles rund um den eigenen Standort auf der Karte: Marker, laufende
 * Verfolgung, Berechtigungsfrage und Zentrieren.
 *
 * Herausgelöst aus MapView.tsx. Der Grund ist nicht Kosmetik: In genau
 * diesem Bereich sassen drei Fehler hintereinander - ein Klick-Ereignis,
 * das als Zoomstufe in die Karte geriet und sie lahmlegte; eine
 * Berechtigungsabfrage, die auf dem iPhone sofort warf und die ganze App
 * mitriss; und eine erteilte Freigabe, die Safari nicht meldet. Als
 * eigener Baustein ist das Ganze am Stück lesbar und einzeln prüfbar.
 */
export function useEigenerStandort(
  mapRef: RefObject<MapLibreMap | null>,
  aktiverTab: boolean,
) {
  const [zeigeStandortHinweis, setZeigeStandortHinweis] = useState(false);

  // Eigener Standort: Marker + laufende Verfolgung. `verfolgungGewuenscht`
  // merkt sich, dass die Person den Standort freigegeben hat - die
  // Verfolgung selbst pausiert, solange die Karte nicht der aktive Tab ist
  // (watchPosition im Hintergrund kostet unnötig Akku).
  const standortMarkerRef = useRef<Marker | null>(null);
  const letzterStandortRef = useRef<{ lat: number; lon: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const verfolgungGewuenschtRef = useRef(false);
  // Gewünschte Zoomstufe, sobald die ERSTE Position hereinkommt - danach
  // wieder null. Nötig, weil die erste Ortung je nach Gerät mehrere
  // Sekunden dauert: Wir können nicht auf getCurrentPosition() allein
  // bauen (dessen Timeout lief beim Kaltstart oft ab, bevor macOS eine
  // Position lieferte - die Karte blieb dann auf München stehen).
  const zentrierenZoomRef = useRef<number | null>(null);

  // Setzt bzw. verschiebt den Punkt "hier bin ich". Der Marker wird einmal
  // gebaut und danach nur noch umgesetzt, damit beim Gehen kein neues
  // DOM-Element pro Positionsmeldung entsteht.
  function standortMarkerSetzen(lat: number, lon: number) {
    const map = mapRef.current;
    if (!map) return;
    // Manche Geräte melden unbrauchbare Werte, statt einen Fehler zu
    // liefern. Eine solche Position darf die Karte nie erreichen.
    if (!sindKoordinatenBrauchbar(lat, lon)) {
      console.error("Unbrauchbare Position verworfen:", lat, lon);
      return;
    }
    letzterStandortRef.current = { lat, lon };
    // Eine Position bekommen wir nur mit Erlaubnis - das ist also der
    // verlässlichste Beleg dafür, dass zugestimmt wurde.
    standortErlaubnisMerken();

    if (!standortMarkerRef.current) {
      const punkt = document.createElement("div");
      punkt.setAttribute("aria-hidden", "true");
      punkt.style.width = "18px";
      punkt.style.height = "18px";
      punkt.style.borderRadius = "50%";
      punkt.style.background = EIGENER_STANDORT_FARBE;
      punkt.style.border = "3px solid #ffffff";
      punkt.style.boxShadow = "0 0 0 1px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.3)";
      standortMarkerRef.current = new Marker({ element: punkt })
        .setLngLat([lon, lat])
        .addTo(map);
    } else {
      standortMarkerRef.current.setLngLat([lon, lat]);
    }

    // Erste Position nach einem "zentrieren"-Wunsch: jetzt dorthin.
    //
    // Geflogen wird nur, wenn der Kartenstil schon steht. Ein flyTo() ist
    // eine Animation, und MapLibre sperrt währenddessen die Bedienung der
    // Karte. Startet die Animation, bevor der Stil geladen ist, kann sie
    // hängen bleiben - dann bleibt die Karte dauerhaft gesperrt und
    // reagiert auf keine Berührung mehr. Am Schreibtisch fällt das nie
    // auf, weil der Stil längst da ist; am Handy im Mobilfunknetz ist er
    // es oft noch nicht.
    //
    // Vorher gibt es deshalb jumpTo(): setzt die Kamera sofort und ohne
    // Animation. Nichts wird gesperrt, und sobald der Stil eintrifft,
    // zeichnet MapLibre an der richtigen Stelle.
    const zielZoom = zentrierenZoomRef.current;
    if (zielZoom !== null) {
      zentrierenZoomRef.current = null;
      const ziel = { center: [lon, lat] as [number, number], zoom: zielZoom };
      if (map.loaded()) map.flyTo(ziel);
      else map.jumpTo(ziel);
    }
  }

  function standortVerfolgen() {
    verfolgungGewuenschtRef.current = true;
    if (watchIdRef.current !== null) return; // läuft schon
    if (!("geolocation" in navigator)) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) =>
        standortMarkerSetzen(position.coords.latitude, position.coords.longitude),
      () => {
        // Ablehnung oder Fehler: kein Punkt, keine Meldung - die Karte
        // bleibt ohne eigenen Standort nutzbar (keine Sackgasse).
      },
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
  }

  // Entscheidet beim Öffnen der Karte, ob der erklärende Hinweis nötig ist:
  //  - "granted": Der Standort ist in diesem Browser schon freigegeben. Dann
  //    noch einmal um Erlaubnis zu bitten wäre unnötig - die Karte fliegt
  //    direkt zur eigenen Position.
  //  - "denied": Ein Tap auf "Standort verwenden" würde gar keinen
  //    Browser-Dialog mehr auslösen und liefe ins Leere (Sackgasse). Der
  //    Hinweis bleibt deshalb weg; der Zentrieren-Button bleibt sichtbar.
  //  - "prompt" / Permissions-API nicht verfügbar: wie bisher erst erklären,
  //    dann fragen.
  //  - "prompt", aber das Onboarding läuft gerade zum ersten Mal: Das fragt
  //    selbst nach dem Standort. Hier noch einmal zu fragen wäre die zweite
  //    Frage in Folge. Wir warten stattdessen auf die Freigabe (siehe den
  //    Effekt weiter unten, der auf Änderungen der Berechtigung hört).
  async function standortHinweisOderDirekt() {
    const zustand = (await berechtigungsStatus())?.state ?? null;

    if (zustand === "granted") {
      standortVerwenden();
      return;
    }
    if (zustand === "denied") return;

    // `null` heißt nicht "abgelehnt", sondern "der Browser sagt es uns
    // nicht" - der Normalfall auf dem iPhone. Dann entscheidet unsere
    // eigene Notiz: Wer schon einmal zugestimmt hat, wird nicht erneut
    // gefragt. Ohne das kam der Hinweis dort bei jedem Laden wieder.
    if (zustand === null && standortSchonErlaubt()) {
      standortVerwenden();
      return;
    }

    if (!onboardingSchonGelaufen()) return;
    setZeigeStandortHinweis(true);
  }

  function standortVerwenden(zoom: number = ZOOM_UEBERSICHT) {
    setZeigeStandortHinweis(false);

    // Zweiter Riegel gegen denselben Fehler: Was hier hereinkommt, geht
    // direkt in die Kameraposition der Karte. Ein einziger unsauberer
    // Aufruf reicht, um sie unbrauchbar zu machen.
    const zielZoom = Number.isFinite(zoom) ? zoom : ZOOM_UEBERSICHT;

    if (!("geolocation" in navigator)) return; // alter Browser: stiller Fallback

    // Zentriert wird, sobald die erste Position da ist - egal ob sie aus
    // getCurrentPosition() oder aus der laufenden Verfolgung kommt.
    zentrierenZoomRef.current = zielZoom;
    standortVerfolgen();
    navigator.geolocation.getCurrentPosition(
      (position) =>
        standortMarkerSetzen(position.coords.latitude, position.coords.longitude),
      () => {
        // Ablehnung oder Fehler (Timeout, kein GPS, ...): einfach beim
        // München-Fallback bleiben, keine Fehlermeldung, keine Sackgasse.
        // Ein späterer Treffer der Verfolgung zentriert dann immer noch.
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  // "Auf meinen Standort zentrieren": Ist die Position schon bekannt, geht
  // es sofort dorthin; sonst wird sie jetzt geholt (und dabei gleich die
  // laufende Verfolgung gestartet).
  function aufStandortZentrieren() {
    setZeigeStandortHinweis(false);
    const bekannt = letzterStandortRef.current;
    if (bekannt) {
      const karte = mapRef.current;
      const ziel = {
        center: [bekannt.lon, bekannt.lat] as [number, number],
        zoom: ZOOM_STANDORT_BUTTON,
      };
      // Gleiche Vorsicht wie oben: animiert nur bei geladenem Stil.
      if (karte?.loaded()) karte.flyTo(ziel);
      else karte?.jumpTo(ziel);
      standortVerfolgen();
      return;
    }
    standortVerwenden(ZOOM_STANDORT_BUTTON);
  }

  // Standortverfolgung pausiert, solange die Karte nicht der aktive Tab ist:
  // Die Karte bleibt dauerhaft gemountet (siehe oben), watchPosition würde
  // sonst auch im Album und im Konto weiterlaufen und Akku ziehen.
  useEffect(() => {
    if (!verfolgungGewuenschtRef.current) return;

    if (aktiverTab && watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) =>
          standortMarkerSetzen(position.coords.latitude, position.coords.longitude),
        () => {},
        { enableHighAccuracy: true, maximumAge: 10_000 },
      );
    }
    if (!aktiverTab && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- standortMarkerSetzen arbeitet nur auf Refs und Settern; als Abhaengigkeit wuerde die Verfolgung bei jedem Rendern neu starten
  }, [aktiverTab]);

  // Wird der Standort ANDERSWO freigegeben - im Onboarding beim ersten
  // Start oder in den Browser-Einstellungen -, bekommt die Karte das sonst
  // nicht mit: Sie hat ihre Entscheidung beim Aufbau getroffen und bliebe
  // über München stehen. Die Permissions-API meldet solche Wechsel, und wir
  // holen die Zentrierung dann nach.
  useEffect(() => {
    let status: PermissionStatus | null = null;
    let verworfen = false;

    berechtigungsStatus().then((s) => {
      if (verworfen || !s) return;
      status = s;
      s.onchange = () => {
        if (s.state !== "granted") return;
        setZeigeStandortHinweis(false);
        standortVerwenden();
      };
    });

    return () => {
      verworfen = true;
      if (status) status.onchange = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- soll nur einmal eingehängt werden; standortVerwenden arbeitet ausschließlich auf Refs und Settern
  }, []);

  /** Beim Abbau der Karte: Verfolgung stoppen, Marker vergessen. */
  function aufraeumen() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    standortMarkerRef.current = null;
  }

  /** Eigene Geste auf der Karte: nicht mehr automatisch zentrieren. */
  function zentrierenAbbrechen() {
    zentrierenZoomRef.current = null;
  }

  return {
    zeigeStandortHinweis,
    hinweisSchliessen: () => setZeigeStandortHinweis(false),
    standortHinweisOderDirekt,
    standortVerwenden,
    aufStandortZentrieren,
    aufraeumen,
    zentrierenAbbrechen,
  };
}
