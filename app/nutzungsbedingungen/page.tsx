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
        <h6>Geltungsbereich</h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Leistungsbeschreibung
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Registrierung und Nutzerkonto
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>Pflichten der Nutzer</h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Nutzergenerierte Inhalte und Rechteeinräumung
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Haftungsausschluss und Sicherheitshinweis
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Sperrung und Kündigung
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Änderungen dieser Bedingungen
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h6>
          Anwendbares Recht und Gerichtsstand
        </h6>
        <p className="mt-1 text-sm text-muted">{PLATZHALTER}</p>
      </section>
    </main>
  );
}
