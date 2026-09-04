const PLATZHALTER = "[Platzhalter – Inhalt folgt vom Anwalt]";

export default function ImpressumSeite() {
  return (
    <main className="flex-1 px-6 py-6 pb-10">
      <h1 className="text-lg font-bold text-zinc-900">Impressum</h1>
      <p className="mt-1 text-xs text-zinc-400">
        Diese Seite ist ein Platzhalter mit der laut § 5 TMG / § 18 MStV
        nötigen Struktur. Die Inhalte fehlen noch.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-900">Diensteanbieter</h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          Vertretungsberechtigte Person
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">Kontakt</h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">Registereintrag</h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          Umsatzsteuer-Identifikationsnummer
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          Inhaltlich verantwortlich (§ 18 Abs. 2 MStV)
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-zinc-900">Streitschlichtung</h2>
        <p className="mt-1 text-sm text-zinc-600">{PLATZHALTER}</p>
      </section>
    </main>
  );
}
