const PLATZHALTER = "[Platzhalter – Inhalt folgt vom Anwalt]";

export default function DatenschutzSeite() {
  return (
    <main className="flex-1 px-6 py-6 pb-10">
      <h1 className="text-lg">Datenschutzerklärung</h1>
      <p className="mt-1 text-xs text-muted">
        Diese Seite ist ein Platzhalter mit der laut Art. 13/14 DSGVO nötigen
        Struktur. Die Inhalte fehlen noch.
      </p>

      <section className="mt-6">
        <h2 className="card-kicker">Verantwortlicher</h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Erhobene Daten und Zwecke der Verarbeitung
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">Rechtsgrundlagen</h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Empfänger und Auftragsverarbeiter
        </h2>
        <p className="mt-1 text-sm text-muted">
          {PLATZHALTER} Dazu zählen u. a. Supabase (Hosting, Datenbank,
          Authentifizierung, Speicher) und, bei erteilter Einwilligung,
          Plausible Analytics (Reichweitenmessung ohne Cookies und ohne
          personenbezogene Daten).
        </p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Übermittlung in Drittländer
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">Speicherdauer</h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Rechte der betroffenen Person
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Beschwerderecht bei einer Aufsichtsbehörde
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Cookies und Analyse
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Standortdaten und Fotos
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>
    </main>
  );
}
