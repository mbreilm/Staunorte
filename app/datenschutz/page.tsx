const PLATZHALTER = "[Platzhalter – Inhalt folgt vom Anwalt]";

export default function DatenschutzSeite() {
  return (
    <main className="flex-1 px-6 py-6 pb-10">
      <h1 className="text-lg font-bold text-zinc-900">Datenschutzerklärung</h1>
      <p className="mt-1 text-xs text-zinc-400">
        Diese Seite ist ein Platzhalter mit der laut Art. 13/14 DSGVO nötigen
        Struktur. Die Inhalte fehlen noch.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-900">Verantwortlicher</h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          Erhobene Daten und Zwecke der Verarbeitung
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">Rechtsgrundlagen</h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          Empfänger und Auftragsverarbeiter
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {PLATZHALTER} Dazu zählen u. a. Supabase (Hosting, Datenbank,
          Authentifizierung, Speicher) und, bei erteilter Einwilligung,
          Plausible Analytics (Reichweitenmessung ohne Cookies und ohne
          personenbezogene Daten).
        </p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          Übermittlung in Drittländer
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">Speicherdauer</h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          Rechte der betroffenen Person
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          Beschwerderecht bei einer Aufsichtsbehörde
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          Cookies und Analyse
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          Standortdaten und Fotos
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>
    </main>
  );
}
