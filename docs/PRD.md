# PRD — Arbeitstitel: „Baustellenjäger"

**Eine Karte der spannendsten Baustellen in der Nähe — für Familien mit kleinen Kindern.**
*Gebaut auf einer Mechanik, die später auf jede Art von kinderinteressantem Ort erweiterbar ist.*

| | |
|---|---|
| **Version** | 0.2 (Entwurf) |
| **Datum** | 01.09.2026 |
| **Autor** | MB |
| **Status** | Zur Umsetzung durch Solo-Entwickler + KI-Assistenz |
| **Pilotmarkt** | München |
| **Änderungen ggü. 0.1** | Arbeitszeiten als optionale Angabe (Kap. 8, Epic G) · Generalisierte Datenarchitektur für weitere Ortskategorien (Kap. 5 & 9) |

---

## 1. Problem & Motivation

Kleine Kinder (ca. 2–7 Jahre) sind fasziniert von Baumaschinen. Eltern suchen ständig nach kostenlosen, kurzen Ausflugszielen in Laufweite. Beides zusammen ergibt ein reales, wiederkehrendes Bedürfnis:

> „Wo ist gerade ein Bagger, den wir uns anschauen können — und lohnt sich der Weg jetzt?"

Diese Information existiert heute nirgends. Kommunale Baustellendaten sind auf Autofahrer ausgerichtet (Sperrungen, Umleitungen), enthalten keine Fotos, keine Fahrzeuge, keine Arbeitszeiten, keine Einschätzung ob dort gerade „was los" ist — und sind oft veraltet oder unvollständig.

**Die These:** Wenn Familien ohnehin an Baustellen stehen und schauen, kann ihre Beobachtung als Nebenprodukt einen Datensatz erzeugen, der genauer und aktueller ist als offizielle Quellen — weil er von Menschen vor Ort in Echtzeit bestätigt wird.

**Die zweite These (architekturprägend):** Das Muster *„Ort + beobachtbare Merkmale, die von Besuchern bestätigt werden und ohne Bestätigung von selbst veralten"* ist nicht baustellenspezifisch. Es funktioniert genauso für Spielplätze (welche Geräte gibt es, ist der Wasserspielplatz an?), Tierweiden, Feuerwachen oder Bahnübergänge. **v1 liefert nur Baustellen — aber das Fundament wird so gebaut, dass eine weitere Kategorie später eine Konfiguration ist, kein Umbau.**

**Sekundärer Wert (bewusst nicht MVP-Ziel):** Standort, Status, tatsächliche Aktivität und faktisches Ende von Baustellen sind für Städte, Routing-Anbieter, Logistik und Anwohner wertvoll. Das ist die Langfrist-Option, nicht der Startpunkt.

---

## 2. Zielgruppen

### Primär: „Der Bagger-Elternteil"
Elternteil eines 2–7-jährigen Kindes, wohnt urban/suburban, sucht 1–3× pro Woche eine kurze Beschäftigung im Freien. Bedient das Handy selbst — **das Kind nutzt die App nicht direkt**. Motivation: ein glückliches Kind, ohne Aufwand und ohne Geld.

*Design-Konsequenz:* Die App wird einhändig, im Stehen, bei Sonnenlicht, mit einem quengelnden Kind an der Hand bedient. Jede Interaktion muss in unter 10 Sekunden erledigt sein.

### Sekundär: „Der Sammler"
Ein Kind (oder Elternteil im Auftrag), das das Fahrzeug-Sammelalbum füllen will. Treiber für Wiederkehr und für Datenqualität.

### Tertiär (Post-MVP): Datennutzer
Stadtverwaltung, Routing-Anbieter, Bauunternehmen, Anwohner.

### Ausdrücklich nicht Zielgruppe (v1)
Bauprofis, Baumaschinen-Enthusiasten ohne Kinder, Autofahrer auf der Suche nach Umleitungen.

---

## 3. Produktziele & Erfolgsmetriken (6 Monate nach Launch, Pilotmarkt München)

| Nordstern | Definition | Zielwert 6 Monate |
|---|---|---|
| **Frische Orte** | Orte mit mind. 1 Check-in oder Update in den letzten 14 Tagen | **≥ 150** in München |
| **Wiederkehrende Familien** | Anteil registrierter Nutzer mit ≥ 2 Check-ins in einem Kalendermonat | **≥ 30 %** |
| **Contribution Rate** | Anteil aktiver Nutzer, die mind. 1× beigetragen haben (Check-in, Foto, Merkmal, Neuerfassung) | **≥ 20 %** |
| **Reichweite** | Registrierte Konten / installierte PWA | **≥ 1.500 Konten** |

**Wichtigste einzelne Metrik:** *Frische Orte.* Wenn dieser Wert stimmt, funktioniert das Produkt. Ohne ihn ist die App eine hübsche, tote Karte.

**Health-Metriken (Gegen-Metriken):**
- Anteil Orte mit ausschließlich veralteten Merkmalen (alle Confidence < 0,25) — soll **< 20 %** bleiben
- Abbruchrate im Erfassungs-Flow — soll **< 40 %** bleiben
- Anteil Baustellen mit hinterlegten Arbeitszeiten — Ziel **≥ 40 %** (Indikator, ob das optionale Feld angenommen wird)
- Gemeldete Fotos / Moderationsfälle pro 100 Uploads

---

## 4. Umfang v1 (MVP)

### In Scope
1. **Karte** mit Baustellen in der Nähe, ohne Konto nutzbar
2. **Detailseite**: Titel, Fotos, aktuelle Fahrzeuge mit Frische-Angabe, **Arbeitszeiten & „jetzt aktiv?"**, Check-in-Zähler, Sicherheitshinweis
3. **Ort erfassen** (Konto nötig): Standort, Titel, ≥ 1 Foto, ≥ 1 Fahrzeugtyp, optional Arbeitszeiten
4. **Check-in** (Konto nötig) mit Geo-Verifikation + Fahrzeug-Auswahl im selben Schritt
5. **Fahrzeug-Sammelalbum** — Fahrzeugtypen werden durch Check-ins freigeschaltet
6. **Frische-System (Confidence Decay)** — der technische Kern, siehe Kapitel 7
7. **Arbeitszeiten-System** — optional angegeben, ergänzt durch beobachtete Aktivität, siehe Kapitel 6.5
8. **Kategorie-fähige Datenarchitektur** — intern generalisiert, nach außen nur „Baustelle", siehe Kapitel 5
9. **Open-Data-Seeding** für München + manuell erfasste Startorte
10. **Melden & Moderation** (minimal: Melde-Button, Admin-Ansicht, Löschen/Ausblenden)

### Explizit nicht in v1 (Nicht-Ziele)
- **Weitere Ortskategorien** (Spielplätze etc.) — das Fundament trägt sie, die App zeigt sie nicht
- Bingo-Karten, Missionen, Badges, Seltenheitsstufen als Spielmechanik *(Seltenheit existiert nur als Anzeige-Attribut)*
- Öffentliche B2B-API, Städte-Dashboard, Datenexport
- Native Apps in den App Stores
- Kinderprofile / Familienkonten
- Social Features: Freunde, Kommentare, Likes, Ranglisten, Nutzernamen an Check-ins
- Push-Benachrichtigungen
- Routenplanung innerhalb der App (nur Deep-Link zu Maps)
- Monetarisierung jeglicher Art
- Mehrsprachigkeit (v1 ist deutschsprachig)
- Admin-UI zum Anlegen neuer Kategorien (v1: Kategorien werden per SQL-Migration gepflegt)

