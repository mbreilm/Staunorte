# Tickets — die ersten Wochen

**So benutzt du diese Datei:** Immer genau ein Ticket zur Zeit. Den Text unter
„Prompt" komplett kopieren und in Claude Code einfügen. Wenn das Ergebnis
stimmt, Haken setzen und zum nächsten. Nie zwei Tickets gleichzeitig starten —
das ist der häufigste Grund, warum KI-gebaute Projekte unübersichtlich werden.

**Wenn etwas nicht klappt:** Fehlermeldung komplett kopieren und in Claude Code
einfügen mit dem Satz *„Das kam dabei raus. Was bedeutet das und wie beheben
wir es?"* Nicht selbst herumprobieren.

---

## Woche 1 — Fundament

### ☐ T1 · Projekt aufsetzen
> Lege ein neues Next.js-Projekt im aktuellen Ordner an: TypeScript, App Router,
> Tailwind CSS, ESLint, `src/`-Verzeichnis **nein**, Import-Alias `@/*`.
> Installiere zusätzlich: `@supabase/supabase-js`, `@supabase/ssr`,
> `maplibre-gl`, `exifr`, `date-fns`, `date-fns-tz`.
> Richte die PWA-Grundlagen ein: `app/manifest.ts` mit deutschem Namen
> „Baustellenjäger", Theme-Farbe `#F2A20C`, Anzeigemodus `standalone`, und
> Platzhalter-Icons in 192 und 512 Pixeln.
> Erstelle `.gitignore` (Next.js-Standard plus `.env.local`) und initialisiere
> ein Git-Repository mit einem ersten Commit.
> Erkläre mir am Ende in drei Sätzen, was jetzt im Ordner liegt.

**Fertig, wenn:** `npm run dev` läuft und `http://localhost:3000` die
Next.js-Startseite zeigt.

---

### ☐ T2 · Supabase verbinden
> Lies `.env.example` und erstelle daraus `lib/supabase/client.ts` (für
> Browser-Komponenten) und `lib/supabase/server.ts` (für Server-Komponenten),
> beide mit `@supabase/ssr` und typsicher.
> Erzeuge außerdem `lib/supabase/types.ts` mit den TypeScript-Typen für alle
> Tabellen aus `supabase/migrations/` — die Datei ist die einzige Quelle der
> Wahrheit für Datentypen im Projekt.
> Baue zum Testen eine Seite `app/test/page.tsx`, die die Fahrzeugtypen aus
> `observable_types` lädt und als einfache Liste anzeigt.

**Fertig, wenn:** `/test` alle 29 Fahrzeuge mit Namen und Emoji anzeigt.
Danach kann die Testseite wieder gelöscht werden.

---

### ☐ T3 · Anmeldung
> Baue die Anmeldung mit Supabase Auth:
> `app/konto/page.tsx` mit Magic-Link per E-Mail (ein Feld, ein Button) und
> zusätzlich „Mit Google anmelden".
> Ergänze `app/auth/callback/route.ts` für den Rücksprung nach dem Klick auf den
> Magic Link.
> Baue einen `AuthProvider` in `components/`, über den jede Komponente den
> angemeldeten Nutzer abfragen kann.
> Wichtig: Die App muss ohne Anmeldung vollständig lesbar bleiben. Die
> Anmeldung wird erst verlangt, wenn jemand beitragen will — dann als
> freundliches Bottom-Sheet mit der Begründung, warum ein Konto nötig ist.
> Alle Texte auf Deutsch, du-Ansprache.

**Fertig, wenn:** Du dich per E-Mail-Link anmelden kannst und in der Tabelle
`profiles` automatisch eine Zeile für dich entstanden ist.

---

## Woche 2 — Sehen

### ☐ T4 · Die Karte
> Baue die Startseite `app/(map)/page.tsx` als Vollbild-Karte mit MapLibre:
> – Kartenstil aus `NEXT_PUBLIC_MAP_STYLE_URL`
> – Start auf dem Gerätestandort; bei Ablehnung oder Fehler auf München
>   (`NEXT_PUBLIC_DEFAULT_LAT`/`_LON`), ohne Fehlermeldung, ohne Sackgasse
> – Standortabfrage erst nach einem erklärenden Hinweis, nicht sofort beim Laden
> – Baustellen über die Datenbankfunktion `places_nearby` laden, bei jedem
>   Kartenausschnitt-Wechsel neu, entprellt (300 ms)
> – Marker: farbig wenn `fresh_observables > 0`, sonst grau; Orte mit
>   `source = 'open_data'` und `is_confirmed = false` als gestrichelter Umriss
> – Kleiner grüner Punkt am Marker, wenn `activity = 'aktiv'`
> – Ab Zoomstufe 12 Cluster
> Kommentiere den Code auf Deutsch, damit ich ihn verstehe.

**Fertig, wenn:** Du zwei manuell in Supabase eingetragene Testbaustellen auf
der Karte siehst.

---

