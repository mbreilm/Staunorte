const PLATZHALTER = "[Platzhalter – Inhalt folgt vom Anwalt]";

export default function ImpressumSeite() {
  return (
    <main className="flex-1 px-6 py-6 pb-10">
      <h1 className="text-lg">Impressum</h1>
      <p className="mt-1 text-xs text-muted">
        Diese Seite ist ein Platzhalter mit der laut § 5 TMG / § 18 MStV
        nötigen Struktur. Die Inhalte fehlen noch.
      </p>

      <section className="mt-6">
        <h2 className="card-kicker">Diensteanbieter</h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Vertretungsberechtigte Person
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">Kontakt</h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">Registereintrag</h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Umsatzsteuer-Identifikationsnummer
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Inhaltlich verantwortlich (§ 18 Abs. 2 MStV)
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">Streitschlichtung</h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>
    </main>
  );
}