---

## 5. Kernentscheidungen & Architekturprinzip

### 5.1 Getroffene Entscheidungen

| Frage | Entscheidung | Begründung |
|---|---|---|
| Fokus | Familien-Erlebnis zuerst, B2B später | Ohne Nutzer keine Daten, ohne Daten kein B2B |
| Plattform | **PWA / Mobile Web zuerst** | Kein Store-Review, schnellste Iteration, ein Codebase für Solo-Entwickler |
| Cold Start | Open-Data-Seed **+** manuelle Erfassung in München | Leere Karte = sofortiger Absprung |
| Frische | **Confidence Decay + „zuletzt gesehen"** | Keine Nachfragen, trotzdem aktuelle Daten |
| Konten | Lesen anonym, **Beitragen nur mit Konto** | Niedrige Einstiegshürde, aber Spam-Schutz und Sammel-Persistenz |
| Gamification v1 | Sammelalbum ja, Bingo/Badges nein | Album ist der Wiederkehr-Grund, Rest ist Ballast |
| Arbeitszeiten | **Optionales Feld + beobachtete Aktivität** | „Lohnt sich der Weg jetzt?" ist die eigentliche Nutzerfrage |
| Erweiterbarkeit | **Datenmodell generisch, UI baustellen-spezifisch** | Später eine Kategorie ergänzen, ohne Migration von Bestandsdaten |
| Geschäftsmodell | Keines in v1 | Passion Project; Optionen in Kapitel 13 |

### 5.2 Architekturprinzip: „Ein Ort mit beobachtbaren Merkmalen"

Alles im System folgt einer einzigen Abstraktion:

```
Kategorie  ──►  Ort  ──►  beobachtbare Merkmale  ──►  Check-ins bestätigen sie
(baustelle)    (Ort X)    (Bagger, Kran, …)          (Confidence steigt / zerfällt)
```

Eine **Kategorie** definiert, was an ihren Orten beobachtbar ist und wie sich das verhält:

| | **Baustelle** (v1) | **Spielplatz** (Beispiel v2) | **Tierweide** (Beispiel) |
|---|---|---|---|
| Merkmale | Bagger, Kran, Walze … | Rutsche, Schaukel, Seilbahn, Wasserspiel | Kühe, Ziegen, Pferde |
| Verfallen Merkmale? | Ja, schnell (Tage) | Meist nein (Rutsche bleibt) | Ja, saisonal (Wochen) |
| Zeitangabe heißt | „Arbeitszeiten" | „Öffnungszeiten" | „Beste Zeit" |
| Lebensdauer des Orts | Endlich (Baustelle endet) | Dauerhaft | Dauerhaft, saisonal aktiv |
| Sammelalbum | Fahrzeuge | Spielgeräte | Tiere |

Diese Unterschiede sind **Daten, kein Code**. Konkret bedeutet das drei Design-Regeln, die ab Tag 1 gelten:

1. **Kein Tabellenname und kein Feldname enthält das Wort „Baustelle" oder „Fahrzeug".** Es heißt `places`, `observable_types`, `place_observables` — nicht `sites` und `vehicle_types`.
2. **Verfallsverhalten ist ein Attribut des Merkmalstyps**, nicht eine globale Regel. Eine Rutsche ist ein Merkmal mit `is_permanent = true` und verfällt nie; ein Fahrmischer verfällt in 1,5 Tagen. Dieselbe Confidence-Funktion bedient beide.
3. **Kategoriespezifische Felder liegen in einem JSONB-Feld** (`attributes`), nicht als eigene Spalten. Baustelle: `{ "phase": "rohbau" }`. Spielplatz später: `{ "schattig": true, "eingezaeunt": true, "wc_in_naehe": false }`.

**Was ausdrücklich NICHT generalisiert wird:** die Benutzeroberfläche. Die App spricht in v1 durchgehend von Baustellen und Fahrzeugen, mit baustellenspezifischen Texten, Icons und Sicherheitshinweisen. Eine generische „Orte-App" wäre schlechter als eine sehr gute Baustellen-App. Der Aufwand für die Generalisierung liegt bei etwa einem Tag Mehrarbeit im Datenmodell — der Aufwand, sie später nachzurüsten, bei mehreren Wochen inklusive Datenmigration.

**Konkrete Grenze für v1:** Die Tabelle `place_categories` enthält genau eine Zeile (`baustelle`). Jede Query filtert auf sie. Es gibt keinen Kategoriewechsler im UI, keinen Kategorie-Admin, keine kategorieabhängigen Layouts. Nur die Struktur ist bereit.

---

## 6. Nutzer-Flows

### 6.1 Entdecken (ohne Konto)
```
App öffnen → Standortfreigabe (mit Erklärung, ablehnbar) → Karte zeigt Baustellen im Umkreis
→ Marker antippen → Vorschau (Foto, Titel, Entfernung, „2 Fahrzeuge aktuell", „Jetzt aktiv")
→ Detailseite → „Route in Google/Apple Maps öffnen"
```
**Ohne Standortfreigabe:** Karte startet auf Stadtzentrum München, Suchfeld für Ort/Adresse.

**Filter (v1, minimal):** Umkreis (1/3/10 km) · „nur mit Fahrzeugen aktuell gesehen" · **„jetzt vermutlich aktiv"** · Fahrzeugtyp.

### 6.2 Ort erfassen (Konto nötig)
```
„+" → Foto aufnehmen ODER aus Galerie wählen
→ System versucht Standort in dieser Reihenfolge:
   1. GPS-Koordinaten aus Foto-EXIF
   2. Aktueller Gerätestandort
   3. Manuelle Kartenauswahl
→ Pin auf Karte bestätigen/verschieben (immer, nie ohne Bestätigung)
→ Duplikat-Check: Orte im Umkreis von 100 m werden angezeigt
   („Meinst du diese hier? → Stattdessen einchecken")
→ Titel eingeben (Vorschlag aus Reverse-Geocoding: „Baustelle Leopoldstraße")
→ Fahrzeuge antippen (Chip-Auswahl, ≥ 1 Pflicht)
→ Optional, alles überspringbar: Arbeitszeiten · Bauphase · Notiz
   („guter Blick vom Spielplatz aus")
→ Speichern → direkt eingecheckt, Fahrzeuge im Album freigeschaltet
```
**Zeitbudget: < 60 Sekunden** — inklusive Überspringen aller optionalen Felder.

> ⚠️ **EXIF-Realitätscheck:** iOS/Safari entfernt beim Auswählen aus der Fotomediathek in vielen Fällen die GPS-Daten (abhängig von der Freigabeoption des Nutzers). Bei direkt in der App aufgenommenen Fotos gibt es je nach Browser gar kein EXIF. **EXIF ist deshalb eine Optimierung, kein tragender Mechanismus** — der Gerätestandort ist der Standardpfad, EXIF nur der Bonus für nachträglich hochgeladene Fotos.

