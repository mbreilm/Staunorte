const PLATZHALTER = "[Platzhalter – Inhalt folgt vom Anwalt]";

export default function NutzungsbedingungenSeite() {
  return (
    <main className="flex-1 px-6 py-6 pb-10">
      <h1 className="text-lg">Nutzungsbedingungen</h1>
      <p className="mt-1 text-xs text-muted">
        Diese Seite ist ein Platzhalter mit der üblichen Struktur für
        Nutzungsbedingungen. Die Inhalte fehlen noch.
      </p>

      <section className="mt-6">
        <h2 className="card-kicker">Geltungsbereich</h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Leistungsbeschreibung
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Registrierung und Nutzerkonto
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">Pflichten der Nutzer</h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Nutzergenerierte Inhalte und Rechteeinräumung
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Haftungsausschluss und Sicherheitshinweis
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Sperrung und Kündigung
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Änderungen dieser Bedingungen
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="card-kicker">
          Anwendbares Recht und Gerichtsstand
        </h2>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>
    </main>
  );
}
