# Baustellenjäger — Startpaket

Alles, was du zum Loslegen brauchst. Reihenfolge:

1. **`docs/UMSETZUNG.md`** ← hier anfangen. Schritt-für-Schritt-Anleitung
   von der Installation bis zur ersten laufenden App.
2. **`docs/TICKETS.md`** — die Aufgaben in der richtigen Reihenfolge,
   jede mit fertigem Prompt zum Kopieren.
3. **`docs/PRD.md`** — das vollständige Produktkonzept. Nachschlagewerk,
   kein Muss zum Start.

## Inhalt

```
CLAUDE.md                      Projektkontext für Claude Code (nicht löschen)
.env.example                   Vorlage für deine Zugangsdaten
docs/UMSETZUNG.md              Anleitung
docs/TICKETS.md                Aufgabenliste mit Prompts
docs/PRD.md                    Produktkonzept
supabase/migrations/           Datenbank — in dieser Reihenfolge ausführen
  0001_schema.sql                Tabellen
  0002_functions.sql             Kern-Logik (Confidence, Check-in, Karte)
  0003_rls.sql                   Sicherheitsregeln
  0004_seed_katalog.sql          29 Fahrzeuge + Feiertage Bayern
supabase/tests/test_logik.sql  Funktionstest (nur lokal, nicht auf Supabase)
```

Die Migrationen sind gegen eine echte PostgreSQL-16-Datenbank mit PostGIS
getestet: Confidence-Zerfall, implizite Negativsignale, Geofence,
Duplikatschutz, Sammelalbum und Arbeitszeiten-Logik funktionieren.