### 6.3 Check-in (Konto nötig) — *der wichtigste Flow*
```
Auf Detailseite: großer Button „Ich bin hier 👋"
→ Standort-Prüfung (Geofence, siehe 8.3 / C2)
→ EIN Screen: „Was siehst du gerade?"
   Chips: gemeldete Fahrzeuge zuerst (nach Confidence sortiert),
          darunter „weitere hinzufügen"
   Bereits gemeldete sind NICHT vorausgewählt.
→ Button: „Das habe ich gesehen"
→ Bestätigung: neu freigeschaltete Fahrzeuge werden gefeiert (Animation),
   Check-in-Zähler erhöht sich
→ Optional-Angebot: „Foto hinzufügen?" (überspringbar, nie blockierend)
```
**Zeitbudget: < 15 Sekunden.** Kein Fragebogen, keine Ja/Nein-Abfragen zu einzelnen Fahrzeugen. **Der Check-in-Flow bekommt keine Frage nach Arbeitszeiten** — die Aktivitätsinformation entsteht implizit aus Zeitstempel und Fahrzeugauswahl (siehe 6.5).

### 6.4 Sammelalbum
Raster aller Fahrzeugtypen des Katalogs. Nicht freigeschaltete Typen als Silhouette. Freigeschaltete zeigen: Illustration/eigenes Foto, kindgerechter Name, 2–3 Sätze Steckbrief („Was macht ein Radlader?"), wo und wann zuerst gesehen. Fortschrittsanzeige („17 von 24 Fahrzeugen").

*Erweiterbarkeit:* Das Album ist technisch bereits pro Kategorie organisiert (`observable_types` gefiltert auf Kategorie). In v1 gibt es genau ein Album; ab v2 würde ein zweites Register „Spielgeräte" erscheinen, ohne dass die Logik sich ändert.

### 6.5 Arbeitszeiten & „lohnt sich der Weg jetzt?" — *neu in v0.2*

Eine Baustelle ohne arbeitende Maschinen ist für ein vierjähriges Kind eine Enttäuschung. Sonntagvormittag ist jede Baustelle langweilig. Das System beantwortet die Frage „ist da gerade was los?" aus **zwei unabhängigen Quellen**, die sich gegenseitig ergänzen:

**Quelle 1 — Angegebene Arbeitszeiten (optional, vom Nutzer)**

Beim Erfassen und auf der Detailseite kann jeder angemeldete Nutzer Arbeitszeiten hinterlegen. Die Eingabe darf keine Hürde sein, deshalb drei Presets statt eines Wochenplaners:

| Auswahl | Bedeutung |
|---|---|
| **Übliche Bauzeiten** *(Vorauswahl)* | Mo–Fr 07:00–16:00 |
| **Auch samstags** | Mo–Fr 07:00–16:00, Sa 08:00–13:00 |
| **Rund um die Uhr / Schichtbetrieb** | durchgehend |
| **Eigene Zeiten** | Wochentage + Von/Bis, ein Zeitfenster pro Tagesgruppe |
| **Weiß ich nicht** *(Standard bei Auslassung)* | keine Angabe |

Ein Tap für den Normalfall. Kein Pflichtfeld, an keiner Stelle blockierend.

**Quelle 2 — Beobachtete Aktivität (automatisch, aus Check-ins)**

Jeder Check-in trägt implizit einen Zeitstempel und eine Aussage über Aktivität:

```
Check-in mit ≥ 1 gemeldetem Fahrzeug einer mobilen oder transienten Klasse
  → Aktivitäts-Signal für (Wochentag, Stunde)
Check-in ganz ohne Fahrzeugmeldung, oder nur Standgeräte
  → Ruhe-Signal für (Wochentag, Stunde)
```

Daraus entsteht pro Ort ein Histogramm über 7 × 24 Buckets. Ab **8 Check-ins** wird es auf der Detailseite angezeigt:

> **Meist was los:** Werktags vormittags · *aus 34 Besuchen*

Das ist die ehrlichere Angabe als jedes Formularfeld — und sie kostet den Nutzer nichts.

**Anzeige-Logik (kombiniert)**

| Zustand | Badge | Bedingung |
|---|---|---|
| 🟢 **Jetzt vermutlich aktiv** | grün | innerhalb angegebener Arbeitszeiten *oder* im beobachteten Aktivitäts-Peak |
| 🌙 **Jetzt vermutlich Ruhe** | grau | außerhalb beider |
| ❔ **Zeiten unbekannt** | neutral | keine Angabe und < 8 Check-ins |

Bei Widerspruch gewinnt die Beobachtung: Wenn die angegebenen Zeiten „Mo–Fr 7–16" sagen, die letzten 15 Check-ins samstags aber durchgehend Aktivität zeigten, wird die Beobachtung angezeigt und die Angabe als „laut Angabe: …" nachgeordnet.

**Formulierung ist bewusst vorsichtig.** Niemals „Hier arbeitet gerade ein Bagger" — immer „vermutlich". Eine falsche Zusage kostet eine Familie einen umsonst gelaufenen Weg mit einem enttäuschten Kind; das ist der teuerste Fehler, den diese App machen kann.

**Feiertage:** Bundesweite und bayerische Feiertage werden als Ruhetage behandelt (statische Liste im Code, jährlich zu pflegen — kein externer Dienst nötig).

---

## 7. Kern-Mechanik: Wie Merkmale frisch bleiben

> Dies ist der konzeptionelle Kern des Produkts und die Antwort auf die zentrale offene Frage: *Wie werden Angaben veraltet, ohne dass wir Nutzer befragen müssen?*
>
> Formuliert ist der Mechanismus generisch über „Merkmale" (`observables`), weil er für Fahrzeuge, Spielgeräte oder Tiere identisch funktioniert. In v1 sind Merkmale immer Baufahrzeuge.

### 7.1 Grundprinzip
Ein Merkmal ist an einem Ort nie „vorhanden" oder „nicht vorhanden", sondern hat eine **Konfidenz zwischen 0 und 1**, die mit der Zeit von selbst zerfällt und durch Sichtungen wieder ansteigt. Niemand muss je etwas löschen.

```
confidence = 0.5 ^ (Δt / halbwertszeit)     Δt = Zeit seit last_seen_at
```

### 7.2 Halbwertszeit pro Merkmalsklasse
Nicht jedes Merkmal veraltet gleich schnell. Die Halbwertszeit ist ein **Attribut des Merkmalstyps**:

| Klasse | Beispiele (Baustelle) | Halbwertszeit |
|---|---|---|
| **permanent** | *(v1 ungenutzt)* — später: Rutsche, Schaukel, Sandkasten | ∞ (kein Zerfall) |
| **Standgerät** | Turmdrehkran, Baucontainer, Silo, Bauaufzug | 30 Tage |
| **Stationär-mobil** | Kettenbagger, Bohrgerät, Rammgerät, Abbruchbagger | 10 Tage |
| **Mobil** | Radlader, Walze, Straßenfertiger, Teleskoplader, Minibagger | 5 Tage |
| **Transient** | Fahrmischer, Betonpumpe, Kipplaster, Kehrmaschine, Saugbagger | 1,5 Tage |

