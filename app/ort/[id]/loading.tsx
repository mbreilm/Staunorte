/**
 * Gerüst, das sofort erscheint, während die Detailseite ihre Daten holt.
 *
 * Die Seite wird auf dem Server gerendert und braucht dafür mehrere
 * Datenbankabfragen. Ohne diese Datei passiert beim Antippen von "Details"
 * sichtbar nichts, bis alles fertig ist - die App wirkt hängengeblieben.
 * Mit dem Gerüst ist der Wechsel sofort sichtbar und die Inhalte füllen
 * sich nach.
 *
 * Bewusst dieselben Abmessungen wie die echte Seite (Fotohöhe h-56,
 * Abstände px-6 pt-5), damit beim Umschalten nichts springt.
 */
export default function Laedt() {
  return (
    <main className="flex-1 pb-10" aria-busy="true" aria-label="Ort wird geladen">
      <div className="h-56 w-full animate-pulse" style={{ background: "var(--color-surface)" }} />

      <div className="px-6 pt-5">
        <Balken breite="7rem" hoehe="1.5rem" />
        <div className="mt-3">
          <Balken breite="80%" hoehe="1.75rem" />
        </div>
        <div className="mt-2">
          <Balken breite="55%" hoehe="0.9rem" />
        </div>

        <div className="mt-6 flex gap-2">
          <Balken breite="50%" hoehe="3rem" radius="var(--radius-lg)" />
          <Balken breite="50%" hoehe="3rem" radius="var(--radius-lg)" />
        </div>

        <div className="mt-7 flex flex-col gap-2">
          <Balken breite="6rem" hoehe="0.8rem" />
          {[0, 1, 2].map((i) => (
            <Balken key={i} breite="100%" hoehe="3.5rem" radius="var(--radius-md)" />
          ))}
        </div>
      </div>
    </main>
  );
}

function Balken({
  breite,
  hoehe,
  radius = "var(--radius-sm)",
}: {
  breite: string;
  hoehe: string;
  radius?: string;
}) {
  return (
    <div
      className="animate-pulse"
      style={{
        width: breite,
        height: hoehe,
        borderRadius: radius,
        background: "var(--color-surface)",
      }}
    />
  );
}
