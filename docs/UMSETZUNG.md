# Umsetzung — dein Weg von hier zur fertigen App

*Geschrieben für jemanden, der nicht programmiert und es auch nicht lernen will.
Alles, was du tippen musst, steht wörtlich hier drin.*

---

## Zuerst: Was dich erwartet, ehrlich

Du kannst diese App bauen, ohne programmieren zu können. Das ist heute realistisch
und keine Werbeaussage. Aber drei Dinge solltest du vorher wissen, damit du nicht
in Woche drei frustriert aufgibst:

**Du wirst ein Minimum lernen müssen — und zwar genau das:** Wie man ein
Terminal-Fenster öffnet und einen Befehl hineinkopiert. Wie man Dateien in einem
Ordner findet. Wie man eine Fehlermeldung kopiert und an die KI weitergibt. Das
war's. Zusammen etwa zwei Stunden Eingewöhnung. Programmieren im eigentlichen
Sinn — Code lesen, schreiben, verstehen — brauchst du nicht.

**Deine Rolle wird die des Auftraggebers sein, nicht die des Zuschauers.** Die KI
schreibt den Code, aber sie trifft ständig kleine Entscheidungen, die du bewerten
musst: Ist der Button an der richtigen Stelle? Fühlt sich der Check-in schnell
genug an? Ist die Fehlermeldung verständlich? Diese Bewertung kann dir niemand
abnehmen, und sie ist der Teil, der über die Qualität entscheidet. Plane dafür
mehr Zeit ein als für alles andere.

**Es wird Momente geben, in denen etwas kaputt ist und du nicht weißt, warum.**
Das ist normal und passiert erfahrenen Entwicklern genauso. Der Unterschied ist:
Du kannst die Fehlermeldung einfach der KI geben. In neun von zehn Fällen reicht
das. Für den zehnten Fall gibt es unten einen Abschnitt.

**Realistischer Zeitrahmen:** 3–4 Monate bei etwa 8–10 Stunden pro Woche. Wenn du
Vollzeit dran sitzt, 6–8 Wochen. Die ersten zwei Wochen fühlen sich langsam an,
weil du das Werkzeug lernst — danach wird es deutlich schneller.

---

## Teil 1 — Was du brauchst

### Dein Rechner
Der Mac, an dem du gerade sitzt, reicht völlig. Kein neuer Computer nötig.

### Software (einmalig installieren, ca. 30 Minuten)

| Was | Wofür | Kosten |
|---|---|---|
| **Node.js** | Grundlage, auf der die App läuft | kostenlos |
| **Git** | Versionsverwaltung — deine Rückgängig-Funktion | kostenlos, auf dem Mac oft schon da |
| **Claude Code** | die KI, die den Code schreibt | Abo (siehe unten) |
| **Visual Studio Code** | zum Ansehen von Dateien | kostenlos, optional |

### Konten (kostenlos anlegen)

| Dienst | Wofür | Wo |
|---|---|---|
| **Anthropic** | Claude Code | claude.com |
| **Supabase** | Datenbank, Anmeldung, Foto-Speicher | supabase.com |
| **Vercel** | damit die App im Internet erreichbar ist | vercel.com |
| **GitHub** | Sicherungskopie deines Codes | github.com |
| **MapTiler** *oder* OpenFreeMap | die Kartenoptik | maptiler.com / kostenlos ohne Konto |

---

## Teil 2 — Setup, Schritt für Schritt

> **Das Terminal öffnen:** `Cmd + Leertaste` drücken, „Terminal" tippen, Enter.
> Es erscheint ein Fenster mit Text. Befehle hineinkopieren, Enter drücken,
> warten bis wieder eine Eingabezeile erscheint. Mehr passiert da nicht.

### Schritt 1 — Node.js installieren

Öffne **nodejs.org**, lade die Version mit der Bezeichnung „LTS" herunter und
installiere sie wie jedes andere Mac-Programm per Doppelklick.

Danach im Terminal prüfen:
```bash
node --version
```
Erscheint eine Zahl wie `v22.11.0`, hat es geklappt. Erscheint
„command not found", starte das Terminal einmal neu.

### Schritt 2 — Claude Code installieren

```bash
npm install -g @anthropic-ai/claude-code
```

Beim ersten Start meldest du dich mit deinem Anthropic-Konto an:
```bash
claude
```

Für ein Projekt dieser Größe brauchst du ein Abo mit ausreichend Kontingent —
die aktuellen Pläne stehen auf **claude.com/pricing**. Ein einzelnes Ticket aus
`TICKETS.md` verbraucht je nach Umfang eine gute Portion, du wirst also in
Bauphasen merken, wenn das Kontingent knapp wird. Das ist kein Problem, nur eine
Frage der Planung: Dann machst du am nächsten Tag weiter.