Ein Turmdrehkran, der vor drei Wochen gemeldet wurde, ist mit hoher Wahrscheinlichkeit noch da. Ein Fahrmischer von vorgestern nicht. Das System bildet das ab, ohne jemanden zu fragen.

Die Klasse `permanent` existiert ab v1 im Schema, wird aber erst von späteren Kategorien genutzt. Permanente Merkmale haben immer Confidence 1,0 und verschwinden nur durch eine Meldung („Rutsche wurde abgebaut"), die von zwei unabhängigen Nutzern bestätigt werden muss.

### 7.3 Anzeige-Buckets
| Confidence | Anzeige | Ort im UI |
|---|---|---|
| ≥ 0,60 | 🟢 **„Jetzt hier"** | Hauptbereich, oben |
| 0,25 – 0,60 | ⚪️ **„Zuletzt gesehen vor 6 Tagen"** | Hauptbereich, ausgegraut |
| < 0,25 | 📦 **Archiv** | Eingeklappt: „Früher hier gesehen (4)" |

Nutzer sehen nie einen Wert oder Prozentsatz — nur den natürlich formulierten Zeitbezug. Die Zahl ist ein internes Konstrukt.

### 7.4 Das implizite Negativ-Signal (die eigentliche Lösung)
Der Check-in-Screen zeigt bereits gemeldete Merkmale als Chips, **nicht vorausgewählt**. Der Absende-Button heißt bewusst „**Das habe ich gesehen**" — er impliziert Vollständigkeit, ohne eine Frage zu stellen.

Beim Absenden gilt für jedes nicht-permanente Merkmal mit Confidence ≥ 0,25, das **nicht** angetippt wurde:

```
last_seen_at bleibt unverändert
negative_count += 1
→ effektive Halbwertszeit wird für dieses Merkmal halbiert
   (Faktor 0.5 ^ negative_count, gedeckelt bei 1/8)
```

Das heißt: **Nicht-Antippen ist die Antwort.** Ein Bagger, den drei Besucher in Folge nicht melden, verschwindet innerhalb von Tagen statt Wochen aus der Ansicht — ohne dass eine einzige Frage gestellt wurde.

**Schutz gegen Fehlsignale:** Ein Check-in erzeugt nur dann Negativ-Signale, wenn mindestens ein Merkmal angetippt wurde (sonst war der Nutzer nur „Ich war da"-motiviert und hat nichts über Fahrzeuge ausgesagt). `negative_count` wird bei jeder Bestätigung auf 0 zurückgesetzt. Permanente Merkmale sind von Negativ-Signalen ausgenommen.

**Kein hartes Löschen:** Ein Eintrag verschwindet nie ganz. Er wandert ins Archiv und kann durch eine einzige neue Sichtung sofort wieder auf 1,0 springen. Das macht das System fehlertolerant — falsche Negativsignale kosten nichts Bleibendes.

### 7.5 Mehrere unabhängige Melder
`distinct_reporters` erhöht die Trägheit eines Merkmals:

```
effektive_halbwertszeit = basis_halbwertszeit × (1 + 0.3 × min(distinct_reporters - 1, 3))
```
Was fünf Leute unabhängig gesehen haben, verfällt langsamer als eine Einzelmeldung.

### 7.6 Lifecycle des Orts selbst
Merkmale sind das eine — der Ort selbst muss auch irgendwann verschwinden. Ob und wie schnell, ist ein Kategorie-Attribut (`lifecycle`): Baustellen sind `endlich`, Spielplätze wären `dauerhaft`.

| Signal | Wirkung (bei Lifecycle „endlich") |
|---|---|
| Enddatum aus Open-Data-Quelle erreicht | Status → `vermutlich_beendet`, Marker ausgegraut |
| Kein Check-in/Update seit 90 Tagen | Status → `ruhend`, aus Standardansicht ausgeblendet (per Filter sichtbar) |
| Nutzer meldet „hier ist nichts mehr" (ein Tap auf der Detailseite) | 2 unabhängige Meldungen → `beendet` |
| Neuer Check-in auf ruhendem/beendetem Ort | Status → `aktiv`, Zähler zurückgesetzt |

Zusätzlich erhält jede Baustelle eine **Bauphase** (Aushub / Rohbau / Tiefbau / Straßenbau / Abbruch / Ausbau / Unbekannt) im `attributes`-JSONB. Die Phase ist ein sekundäres Signal: Wenn ein Fahrzeugtyp nicht zur gemeldeten Phase passt (z. B. Straßenfertiger bei „Rohbau"), wird seine Halbwertszeit zusätzlich reduziert. *Optional, kann in v1.1 nachgezogen werden.*

### 7.7 Genau eine erlaubte Rückfrage
Falls das implizite Signal nicht ausreicht, gibt es **eine** Ausnahme: Wenn ein Ort > 30 Tage keinen Check-in hatte und ein Nutzer ihn in der Detailansicht öffnet, erscheint ganz unten ein unaufdringlicher Ein-Tap-Streifen:

> „Warst du zuletzt dort? Ist die Baustelle noch da?" · **Ja** · **Nein** · *(ignorieren)*

Kein Modal, kein Blocker, maximal einmal pro Nutzer und Ort.

---

## 8. Funktionale Anforderungen (User Stories mit Akzeptanzkriterien)

### Epic A — Karte & Entdecken

**A1. Als Elternteil sehe ich Baustellen in meiner Nähe auf einer Karte, ohne mich anzumelden.**
- Karte lädt in < 2 s auf 4G
- Standortfreigabe wird mit Begründung angefragt; bei Ablehnung startet die Karte auf München-Zentrum
- Marker sind ab Zoomstufe 12 geclustert
- Marker-Farbe kodiert Aktualität: farbig = mind. 1 Fahrzeug „jetzt hier", grau = nur ältere Daten
- Marker zeigen zusätzlich einen kleinen Aktivitäts-Indikator, wenn der Ort gerade in seinen Arbeitszeiten liegt
- Bei > 200 Orten im Viewport wird nach Confidence priorisiert geladen

**A2. Als Elternteil sehe ich in einer Vorschau, ob sich die Fahrt lohnt.**
- Antippen eines Markers öffnet ein Bottom-Sheet mit Foto, Titel, Entfernung, Anzahl aktueller Fahrzeuge, Aktivitäts-Badge, Check-in-Zahl
- Von dort ein Tap zur Detailseite, ein Tap zu „Route öffnen"

**A3. Als Elternteil kann ich filtern.**
- „Zeig mir Kräne" filtert auf Orte mit Confidence ≥ 0,25 für diesen Merkmalstyp
- „Jetzt vermutlich aktiv" filtert nach der Logik aus 6.5
- Filter bleiben über Sessions erhalten (localStorage)

### Epic B — Detailseite

**B1. Ich sehe, welche Fahrzeuge dort aktuell sind und wie verlässlich die Info ist.**
- Merkmale gruppiert nach den Buckets aus 7.3
- Jedes Merkmal zeigt Icon, Name und Zeitbezug in natürlicher Sprache
- Archiv-Sektion ist standardmäßig eingeklappt

**B2. Ich sehe, wie viele Menschen dort waren — aber nicht, wer.**
- Check-in-Zähler gesamt + „diese Woche"
- **Keine** Nutzernamen, Avatare oder Zeitstempel einzelner Check-ins irgendwo im UI oder in der API-Response

**B3. Ich sehe Fotos.**
- Galerie, neueste zuerst; Aufnahmedatum sichtbar
- Fotos älter als 90 Tage sind als „älteres Foto" markiert

**B4. Ich sehe einen Sicherheitshinweis.**
- Statischer, nicht wegklickbarer Hinweis auf jeder Detailseite: Baustelle nicht betreten, nur von außerhalb der Absperrung beobachten, Kinder an der Hand
- Hinweistext ist ein Attribut der Kategorie, nicht hartkodiert (Spielplätze bräuchten später einen anderen)

### Epic C — Beitragen

**C1. Als angemeldeter Nutzer kann ich einen neuen Ort in < 60 s erfassen.**
- Pflichtfelder: Standort, Titel, ≥ 1 Foto, ≥ 1 Merkmal
- Optionale Felder klar als solche gekennzeichnet und in einem einklappbaren Bereich „Mehr Details (optional)"
- Standortermittlung nach Kaskade aus 6.2, Pin immer manuell bestätigen/verschiebbar
- Duplikat-Warnung bei bestehendem Ort im Umkreis von 100 m, mit direktem Weg zum Check-in
- Entwurf überlebt App-Neustart (localStorage)

**C2. Als angemeldeter Nutzer kann ich einchecken, wenn ich vor Ort bin.**
- Check-in nur bei Gerätestandort ≤ 200 m vom Pin **und** GPS-Genauigkeit ≤ 100 m
- Bei Fehlschlag: klare Meldung + Möglichkeit, den Pin zu korrigieren (statt Sackgasse)
- Max. 1 wertender Check-in pro Nutzer/Ort/24 h (weitere sind erlaubt, zählen aber nicht erneut für Zähler, Confidence und Aktivitäts-Histogramm)

**C3. Beim Check-in kann ich Merkmale in einem Schritt melden.**
- Chips, bereits gemeldete oben, nicht vorausgewählt
- Suchfeld für weitere Typen aus dem Katalog
- Absenden erzeugt Confidence-Updates und Negativ-Signale nach 7.4 sowie ein Aktivitäts-Signal nach 6.5

**C4. Ich kann Fotos zu einem bestehenden Ort hinzufügen.**
- Nur bei erfolgtem Check-in am selben Ort innerhalb der letzten 24 h
- Max. 5 Fotos pro Nutzer und Ort pro Tag

**C5. Ich kann falsche oder unpassende Inhalte melden.**
- Melde-Button an Ort und an jedem Foto
- Gründe: existiert nicht (mehr) · falscher Ort · unpassendes Foto · Personen erkennbar · Sonstiges
- Ab 2 unabhängigen Meldungen automatische Ausblendung bis zur manuellen Prüfung

### Epic D — Sammelalbum

**D1. Ein Merkmalstyp wird freigeschaltet, wenn ich ihn bei einem verifizierten Check-in melde.**
- Freischaltung nur über Check-in (nicht über bloßes Ansehen einer Detailseite)
- Freischaltung wird sichtbar gefeiert (Animation + Merkmalskarte)
- Gespeichert wird: Merkmalstyp, Zeitpunkt, Ort

**D2. Ich sehe meinen Fortschritt.**
- Raster mit Silhouetten für Fehlendes, Fortschrittszähler
- Detailansicht je Merkmal: kindgerechter Name, Steckbrief, „zuerst gesehen am … an …"
- Album ist intern nach Kategorie gruppiert; v1 zeigt genau eine Gruppe ohne Register-Navigation

### Epic E — Konto & Datenschutz

**E1. Ich kann ohne Konto alles ansehen.**
**E2. Registrierung erfolgt in einem Schritt** (Magic Link per E-Mail sowie Apple/Google Sign-in).
**E3. Ich kann mein Konto und alle meine Daten löschen** — Beiträge werden dabei anonymisiert, nicht entfernt (Datenqualität), Fotos werden gelöscht. Dieses Verhalten wird vor dem Löschen erklärt.

### Epic F — Admin (minimal, kein schönes UI nötig)
- Liste gemeldeter Inhalte, Ort/Foto ausblenden oder löschen
- Nutzer sperren
- Ort manuell als beendet markieren
- Import-Job für Open Data anstoßen und Ergebnis sehen
- Halbwertszeiten der Merkmalstypen bearbeiten (Kalibrierung, siehe Risiken)

### Epic G — Arbeitszeiten & Aktivität *(neu in v0.2)*

**G1. Als beitragender Nutzer kann ich Arbeitszeiten hinterlegen — muss es aber nicht.**
- Auswahl über die Presets aus 6.5, „Übliche Bauzeiten" ist vorausgewählt, „Weiß ich nicht" jederzeit wählbar
- Eingabe erreichbar sowohl im Erfassungs-Flow (optionaler Bereich) als auch nachträglich auf der Detailseite
- Änderung durch andere Nutzer möglich; letzte Änderung gewinnt, Änderungshistorie wird gespeichert
- Kein Feld ist Pflicht, kein Screen blockiert wegen fehlender Zeiten

**G2. Als Elternteil sehe ich, ob sich der Weg jetzt lohnt.**
- Badge nach der Logik aus 6.5 auf Marker-Vorschau und Detailseite
- Formulierung immer im Konjunktiv („vermutlich"), nie als Zusage
- Bei fehlender Datenlage: neutraler Zustand „Zeiten unbekannt", keine Vermutung ins Blaue
- Feiertage (bundesweit + Bayern) gelten als Ruhetage

**G3. Das System lernt die tatsächlichen Aktivitätszeiten aus Check-ins.**
- Jeder wertende Check-in erhöht den Zähler im Bucket (Wochentag, Stunde) — als Aktivität oder Ruhe gemäß 6.5
- Anzeige des beobachteten Musters erst ab 8 wertenden Check-ins
- Bei Widerspruch zwischen Angabe und Beobachtung wird die Beobachtung primär angezeigt
- Rohdaten des Histogramms werden aggregiert gespeichert, ohne Bezug zu einzelnen Nutzern

---

## 9. Datenmodell

> Benennung bewusst generisch (`places`, `observables`), damit spätere Kategorien keine Migration erzwingen. In v1 existiert genau eine Kategorie.

```sql
-- Kategorien: v1 enthält genau eine Zeile ('baustelle')
place_categories (
  id                 text pk,          -- 'baustelle' | später 'spielplatz', ...
  name_singular      text,             -- "Baustelle"
  name_plural        text,
  observable_label   text,             -- "Fahrzeuge"    (Spielplatz: "Spielgeräte")
  hours_label        text,             -- "Arbeitszeiten"(Spielplatz: "Öffnungszeiten")
  lifecycle          text,             -- 'endlich' | 'dauerhaft'
  safety_notice      text,             -- kategoriespezifischer Sicherheitshinweis
  attribute_schema   jsonb,            -- welche Zusatzfelder die Kategorie kennt
  marker_style       jsonb
)

-- Orte
places (
  id                uuid pk,
  category_id       text not null references place_categories,
  title             text not null,
  geom              geography(Point,4326) not null,   -- PostGIS
  address           text,
  attributes        jsonb default '{}',  -- Baustelle: {"phase":"rohbau"}
                                         -- Spielplatz später: {"schattig":true}
  status            text not null,       -- aktiv|ruhend|vermutlich_beendet|beendet
  source            text not null,       -- user|open_data
  external_id       text,
  external_end_at   timestamptz,
  note              text,                -- "guter Blick vom Spielplatz"
  created_by        uuid,
  created_at        timestamptz,
  last_activity_at  timestamptz,
  checkin_count     int default 0,       -- denormalisiert
  is_hidden         bool default false
)
CREATE INDEX ON places USING GIST (geom);
CREATE INDEX ON places (category_id, status);

-- Öffnungs-/Arbeitszeiten (optional, 0..n Zeilen pro Ort)   << neu in v0.2
place_hours (
  id            uuid pk,
  place_id      uuid references places,
  preset        text,        -- 'werktags'|'werktags_sa'|'durchgehend'|'custom'
  weekday       int,         -- 0=Mo .. 6=So   (bei 'durchgehend' alle sieben)
  start_min     int,         -- Minuten seit Mitternacht, z.B. 420 = 07:00
  end_min       int,
  updated_by    uuid,
  updated_at    timestamptz
)
-- Kein Eintrag = "Zeiten unbekannt". Preset wird mitgespeichert,
-- damit die UI beim Bearbeiten die richtige Vorauswahl zeigt.

-- Beobachtete Aktivität, aggregiert (7x24 Buckets pro Ort)  << neu in v0.2
place_activity (
  place_id      uuid references places,
  weekday       int,          -- 0..6
  hour          int,          -- 0..23
  active_count  int default 0,
  quiet_count   int default 0,
  PRIMARY KEY (place_id, weekday, hour)
)

-- Katalog beobachtbarer Merkmale (statisch gepflegt)
observable_types (
  id, category_id references place_categories,
  slug, name_de, kid_name, group_name,     -- group_name: "Bagger", "Kräne", ...
  class,                -- permanent|standgeraet|stationaer_mobil|mobil|transient
  half_life_days        numeric,           -- NULL bei class='permanent'
  is_permanent          bool default false,
  rarity,               -- haeufig|selten|legendaer  (nur Anzeige in v1)
  icon_url, illustration_url, kid_description
)

-- Aggregat: welches Merkmal an welchem Ort, wie frisch
place_observables (
  place_id, observable_type_id,      -- pk zusammengesetzt
  first_seen_at, last_seen_at,
  positive_count, negative_count,
  distinct_reporters int
)
-- confidence wird zur Laufzeit berechnet, NICHT gespeichert.

-- Check-ins
checkins (
  id, place_id, user_id, created_at,
  lat, lon, accuracy_m,
  local_weekday int, local_hour int,   -- vorberechnet für place_activity
  counts_toward_stats bool
)
checkin_observables ( checkin_id, observable_type_id )

-- Sammlung
user_observable_unlocks ( user_id, observable_type_id, first_place_id, unlocked_at )

-- Fotos
place_photos (
  id, place_id, storage_path, uploaded_by, created_at,
  taken_at, exif_lat, exif_lon,
  moderation_status
)

-- Moderation
reports ( id, target_type, target_id, reporter_id, reason, created_at, resolved_at )
```

**Wichtigste Design-Entscheidung im Datenmodell:** `confidence` wird **berechnet, nicht gespeichert**. Damit gibt es keinen Hintergrundjob, der Werte verfallen lässt — der Zerfall ist eine reine Funktion von `now() - last_seen_at`. Das spart als Solo-Entwickler enorm viel Infrastruktur.

```sql
CREATE FUNCTION observable_confidence(
  last_seen timestamptz, half_life numeric, is_permanent bool,
  neg_count int, reporters int
) RETURNS numeric AS $$
  SELECT CASE WHEN is_permanent THEN 1.0 ELSE
    power(
      0.5,
      EXTRACT(EPOCH FROM (now() - last_seen)) / 86400.0
      / GREATEST(
          half_life
            * (1 + 0.3 * LEAST(GREATEST(reporters - 1, 0), 3))  -- mehr Melder = träger
            * power(0.5, LEAST(neg_count, 3)),                   -- Negativsignale = schneller
          0.25)
    )
  END;
$$ LANGUAGE sql IMMUTABLE;
```

**Aktivitäts-Auswertung** (für das Badge aus 6.5):

```sql
-- "jetzt vermutlich aktiv?"
-- 1) place_hours enthält einen Eintrag, der jetzt passt   ODER
-- 2) place_activity[jetzt].active_count >= 3
--    UND active_count > quiet_count
-- Feiertag (statische Liste) überschreibt beides auf 'ruhe'.
```

---

## 10. Technische Empfehlung (optimiert für Solo + KI)

| Bereich | Empfehlung | Warum |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript**, als installierbare PWA | Ein Framework, gute KI-Unterstützung, Server- und Client-Code in einem Repo |
| Backend / DB | **Supabase** (Postgres + PostGIS, Auth, Storage, Row Level Security) | Ersetzt Auth, Datenbank, Storage und API in einem Produkt; PostGIS für Umkreissuche |
| Karte | **MapLibre GL JS** + Vektor-Tiles (MapTiler oder Protomaps) | Keine Google-Maps-Kosten, volle Kontrolle über Marker-Styling |
| Geocoding | Nominatim/Photon (Reverse) für Titelvorschläge | Kostenfrei, ausreichend |
| Fotos | Supabase Storage + serverseitige Transformation; EXIF client-seitig mit `exifr` | EXIF vor dem Upload lesen, danach **EXIF strippen** |
| Zeitzone/Feiertage | `date-fns-tz` + statische Feiertagsliste (DE + BY) | Kein externer Dienst, jährlich eine Zeile pflegen |
| Hosting | Vercel | Nulldeployment-Aufwand |
| Analytics | Plausible oder PostHog (self-hosted) | DSGVO-freundlich, Funnel für Erfassungs-Flow |

**PWA-Einschränkungen, die im Design berücksichtigt sind:**
- Web Push funktioniert auf iOS erst ab iOS 16.4 und nur bei installierter PWA → deshalb sind Push-Benachrichtigungen kein v1-Feature
- Kamera-Zugriff funktioniert über `<input type="file" capture>` zuverlässig auf beiden Plattformen
- Hintergrund-Geolocation gibt es nicht → alle Standortabfragen passieren im Vordergrund
- Ein Installations-Hinweis („Zum Home-Bildschirm hinzufügen") sollte nach dem zweiten Besuch erscheinen

**Code-Regel für die Erweiterbarkeit:** Kategoriespezifische Texte („Baustelle", „Fahrzeuge", „Arbeitszeiten", Sicherheitshinweis) werden **ausschließlich aus `place_categories` gelesen**, nie im Frontend hartkodiert. Das ist die einzige laufende Disziplin, die die spätere Erweiterung sichert — und sie kostet im Alltag praktisch nichts.

---

## 11. Cold Start: Der Startplan für München

**Ziel bis Launch: 200+ Baustellen auf der Karte, davon 30+ mit Foto.**

### Phase 1 — Open-Data-Seed (Basis, unbestätigt)
- Quellen prüfen: Open-Data-Portal der Stadt München, Bayerische Baustelleninformationen, Mobilithek/MDM (Straßenbaustellen-Meldungen als DATEX II)
- Import als `source = open_data`, Status „unbestätigt"
- **Diese Orte sehen in der App bewusst anders aus:** Grauer Marker, Label „Noch nicht bestätigt — warst du dort?", kein Foto. Sie sind Einladungen zum Beitragen, keine fertigen Einträge.
- Ein Nutzer-Check-in „adoptiert" den Eintrag und macht ihn vollwertig
- Wo die Quelle Arbeitszeiten oder Bauzeiträume liefert, direkt in `place_hours` bzw. `external_end_at` übernehmen
- Rechtliche Prüfung der Lizenz je Quelle (i. d. R. DL-DE-BY-2.0 oder CC-BY, Attribution nötig)

### Phase 2 — Manuelle Erfassung (Qualitäts-Kern)
- 30–50 Baustellen in gut besuchten Münchner Vierteln persönlich erfassen: mit Foto, Fahrzeugen, Arbeitszeiten, Notiz („Bank gegenüber, gut zum Zuschauen")
- Bevorzugt Großbaustellen mit Turmdrehkränen — hoher Wow-Faktor, lange Laufzeit, langsamer Confidence-Zerfall

### Phase 3 — Seed-Nutzer
- 20–30 Familien über Kitas, Elternforen, lokale Facebook-/WhatsApp-Gruppen, Münchner Eltern-Blogs
- Ziel: erste 100 organische Check-ins, damit Confidence-System und Aktivitäts-Histogramm überhaupt Signale bekommen

**Abbruchkriterium:** Wenn nach 8 Wochen ab Launch weniger als 20 % der Orte einen nutzergenerierten Check-in haben, funktioniert das Crowdsourcing-Modell in dieser Form nicht — dann Pivot zu stärker kuratiertem Content.

---

## 12. Sicherheit, Datenschutz, Recht (grober Rahmen — Detailklärung später)

> Dieses Kapitel ist bewusst als Übersicht offener Punkte gehalten, nicht als abschließende rechtliche Bewertung. Vor Launch mit Anwalt/Datenschutzbeauftragtem prüfen.

**Physische Sicherheit**
- Nicht wegklickbarer Hinweis auf jeder Detailseite (Text aus `place_categories.safety_notice`): Baustellen nicht betreten, nur von außerhalb der Absperrung, Kinder an der Hand, Warnwesten-Empfehlung
- Einmaliger Sicherheits-Screen im Onboarding, aktiv zu bestätigen
- Keine Orte auf erkennbar privatem oder gesperrtem Gelände (Meldegrund)

**Fotos & Personendaten**
- Upload-Regeln in den Nutzungsbedingungen: keine erkennbaren Personen, keine Kfz-Kennzeichen, keine Kinder
- **EXIF-Daten werden nach dem Auslesen der Koordinaten serverseitig entfernt**, bevor das Foto gespeichert wird
- Melde- und Löschprozess für Fotos, Reaktion innerhalb von 48 h
- *Offen:* automatische Unkenntlichmachung von Gesichtern/Kennzeichen (Post-MVP, evtl. mit Cloud-Vision-API)

**Standortdaten**
- Standort wird nur im Vordergrund und nur bei aktiver Nutzung abgefragt
- Check-in-Koordinaten werden nur zur Verifikation gespeichert, nicht öffentlich ausgespielt
- Bewegungsprofile werden nicht erstellt und nicht ausgewertet
- Check-in-Zähler und **Aktivitäts-Histogramm** sind aggregiert und enthalten keinen Nutzerbezug — keine Endpunkte, die Rückschlüsse auf Einzelnutzer erlauben. *Bei sehr wenigen Check-ins könnte ein Histogramm theoretisch auf eine Einzelperson zurückführen — deshalb Anzeige erst ab 8 Check-ins.*

**Kinder**
- Die App richtet sich an Eltern, nicht an Kinder. Kein Konto für Kinder, keine Kinderdaten, keine Kommunikationsfunktionen
- Altersgrenze 16+ (bzw. 18+) für Konten in den AGB

**Sonstiges (offene Punkte)**
- Nutzungsrechte an UGC: Lizenz vom Nutzer einholen, die eine spätere Datenweitergabe/-nutzung ermöglicht — **jetzt sauber formulieren, auch wenn B2B erst später kommt.** Nachträglich ist das kaum einholbar. Die Lizenzformulierung sollte **nicht auf Baustellen beschränkt** sein, sondern „ortsbezogene Beiträge" abdecken.
- Haftungsausschluss für die Richtigkeit von Orts-, Fahrzeug- **und Zeitangaben**
- Impressum, Datenschutzerklärung, AGB, Cookie-/Analytics-Consent
- Prüfen: DSA-Pflichten für nutzergenerierte Inhalte (Melde- und Abhilfeverfahren)

---

## 13. Ausblick: Was später möglich wird (nicht v1)

### 13.1 Weitere Ortskategorien — der geplante Erweiterungspfad

Die Architektur aus Kapitel 5 macht eine neue Kategorie zu einer Datenmigration plus Katalogpflege, nicht zu einem Umbau. Kandidaten, grob nach Aufwand sortiert:

| Kategorie | Merkmale | Besonderheit | Aufwand |
|---|---|---|---|
| **Spielplatz** | Rutsche, Schaukel, Seilbahn, Wasserspiel, Kletterturm, Sandkasten, Wippe | Merkmale sind `permanent` — kein Zerfall; Wasserspiel saisonal | gering |
| **Tiere & Weiden** | Kühe, Ziegen, Pferde, Alpakas, Hühner | Saisonal/zeitabhängig; Zerfall in Wochen | gering |
| **Fahrzeuge & Technik** | Feuerwache, Bahnübergang, Straßenbahndepot, Schleuse, Flugplatz | fast alles `permanent`, Aktivitätszeiten wichtiger als Merkmale | mittel |
| **Saisonales** | Weihnachtsmarkt, Volksfest, Zirkus | Ort mit definiertem Anfang und Ende | mittel |

**Warum Spielplätze der beste zweite Schritt sind:** dieselbe Zielgruppe, derselbe Nutzungsmoment („was machen wir in der nächsten Stunde?"), und sie lösen das Wetterproblem der Baustellen-App (am Wochenende ist keine Baustelle aktiv — der Spielplatz schon). Zusätzlich entsteht eine natürliche Verknüpfung: *„Baustelle Leopoldstraße — Spielplatz 200 m entfernt."* Das ist ein echter Mehrwert und kein reines Feature-Stacking.

**Bedingung für den Schritt:** Erst wenn Baustellen in München nachweislich funktionieren (Nordstern-Metriken erreicht). Eine zweite Kategorie in einer noch leeren App verdoppelt nur die Leere.

### 13.2 Weitere Richtungen

| Richtung | Idee |
|---|---|
| **B2B-Daten** | API/Dashboard für Städte und Routing-Anbieter: bestätigte Baustellen, tatsächliche Aktivität, faktisches Ende. Der Unique Value ist die **Bestätigung durch Menschen vor Ort** — genau das, was offizielle Daten nicht haben. Das Aktivitäts-Histogramm ist dabei der wertvollste Datensatz überhaupt: *wann wird auf dieser Baustelle tatsächlich gearbeitet.* |
| **Gamification** | Bingo-Karten, Wochen-Missionen, Seltenheitsstufen, Erstentdecker-Badges, Sammelalbum als Druck-Bestellung |
| **Familienprofile** | Mehrere Kinder mit eigener Sammlung |
| **Native Apps** | Wenn Push und bessere Kamera-Integration den Ausschlag geben |
| **Lokale Kooperationen** | Bauunternehmen, Baumaschinenhändler, Stadtmarketing, Kitas — Sponsoring statt Nutzerzahlungen |
| **Content** | „Baustelle des Monats", Fahrzeug-Steckbriefe als eigenständiger Kinder-Content, Kooperation mit Kinderbuchverlagen |
| **Weitere Städte** | Skalierung erst, wenn München nachweislich funktioniert |

---

## 14. Roadmap (Solo + KI, realistisch)

| Phase | Dauer | Inhalt | Ergebnis |
|---|---|---|---|
| **0 — Fundament** | 1,5–2 Wochen | Next.js + Supabase Setup, **generisches Datenmodell inkl. `place_categories`**, Auth, Merkmalskatalog befüllen (~24 Typen inkl. Texten/Icons), `observable_confidence()` + Unit-Tests | Deploy-fähiges Grundgerüst |
| **1 — Sehen** | 2 Wochen | Karte mit MapLibre, Cluster, Detailseite, Confidence-Anzeige, Filter, Route-Deep-Link, kategoriegetriebene Texte | Man kann Baustellen finden (mit Testdaten) |
| **2 — Beitragen** | 2–3 Wochen | Erfassungs-Flow, Foto-Upload + EXIF, Duplikat-Check, Check-in mit Geofence, Merkmals-Chips, Negativ-Signal-Logik | Das System lebt — Daten aktualisieren sich selbst |
| **3 — Zeiten** | 0,5–1 Woche | `place_hours` inkl. Presets, Aktivitäts-Histogramm aus Check-ins, Badge-Logik, Feiertagsliste, Filter „jetzt aktiv" | „Lohnt sich der Weg jetzt?" ist beantwortet |
| **4 — Sammeln** | 1–2 Wochen | Sammelalbum, Freischalt-Animation, Fortschritt, Onboarding, Sicherheits-Screen | Der Wiederkehr-Grund existiert |
| **5 — Füllen** | 1–2 Wochen | Open-Data-Import München, Admin-/Moderationsansicht, 30–50 Orte persönlich erfassen, Rechtstexte | Karte ist nicht leer |
| **6 — Beta** | 2 Wochen | 20–30 Seed-Familien, Analytics auswerten, Erfassungs-Funnel optimieren, Halbwertszeiten kalibrieren | Erste echte Daten, Entscheidung über Launch |

**Gesamt: ca. 11–14 Wochen bei Teilzeit-Solo-Arbeit.** *(v0.1 lag bei 10–13 Wochen; die Generalisierung kostet ca. 2 Tage, die Arbeitszeiten ca. 4 Tage.)*

---

## 15. Größte Risiken

| Risiko | Schwere | Gegenmaßnahme |
|---|---|---|
| **Zu wenige Beiträge — die Karte bleibt tot** | Hoch | Open-Data-Seed, persönliche Erfassung, extrem kurzer Check-in-Flow, Sammelalbum als Anreiz. Abbruchkriterium in Kap. 11 definiert. |
| **Baustellen sind langweiliger als erhofft** (kein Fahrzeug arbeitet gerade) | Hoch | Genau dafür existiert das Arbeitszeiten-System (Kap. 6.5). Zusätzlich: Notizfeld für Beobachtungstipps, Fokus auf Großbaustellen. Mittelfristig ist der Spielplatz-Ausbau die strukturelle Antwort auf „Wochenende + Regen". |
| **Falsche „jetzt aktiv"-Zusage** enttäuscht Familien | Mittel | Durchgehend Konjunktiv-Formulierung, Anzeige erst ab belastbarer Datenlage, Beobachtung schlägt Angabe |
| **Confidence-Parameter falsch kalibriert** | Mittel | Halbwertszeiten als Konfigurationswerte in der DB, nicht im Code — nach den ersten 500 Check-ins mit echten Daten nachjustieren (Epic F) |
| **Übergeneralisierung bremst v1 aus** | Mittel | Harte Grenze: nur Datenmodell und Textquellen sind generisch. Keine Kategorie-Admin-UI, kein Kategoriewechsler, keine abstrakten Layouts in v1. |
| **Sicherheitsvorfall an einer Baustelle** | Mittel, aber existenzbedrohend | Prominente, nicht wegklickbare Hinweise; keine Navigation auf Gelände; klarer Haftungsausschluss; anwaltliche Prüfung vor Launch |
| **Problematische Foto-Uploads** (Kinder, Personen, Kennzeichen) | Mittel | Klare Upload-Regeln, Melde-Button überall, 48-h-Reaktionszeit, ggf. Freigabe erster Uploads neuer Nutzer |
| **EXIF-Geodaten funktionieren praktisch kaum** | Niedrig | Ist eingeplant: Gerätestandort ist der Standardpfad, EXIF nur Bonus |
| **Saisonalität** (Winter, Schlechtwetter) | Niedrig | Bewusst einkalkulieren; Launch idealerweise im Frühjahr |

---

## 16. Offene Fragen

1. Welche Münchner Open-Data-Quelle liefert tatsächlich brauchbare Baustellendaten mit Koordinaten, Enddatum und idealerweise Bauzeiten — und unter welcher Lizenz? *(Vor Phase 5 verbindlich klären.)*
2. Sollen Open-Data-Orte ohne jeden Nutzer-Check-in dauerhaft sichtbar bleiben, oder nach X Tagen ohne Bestätigung automatisch verschwinden?
3. Wie granular soll der Merkmalskatalog sein? Unterscheiden Kinder zwischen Kettenbagger und Mobilbagger — oder ist „Bagger" die richtige Ebene? *(Empfehlung: grobe Typen im Album über `group_name`, feine Typen als Unterkategorie später.)*
4. Reicht **ein** Zeitfenster pro Tag, oder braucht es Mittagspausen? *(Empfehlung: v1 ein Fenster; die Beobachtungsdaten zeigen nach ein paar Monaten, ob eine Mittagslücke real messbar ist.)*
5. **Name und Marke.** „Baustellenjäger" ist gut für v1, blockiert aber genau den Erweiterungspfad aus 13.1 — ein Spielplatz passt nicht unter diesen Namen. Zu entscheiden: bewusst baustellenspezifisch starten und später umbenennen (Risiko: Markenverlust), oder von Anfang an ein Dach wählen, unter dem beides Platz hat (Risiko: unschärferes Versprechen im Cold Start). *Empfehlung: neutraler Dachname mit baustellenspezifischem Claim, z. B. „<Name> — die Baustellenkarte für Familien".*

---

*Ende des Dokuments.*
