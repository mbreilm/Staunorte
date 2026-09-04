# CLAUDE.md — Projektkontext

> Diese Datei liest Claude Code bei jedem Start automatisch. Sie ist die
> wichtigste Datei im Projekt: Sie sorgt dafür, dass die KI die Regeln des
> Projekts kennt, ohne dass sie in jedem Prompt wiederholt werden müssen.
> **Nicht löschen, bei Architekturänderungen aktualisieren.**

## Was ist das hier?

Eine PWA, mit der Eltern mit kleinen Kindern (2–7 J.) die interessantesten
Baustellen in der Nähe finden, um dort Baufahrzeuge anzuschauen. Nutzer tragen
Baustellen ein, checken vor Ort ein und melden, welche Fahrzeuge sie sehen.
Gesehene Fahrzeugtypen werden in einem Sammelalbum freigeschaltet.

Pilotmarkt: München. Sprache der App: Deutsch. Nutzer: Eltern, nicht Kinder.

Das vollständige PRD liegt in `docs/PRD.md`. **Bei Unklarheiten über Verhalten
oder Scope zuerst dort nachsehen, nicht raten.**

## Stack

- **Next.js (App Router) + TypeScript** als PWA
- **Supabase**: Postgres + PostGIS, Auth, Storage, Row Level Security
- **MapLibre GL JS** für die Karte (keine Google Maps)
- **Tailwind CSS**
- Hosting: Vercel

## Nicht verhandelbare Regeln

Diese sechs Punkte sind Architekturentscheidungen, keine Vorlieben. Wenn eine
Aufgabe sie zu verletzen scheint, **nachfragen statt umbauen**.

1. **Generische Benennung.** Tabellen und Typen heißen `places`,
   `observable_types`, `place_observables` — niemals `sites` oder
   `vehicle_types`. Grund: Die App wird später um weitere Ortskategorien
   (Spielplätze o. ä.) erweitert. Das Datenmodell ist bereits dafür gebaut.

2. **Keine kategoriespezifischen Texte im Code.** „Baustelle", „Fahrzeuge",
   „Arbeitszeiten", der Sicherheitshinweis — all das kommt aus der Tabelle
   `place_categories`. Im Frontend nie hartkodieren.

3. **`confidence` wird berechnet, nie gespeichert.** Die Frische eines
   Fahrzeugs ist eine Funktion von `now() - last_seen_at`. Es gibt keinen
   Cron-Job, der Werte altern lässt, und es darf keiner eingeführt werden.
   Zuständig ist `observable_confidence()` in der Datenbank.

4. **Check-in-Daten sind privat.** Nutzernamen, Avatare oder Zeitstempel
   einzelner Check-ins tauchen nirgends im UI und in keiner API-Antwort auf.
   Öffentlich ist ausschließlich der aggregierte Zähler `places.checkin_count`.

5. **Geschäftslogik liegt in der Datenbank.** Check-in, Ortserfassung und
   Umkreissuche laufen über die Postgres-Funktionen `do_checkin()`,
   `create_place()` und `places_nearby()`. Diese Logik nicht ins Frontend
   duplizieren — sie ist sicherheitsrelevant (Geofence, Rate Limits).

6. **EXIF-Daten werden nach dem Auslesen entfernt.** Koordinaten client-seitig
   auslesen, dann das Bild ohne EXIF hochladen. Niemals Originaldateien mit
   EXIF in den Storage schreiben.

## Die Kern-Mechanik in drei Sätzen

Jedes Fahrzeug an einer Baustelle hat eine Konfidenz zwischen 0 und 1, die seit
der letzten Sichtung exponentiell zerfällt — mit fahrzeugabhängiger
Halbwertszeit (Turmdrehkran 30 Tage, Fahrmischer 1,5 Tage). Beim Check-in wählt
der Nutzer aus Chips aus, was er sieht; jedes bereits gemeldete Fahrzeug, das er
**nicht** antippt, bekommt ein stilles Negativsignal und zerfällt doppelt so
schnell. Dadurch bleiben die Daten aktuell, ohne dass jemals eine Frage gestellt
werden muss.

## Ordnerstruktur

```
app/                    Next.js App Router
  (map)/                Karte (Startseite)
  ort/[id]/             Detailseite
  neu/                  Ort erfassen
  album/                Sammelalbum
  konto/                Anmeldung, Profil
components/             Wiederverwendbare UI-Komponenten
lib/
  supabase/             Client- und Server-Clients
  geo/                  Geolocation, Distanzen, EXIF
  format/               Zeitbezüge ("vor 3 Tagen"), Aktivitätstexte
supabase/migrations/    SQL-Migrationen, aufsteigend nummeriert
supabase/tests/         SQL-Tests der Kern-Mechanik
docs/PRD.md             Product Requirements Document
```

## Arbeitsweise

- **Eine Aufgabe pro Sitzung.** Die Tickets in `docs/TICKETS.md` sind bewusst so
  geschnitten, dass eine davon in einem Rutsch erledigt werden kann.
- **Datenbankänderungen immer als neue Migrationsdatei** (`0005_...sql`,
  `0006_...sql`), niemals bestehende Migrationen ändern.
- **Nach jeder Änderung prüfen, ob die App noch startet** (`npm run dev`) und
  bei Datenbankänderungen die Tests in `supabase/tests/` erneut ausführen.
- **Deutsche UI-Texte**, englische Variablen- und Funktionsnamen.
- Der Auftraggeber programmiert nicht selbst. Fehler also nicht nur melden,
  sondern erklären, was sie bedeuten, und einen Vorschlag machen.

## Design-Leitplanken

Die App wird einhändig, im Stehen, bei Sonnenlicht und mit einem quengelnden
Kind an der Hand bedient.

- Check-in: höchstens 15 Sekunden, ein einziger Screen
- Ort erfassen: höchstens 60 Sekunden, optionale Felder eingeklappt
- Große Tap-Ziele (min. 48 px), hoher Kontrast, keine Hover-Interaktionen
- Nie eine Sackgasse: Jeder Fehlerfall bietet einen nächsten Schritt an
- Aktivitätsangaben immer im Konjunktiv („vermutlich aktiv"), nie als Zusage

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