### Schritt 3 — Supabase-Projekt anlegen

1. Auf **supabase.com** registrieren, „New Project" anlegen
2. Name: `baustellen-app`, Region: **Frankfurt (eu-central-1)** — wichtig für
   die DSGVO und für die Geschwindigkeit
3. Datenbank-Passwort erzeugen lassen und **sicher speichern** (Passwort-Manager)
4. Zwei Minuten warten, bis das Projekt bereit ist
5. Links im Menü auf **SQL Editor**
6. Jetzt die vier Dateien aus `supabase/migrations/` **in dieser Reihenfolge**
   ausführen: Datei öffnen, kompletten Inhalt kopieren, in den SQL Editor
   einfügen, „Run" drücken, auf „Success" warten, nächste Datei:

   ```
   0001_schema.sql      →  legt alle Tabellen an
   0002_functions.sql   →  die Kern-Logik (Confidence, Check-in)
   0003_rls.sql         →  Sicherheitsregeln
   0004_seed_katalog.sql →  29 Fahrzeuge und Feiertage
   ```

7. Prüfen, ob es geklappt hat: unter **Table Editor** solltest du die Tabelle
   `observable_types` mit 29 Zeilen sehen.

> Diese vier Dateien sind bereits gegen eine echte Postgres-Datenbank getestet
> worden. Wenn eine Fehlermeldung kommt, hast du vermutlich eine Datei
> übersprungen oder die Reihenfolge vertauscht.

### Schritt 4 — Projektordner vorbereiten

```bash
mkdir -p ~/Projekte/baustellen-app
cd ~/Projekte/baustellen-app
```

Entpacke das Startpaket in genau diesen Ordner. Danach liegen dort:
`CLAUDE.md`, `.env.example`, `docs/` und `supabase/`.

