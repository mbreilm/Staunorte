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
        <h6>Verantwortlicher</h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Erhobene Daten und Zwecke der Verarbeitung
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>Rechtsgrundlagen</h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Empfänger und Auftragsverarbeiter
        </h6>
        <p className="mt-1 text-sm text-muted">
          {PLATZHALTER} Dazu zählen u. a. Supabase (Hosting, Datenbank,
          Authentifizierung, Speicher) und, bei erteilter Einwilligung,
          Plausible Analytics (Reichweitenmessung ohne Cookies und ohne
          personenbezogene Daten).
        </p>
      </section>

      <section className="mt-5">
        <h6>
          Übermittlung in Drittländer
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>Speicherdauer</h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Rechte der betroffenen Person
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Beschwerderecht bei einer Aufsichtsbehörde
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Cookies und Analyse
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Standortdaten und Fotos
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>
    </main>
  );
}