### ☐ T5 · Vorschau beim Antippen
> Beim Antippen eines Markers öffnet sich ein Bottom-Sheet mit: Foto (oder
> Platzhalter), Titel, Entfernung in Metern bzw. Kilometern, Aktivitäts-Badge,
> Anzahl aktueller Fahrzeuge, Check-in-Zahl.
> Zwei Buttons: „Details" und „Route öffnen" (Deep-Link, der auf iOS Apple Maps
> und sonst Google Maps öffnet).
> Das Sheet muss per Wischen nach unten schließbar sein.

---

### ☐ T6 · Detailseite
> Baue `app/ort/[id]/page.tsx`:
> – Fotogalerie oben, neueste zuerst, Aufnahmedatum eingeblendet; Fotos älter
>   als 90 Tage mit dem Hinweis „älteres Foto"
> – Titel, Adresse, Notiz
> – Aktivitäts-Badge: „Jetzt vermutlich aktiv" / „Jetzt vermutlich Ruhe" /
>   „Zeiten unbekannt", basierend auf `place_is_active_now`. **Immer im
>   Konjunktiv formulieren, nie als Zusage.**
> – Fahrzeugliste aus der View `v_place_observables`, gruppiert nach `bucket`:
>   „Jetzt hier" (grün), „Zuletzt gesehen vor X Tagen" (grau), und eingeklappt
>   „Früher hier gesehen (n)".
>   Zeitbezüge in natürlicher Sprache über `date-fns` mit deutschem Locale.
>   **Der Confidence-Wert darf nirgends als Zahl oder Prozent auftauchen.**
> – Check-in-Zähler gesamt und „diese Woche"
> – Der Sicherheitshinweis aus `place_categories.safety_notice`, nicht
>   wegklickbar, gut sichtbar
> – Großer Button „Ich bin hier 👋" (noch ohne Funktion)
> – Melde-Link ganz unten, unauffällig

---

## Woche 3–4 — Beitragen

### ☐ T7 · Ort erfassen
> Baue `app/neu/page.tsx` als Flow über mehrere Schritte, Ziel unter 60 Sekunden:
> 1. Foto: Kamera oder Galerie (`<input type="file" accept="image/*" capture>`)
> 2. Standort in dieser Reihenfolge versuchen: GPS aus dem Foto-EXIF (mit
>    `exifr`), sonst Gerätestandort, sonst manuelle Kartenauswahl.
>    **Der Pin muss immer bestätigt bzw. verschoben werden können** — nie
>    ungefragt übernehmen.
> 3. Duplikatprüfung über `places_nearby` im Umkreis von 100 m: gefundene Orte
>    anzeigen mit „Meinst du diese? → Stattdessen einchecken"
> 4. Titel, vorbelegt aus Reverse-Geocoding (Nominatim, mit korrektem
>    User-Agent-Header und maximal 1 Anfrage pro Sekunde)
> 5. Fahrzeuge als Chips auswählen, gruppiert nach `group_name`, mindestens eines
> 6. Eingeklappter Bereich „Mehr Details (optional)": Arbeitszeiten, Bauphase,
>    Notiz
> 7. Speichern über `create_place`, danach automatisch der Check-in-Flow
> Der Entwurf muss einen Neustart der App überleben (localStorage).
> **Wichtig:** EXIF-Koordinaten client-seitig auslesen und das Bild danach ohne
> EXIF hochladen — die Originaldatei darf nicht in den Storage.

---

### ☐ T8 · Foto-Upload
> Richte einen Supabase-Storage-Bucket `place-photos` ein (Migration
> `0005_storage.sql`): öffentlich lesbar, Schreiben nur für angemeldete Nutzer.
> Baue eine Upload-Funktion, die vor dem Hochladen im Browser:
> – das Bild auf maximal 1600 px längste Kante verkleinert
> – als WebP mit Qualität 0.8 neu kodiert (dabei verschwindet EXIF automatisch)
> – die vorher ausgelesenen Koordinaten separat in `place_photos` schreibt
> Zeige während des Uploads einen Fortschritt und fange Fehler ab, ohne den
> ganzen Flow zu verlieren.

---

### ☐ T9 · Check-in — das Herzstück
> Baue den Check-in-Flow, ausgelöst durch „Ich bin hier 👋" auf der Detailseite:
> 1. Standort holen, Distanz und Genauigkeit prüfen (die Datenbank prüft
>    ebenfalls — die Prüfung im Frontend dient nur der schnellen Rückmeldung)
> 2. **Ein einziger Screen:** „Was siehst du gerade?" mit Chips.
>    Bereits gemeldete Fahrzeuge stehen oben, sortiert nach Confidence, und sind
>    **nicht vorausgewählt**. Darunter „Weitere hinzufügen" mit Suchfeld.
> 3. Button „Das habe ich gesehen" ruft `do_checkin` auf.
> 4. Erfolg: neu freigeschaltete Fahrzeuge einzeln als Karte einblenden, mit
>    Illustration, kindgerechtem Namen und kurzer Animation.
> 5. Danach unaufdringlich „Foto hinzufügen?" anbieten — überspringbar, niemals
>    blockierend.
> Fehlerfälle mit klarem deutschen Text und einem nächsten Schritt behandeln:
> `ZU_WEIT_ENTFERNT` (mit Angabe der Entfernung und Angebot, den Pin zu
> korrigieren), `GPS_UNGENAU`, `NICHT_ANGEMELDET`.
> Zeitbudget des gesamten Flows: 15 Sekunden.