Jetzt die Zugangsdaten eintragen:
```bash
cp .env.example .env.local
open -e .env.local
```
Ein Texteditor geht auf. Die beiden Supabase-Werte findest du im
Supabase-Dashboard unter **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL` ← das Feld „Project URL"
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← der Schlüssel „anon public"
- `SUPABASE_SERVICE_ROLE_KEY` ← der Schlüssel „service_role" ⚠️ **geheim halten**

Speichern, Editor schließen.

### Schritt 5 — Loslegen

```bash
cd ~/Projekte/baustellen-app
claude
```

Claude Code liest jetzt automatisch `CLAUDE.md` und kennt damit dein Projekt.
Öffne `docs/TICKETS.md`, kopiere den Prompt von **T1** und füge ihn ein.

Ab hier baut die KI.

---

## Teil 3 — Wie du mit Claude Code arbeitest

### Die Schleife
```
Ticket aus TICKETS.md kopieren
   → einfügen, Enter
   → warten, bis fertig
   → im Browser anschauen (http://localhost:3000)
   → Rückmeldung geben, was noch nicht stimmt
   → wenn es passt: sichern (siehe unten), Haken setzen, nächstes Ticket
```

### Die fünf Regeln, die den Unterschied machen

**1. Immer nur ein Ticket gleichzeitig.** Der häufigste Fehler ist, zu viel auf
einmal zu wollen. Die Tickets sind bewusst so geschnitten, dass eines am Stück
funktioniert.

**2. Nach jedem fertigen Ticket sichern.** Sag einfach:
> *„Bitte committe den aktuellen Stand mit einer sinnvollen Nachricht."*

Das ist deine Rückgängig-Funktion. Wenn später etwas kaputtgeht, kannst du sagen:
*„Bitte stelle den Stand vom letzten Commit wieder her."* Ohne Commits ist das
nicht möglich — deshalb ist das die wichtigste Angewohnheit überhaupt.

**3. Bei Fehlern die komplette Meldung weitergeben.** Nicht zusammenfassen, nicht
kürzen, nicht selbst interpretieren. Kopieren und einfügen mit:
> *„Das kam dabei raus. Was bedeutet das und wie beheben wir es?"*

**4. Beschreibe, was du siehst — nicht, was die KI tun soll.** Du bist der
Auftraggeber, nicht der Architekt. Also nicht *„Ändere in Zeile 40 den Wert auf
16"*, sondern:
> *„Der Button ist auf dem Handy zu klein, ich treffe ihn mit dem Daumen nicht."*

Die KI kennt die technische Lösung, du kennst das Problem.

**5. Nach 30 Minuten ohne Fortschritt: Neustart statt Weiterbohren.** Wenn ein
Problem sich festfrisst, tippe `/clear` und beschreibe die Aufgabe von vorn, mit
dem Wissen von jetzt. Das löst überraschend viel, weil die KI dann nicht mehr an
ihren eigenen falschen Annahmen klebt.

### Nützliche Befehle in Claude Code

| Befehl | Wirkung |
|---|---|
| `/clear` | Gespräch zurücksetzen — bei festgefahrenen Problemen |
| `/help` | Übersicht aller Befehle |
| `Esc` | laufende Arbeit abbrechen |
| `Strg + C`, zweimal | Claude Code beenden |

### Sätze, die dir immer wieder helfen

> *„Erkläre mir in einfachen Worten, was du gerade gemacht hast und warum."*

> *„Bevor du etwas änderst: Beschreibe mir deinen Plan in drei Sätzen."*

> *„Das funktioniert. Bitte committe und erkläre mir, was ich als Nächstes
> testen sollte."*

> *„Ich verstehe nicht, was hier passiert. Erkläre es mir so, als wüsste ich
> nichts über Programmierung."*

---

## Teil 4 — Was das kostet

*Stand: September 2026. Preise ohne Mehrwertsteuer, ändern sich gelegentlich.*

### Während der Entwicklung (Monate 1–4)

| Posten | Kosten pro Monat |
|---|---|
| Claude-Abo | je nach Plan, siehe claude.com/pricing |
| Supabase | 0 € (Free-Tier reicht für die Entwicklung locker) |
| Vercel | 0 € (Hobby-Plan) |
| Karte über OpenFreeMap | 0 € |
| Domain (z. B. `.de`) | ~1 €, jährlich abgerechnet |

**Zusätzliche laufende Kosten während der Entwicklung: praktisch null.** Das
Claude-Abo ist der einzige echte Posten.

### Im Betrieb

| Nutzer | Supabase | Vercel | Karte | Summe pro Monat |
|---|---|---|---|---|
| bis ~100 | Free 0 € | Hobby 0 € | OpenFreeMap 0 € | **~0 €** |
| ~1.500 | Free bis Pro **25 $** | Hobby/Pro | OpenFreeMap 0 € | **0–45 $** |
| ~10.000 | Pro **25 $** + Speicher | Pro **20 $** | MapTiler Flex **30 $** | **~75–100 $** |

### Die drei Kostenfallen, die du kennen solltest

**Vercel Hobby ist nur für nicht-kommerzielle Nutzung erlaubt.** Solange die App
kostenlos und ohne Werbung läuft, ist das unkritisch. Sobald du irgendetwas
verdienst — auch Sponsoring —, brauchst du den Pro-Plan (20 $ pro Person und
Monat).

**MapTiler Free gilt ebenfalls nur für private oder nicht-kommerzielle Nutzung**
und ist auf 5.000 Karten-Sitzungen im Monat begrenzt. Das ist für eine
öffentliche App schnell erreicht. **Deshalb die Empfehlung: von Anfang an
OpenFreeMap verwenden** — kostenlos, ohne Konto, ohne Limit, basiert auf
OpenStreetMap. In der `.env.example` ist das bereits als Standard vorbereitet.
Falls dir die Optik später nicht gefällt, kostet der Wechsel zu MapTiler (30 $
im Monat) genau eine geänderte Zeile.

**Fotos sind der Posten, der wirklich wächst.** Supabase Free enthält 1 GB
Speicher. Bei durchschnittlich 200 KB pro Foto sind das etwa 5.000 Fotos. Das
Ticket T8 verkleinert Bilder deshalb schon beim Hochladen — nimm diesen Schritt
ernst, er verzehnfacht deinen Spielraum.

---

## Teil 5 — Wenn etwas nicht funktioniert

### Die Reihenfolge, in der du vorgehst

1. **Fehlermeldung komplett an Claude Code geben.** Löst neun von zehn Fällen.
2. **`/clear` und neu beschreiben.** Löst die Hälfte des Rests.
3. **Auf den letzten funktionierenden Stand zurück:**
   > *„Bitte zeig mir die letzten Commits und stelle den Stand von vor der
   > kaputten Änderung wieder her."*
4. **Einen Schritt zurückgehen.** Wenn ein Ticket sich als zu groß erweist:
   > *„Dieses Ticket ist zu umfangreich. Zerlege es in drei kleinere Schritte
   > und fang mit dem ersten an."*

### Typische Stolpersteine

| Symptom | Ursache | Lösung |
|---|---|---|
| „command not found: npm" | Node.js fehlt oder Terminal nicht neu gestartet | Terminal schließen und neu öffnen |
| Karte bleibt grau | Karten-URL fehlt in `.env.local` | Wert prüfen, dann `npm run dev` neu starten |
| „permission denied" bei Datenbankzugriff | RLS-Regeln greifen | Fehlermeldung an die KI, sie kennt das Schema |
| Änderungen erscheinen nicht im Browser | Server läuft noch mit altem Stand | im Terminal `Strg + C`, dann `npm run dev` |
| Standort wird nicht abgefragt | Browser erlaubt das nur über HTTPS oder localhost | auf dem Handy erst nach dem Deployment testen |
| Alles kaputt, nichts hilft | passiert | Punkt 3 oben — dafür sind die Commits da |

### Wann du dir Hilfe holen solltest

Es gibt zwei Punkte, an denen externe Hilfe sinnvoll ist — und beide haben nichts
mit Programmieren zu tun:

**Vor dem öffentlichen Start: ein Anwalt.** Datenschutzerklärung,
Nutzungsbedingungen, Haftungsausschluss und vor allem die Nutzungsrechte an den
hochgeladenen Fotos. Letzteres ist der Punkt, der sich später nicht mehr
korrigieren lässt — die Lizenzformulierung muss von Anfang an so weit gefasst
sein, dass eine spätere Datennutzung möglich bleibt. Rechne mit einigen hundert
Euro. Das ist gut investiert.

**Wenn echte Nutzer echte Daten hochladen: einmal jemand, der drüberschaut.**
Ein Entwickler, der zwei bis vier Stunden auf Sicherheitsregeln, Foto-Upload und
Datenschutz schaut, bevor die App öffentlich wird. Nicht um deinen Code zu
kritisieren, sondern um die eine Lücke zu finden, die die KI übersehen hat.

---

## Teil 6 — Dein Plan für die nächsten Wochen

### Diese Woche
- [ ] Node.js und Claude Code installieren *(30 Min.)*
- [ ] Supabase-Projekt anlegen, vier Migrationen ausführen *(30 Min.)*
- [ ] Startpaket entpacken, `.env.local` ausfüllen *(15 Min.)*
- [ ] Ticket **T1** durchziehen *(1–2 Std.)*

**Ziel am Ende der Woche:** Auf `localhost:3000` läuft eine leere App. Das fühlt
sich nach wenig an, ist aber die Hürde, an der die meisten scheitern.

### Woche 2
- [ ] T2 und T3 — Datenbankverbindung und Anmeldung
- [ ] Zwei bis drei echte Baustellen von Hand in Supabase eintragen, damit du
      etwas zum Anschauen hast

### Woche 3–4
- [ ] T4 bis T6 — die Karte lebt

**Ziel:** Du kannst auf deinem Handy eine Karte mit echten Baustellen öffnen. Ab
hier macht das Projekt Spaß, weil du siehst, was du baust.

### Woche 5–8
- [ ] T7 bis T11 — Erfassen, Check-in, Arbeitszeiten, Album
- [ ] Erste echte Nutzung: Geh mit deinem Kind zu drei Baustellen und trage sie
      mit der eigenen App ein. **Das ist der wichtigste Test des ganzen
      Projekts** — du wirst dabei mehr über die App lernen als in vier Wochen
      Bauen.

### Woche 9–12
- [ ] T12 bis T16 — Moderation, Onboarding, Open Data, Recht, Deployment
- [ ] 30–50 Münchner Baustellen selbst erfassen
- [ ] 20–30 Familien für den Test gewinnen

---

## Die drei Dinge, die wirklich über Erfolg entscheiden

**1. Der Check-in muss sich anfühlen wie nichts.** Wenn er sich wie eine Aufgabe
anfühlt, machen ihn die Leute nicht — und ohne Check-ins hat die App keine Daten
und keinen Sinn. Miss das mit der Stoppuhr, sobald T9 steht. Über 15 Sekunden ist
ein Problem, kein Detail.

**2. Die Karte darf am Anfang nicht leer sein.** Niemand trägt in eine leere App
etwas ein. Deshalb die 30–50 Baustellen von Hand, bevor der erste fremde Nutzer
sie sieht. Das ist stumpfe Arbeit und sie ist nicht optional.

**3. Der erste eigene Ausflug wird dir mehr zeigen als jede Planung.** Sobald der
Check-in funktioniert, geh raus. Du wirst Dinge merken, die in keinem PRD stehen
können: dass die Sonne aufs Display knallt, dass ein Kind keine 20 Sekunden
wartet, dass du die App einhändig bedienen musst, weil die andere Hand ein Kind
hält.

---

*Wenn du an einem Punkt nicht weiterkommst, komm mit der konkreten Situation
zurück — Fehlermeldung, Ticket-Nummer, was du erwartet hast. Das lässt sich fast
immer in wenigen Minuten klären.*
