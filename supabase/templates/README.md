# E-Mail-Vorlagen

Die Anmeldung läuft über einen Link per E-Mail (`signInWithOtp()` in
`components/AuthForm.tsx`). Diese Mails verschickt **Supabase**, nicht die
App — das Aussehen wird deshalb nicht hier im Code bestimmt, sondern im
Supabase-Dashboard. Die Dateien in diesem Ordner sind die Quelle dafür:
Sie liegen im Repo, damit Änderungen nachvollziehbar bleiben, und werden
von Hand ins Dashboard kopiert.

## Zwei Vorlagen, ein Knopf

Der eine Knopf „Anmelde-Link zuschicken" löst je nach Empfänger eine von
zwei Supabase-Vorlagen aus. Deshalb müssen immer **beide** gepflegt werden,
sonst sieht die Mail je nach Person unterschiedlich aus:

| Datei | Supabase-Vorlage | Wer bekommt sie |
|---|---|---|
| `anmelde-link.html` | **Magic Link** | Adresse ist schon bekannt |
| `registrierung-bestaetigen.html` | **Confirm signup** | Adresse meldet sich zum ersten Mal an |

E-Mail-HTML kennt keine gemeinsamen Bausteine, die beiden Dateien sind
deshalb fast identisch. Wer am Aussehen etwas ändert, muss es in beiden tun.

## Voraussetzung: eigenes SMTP

Seit Juni 2026 lassen sich die Vorlagen mit Supabases eingebautem Versand
gar nicht mehr bearbeiten — und wichtiger noch: Der eingebaute Versand
liefert ausschließlich an Adressen aus dem Projekt-Team aus. Ohne eigenes
SMTP kann sich also niemand außer dem Team anmelden.

Versendet wird deshalb über **Resend**, die Domain `baustellenjaeger.com`
ist dort verifiziert (DKIM auf `resend._domainkey`, SPF und MX auf der
Subdomain `send.`; die DNS-Einträge liegen bei IONOS). Der freie Tarif
deckt 3.000 Mails im Monat bzw. 100 am Tag ab.

Supabase-Dashboard → **Project Settings** → **Authentication** →
**SMTP Settings**:

| Feld | Wert |
|---|---|
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` (wörtlich, kein Platzhalter) |
| Password | der Resend-API-Key (`re_…`) |
| Sender email | `hallo@baustellenjaeger.com` |
| Sender name | `Baustellenjäger` |

Das IONOS-Postfach bleibt davon unberührt: Resend verschickt nur, eingehende
Post an `hallo@` landet weiter über die MX-Einträge bei IONOS. Deshalb als
Absender bewusst eine Adresse, auf die man auch antworten kann.

Unter **Authentication → Rate Limits** steht *Rate limit for sending emails*,
seit dem 15.09.2026 auf **100 pro Stunde** (vorher der niedrige Standardwert
aus der Zeit des eingebauten Versands).

Die tatsächliche Obergrenze liegt damit nicht mehr hier, sondern bei Resend:
**100 Mails pro UTC-Kalendertag** im Gratistarif, Rückstellung um Mitternacht
UTC (also 1 bzw. 2 Uhr deutscher Zeit) — kein gleitendes Fenster. Ein
Andrang könnte das Tageskontingent theoretisch in einer einzigen Stunde
aufbrauchen; danach lehnt Resend mit 429 `daily_quota_exceeded` ab, bis der
UTC-Tag wechselt. Die App fängt das ab und sagt „zu viele Anmelde-Links
angefordert" statt die E-Mail-Adresse zu verdächtigen (siehe
`anmeldeFehlerText()` in `components/AuthForm.tsx`).

Unabhängig davon bleibt eine Wartezeit pro Adresse bestehen, die verhindert,
dass eine einzelne Person durch wiederholtes Antippen Mails am laufenden
Band auslöst.

## Einspielen

Supabase-Dashboard → **Authentication** → **Emails** → **Templates**, dann
je Vorlage:

1. Links die Vorlage wählen (*Magic Link* bzw. *Confirm signup*).
2. **Subject heading** setzen:
   - Magic Link: `Dein Anmelde-Link für Baustellenjäger`
   - Confirm signup: `Willkommen bei Baustellenjäger – bitte E-Mail bestätigen`
3. **Message body**: den kompletten Inhalt der jeweiligen Datei einfügen
   (den HTML-Kommentar oben darf man drinlassen, er wird nicht angezeigt).
4. Speichern und einmal zur Probe an die eigene Adresse anmelden.

Ein reiner Textteil lässt sich im Dashboard nicht getrennt hinterlegen —
Supabase kennt dort nur Betreff und HTML.

## Platzhalter

Supabase ersetzt beim Versand:

- `{{ .SiteURL }}` — die in *URL Configuration* eingetragene Adresse.
- `{{ .TokenHash }}` — der Nachweis, mit dem `app/auth/callback/route.ts`
  die Anmeldung einlöst.
- `{{ .Email }}` — die Empfängeradresse, unten im Fuß.

Zusammen ergeben die ersten beiden den Link, der zweimal in jeder Vorlage
steckt (im Knopf und als kopierbare Adresse darunter):

    {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&next=%2F

In `registrierung-bestaetigen.html` steht dort `type=signup` statt
`magiclink` — der Typ muss zur Vorlage passen, sonst weist Supabase den
Nachweis ab.

**Warum nicht `{{ .ConfirmationURL }}`,** was überall in Beispielen steht:
Der Weg führt über Supabases eigene `/auth/v1/verify`-Adresse, und die gibt
die Zugangsdaten im URL-Fragment zurück (`…#access_token=…`). Fragmente
schickt der Browser niemals an den Server — unsere Callback-Route ist eine
Server-Route und sieht davon nichts. Die Anmeldung schlug damit immer fehl.
Der Weg über `token_hash` hat zusätzlich den Vorteil, dass der Link auch
dann funktioniert, wenn die Mail auf einem anderen Gerät geöffnet wird als
dem, auf dem sie angefordert wurde.

## Abhängigkeiten außerhalb dieser Dateien

- **Das Logo** wird als Bild von `https://baustellenjaeger.com/icons/logo-mail.png`
  geladen. Anhängen kann Supabase nichts, das Bild muss also öffentlich
  erreichbar bleiben. Ändert sich die Domain, müssen die Adressen in beiden
  Dateien (Logo, Impressum, Datenschutz) mit.
  Die Vorlage dazu liegt unter `assets/logo-baustellenjaeger.jpeg` (bewusst
  außerhalb von `public/`, damit die unbeschnittene Fassung nicht mit
  ausgeliefert wird). Daraus entstehen durch Freistellen des weißen Rands
  und Skalieren: `public/icons/logo-mail.png` (420 px, auf der Kartenfarbe
  `#fdf8ef`) sowie die Homescreen-Icons `icon-192.png` und `icon-512.png`
  (quadratisch, auf `#f5ead8`, Logo auf 76 % Breite — der Rand ist nötig,
  weil Android `maskable`-Icons rund zuschneidet).
- **„Der Link gilt eine Stunde"** entspricht der Supabase-Einstellung
  *Email OTP Expiration* (Standard 3600 s). Wird die geändert, den Satz in
  beiden Dateien mitziehen.
- **Der Absender** kommt aus den SMTP-Einstellungen, nicht aus diesen
  Dateien (siehe oben).

## Farben

Bewusst fest eingetragen statt über CSS-Variablen — E-Mail-Programme können
die nicht. Die Werte stammen aus `app/globals.css`:

| Zweck | Wert |
|---|---|
| Hintergrund | `#f5ead8` |
| Karte | `#fdf8ef` |
| Linien | `#dcd3c4` |
| Text | `#201e1d` / `#474238` |
| Nebentext | `#82796a` / `#a19786` |
| Knopf | `#c67139` |