**Fertig, wenn:** Ein Check-in an einer Testbaustelle funktioniert, der Zähler
steigt, und ein nicht angetipptes Fahrzeug in der Datenbank `negative_count = 1`
bekommt.

---

### ☐ T10 · Arbeitszeiten
> Baue die Bearbeitung der Arbeitszeiten, erreichbar aus dem Erfassungs-Flow und
> von der Detailseite aus:
> Vier Presets als große Auswahlkacheln — „Übliche Bauzeiten" (Mo–Fr 7–16,
> vorausgewählt), „Auch samstags" (zusätzlich Sa 8–13), „Rund um die Uhr",
> „Eigene Zeiten" — plus „Weiß ich nicht" als Abbruch ohne Eintrag.
> Bei „Eigene Zeiten": Wochentage als Umschalter, dazu ein Von/Bis-Feld.
> Gespeichert wird in `place_hours`; beim Ändern werden die alten Zeilen des
> Ortes ersetzt.
> Auf der Detailseite anzeigen: die angegebenen Zeiten und, sobald der Ort
> mindestens 8 wertende Check-ins hat, zusätzlich das beobachtete Muster aus
> `place_activity` im Stil „Meist was los: werktags vormittags · aus 34
> Besuchen". **Bei Widerspruch gewinnt die Beobachtung**, die Angabe wird
> nachgeordnet als „laut Angabe: …" dargestellt.

---

### ☐ T11 · Sammelalbum
> Baue `app/album/page.tsx`: Raster aller Fahrzeugtypen, gruppiert nach
> `group_name`. Nicht freigeschaltete als graue Silhouette mit Fragezeichen,
> freigeschaltete farbig.
> Fortschrittsanzeige oben: „17 von 29 Fahrzeugen".
> Antippen öffnet eine Detailkarte: Emoji groß, kindgerechter Name, `name_de`,
> `kid_description`, Seltenheitsstufe und „Zuerst gesehen am … an …".
> Ohne Anmeldung zeigt die Seite alle Fahrzeuge als Silhouetten mit dem Hinweis,
> dass ein Konto zum Sammeln nötig ist.

---

### ☐ T12 · Melden und Moderation
> Melde-Funktion für Orte und Fotos mit den Gründen aus dem Datenmodell.
> Datenbank-Trigger (Migration `0006_moderation.sql`): Ab zwei unabhängigen
> Meldungen wird der Ort bzw. das Foto automatisch ausgeblendet.
> Dazu eine schlichte Admin-Seite `app/admin/page.tsx`, nur erreichbar für
> Nutzer mit `profiles.is_admin = true`: Liste offener Meldungen, Ort/Foto
> ansehen, ausblenden, löschen, Meldung als erledigt markieren, Nutzer sperren.
> Optik ist egal, Funktion zählt.

---

### ☐ T13 · Sicherheits-Onboarding
> Beim ersten Start ein dreiteiliges Onboarding:
> 1. Was die App macht (ein Satz, ein Bild)
> 2. Sicherheit: Baustellen nicht betreten, nur von außerhalb der Absperrung
>    zuschauen, Kinder an der Hand — **muss aktiv bestätigt werden**
> 3. Standortfreigabe erklären, dann anfragen
> In localStorage merken, dass es gezeigt wurde. Nach dem zweiten Besuch
> zusätzlich einen dezenten Hinweis „Zum Home-Bildschirm hinzufügen" einblenden.

---

## Danach

### ☐ T14 · Open-Data-Import München
> Recherchiere zuerst, welche Quelle Münchner Baustellendaten mit Koordinaten
> liefert, und nenne mir Lizenz und Aktualisierungsfrequenz, **bevor** du etwas
> baust.
> Dann ein Skript `scripts/import-opendata.ts`, das die Daten holt, auf unser
> Schema abbildet und mit `source = 'open_data'`, `is_confirmed = false` und
> gesetztem `external_id` importiert. Bereits vorhandene Einträge werden
> aktualisiert, nicht doppelt angelegt.
> Nutzer-Check-ins dürfen dabei niemals überschrieben werden.

### ☐ T15 · Rechtstexte und Analytics
> Seiten für Impressum, Datenschutzerklärung und Nutzungsbedingungen als
> Platzhalter mit der korrekten Struktur anlegen (Inhalte kommen später vom
> Anwalt). Plausible oder PostHog einbinden, mit Consent-Banner.
> Ereignisse tracken, die für die PRD-Metriken nötig sind: Erfassung
> gestartet/abgeschlossen, Check-in abgeschlossen, Album geöffnet.

### ☐ T16 · Deployment
> Projekt auf Vercel deployen, Umgebungsvariablen setzen, Domain verbinden,
> die Weiterleitungs-URLs in Supabase Auth eintragen und einen kurzen
> Funktionstest auf einem echten Handy durchführen.
