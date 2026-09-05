// Temporäre Übersichtsseite zur Abnahme des Icon-Systems
// (docs/DESIGN-ICONS.md, Abschnitt 7). Nach der Abnahme löschen.
import {
  IconCheckin,
  IconFrisch,
  IconVeraltet,
  IconAlbum,
  IconFreischaltung,
  IconArbeitszeiten,
  IconSicherheitshinweis,
  IconBauhelm,
  IconAbsperrung,
  IconFotoAufnehmen,
  IconFotoHinzufuegen,
  IconFilterIcon,
  IconSuche,
  IconRoute,
  IconMelden,
  IconKonto,
  IconAnmelden,
  IconEinstellungen,
  GROUP_ICONS,
} from "@/lib/icons";

const GRUPPEN_ICONS = Object.entries(GROUP_ICONS);

const UI_ICONS: [string, (typeof GROUP_ICONS)[string]][] = [
  ["Check-in", IconCheckin],
  ["Jetzt hier", IconFrisch],
  ["Zuletzt gesehen", IconVeraltet],
  ["Sammelalbum", IconAlbum],
  ["Freischaltung", IconFreischaltung],
  ["Arbeitszeiten", IconArbeitszeiten],
  ["Sicherheitshinweis", IconSicherheitshinweis],
  ["Bauhelm", IconBauhelm],
  ["Absperrung", IconAbsperrung],
  ["Foto aufnehmen", IconFotoAufnehmen],
  ["Foto hinzufügen", IconFotoHinzufuegen],
  ["Filter", IconFilterIcon],
  ["Suche", IconSuche],
  ["Route öffnen", IconRoute],
  ["Melden", IconMelden],
  ["Konto", IconKonto],
  ["Anmelden", IconAnmelden],
  ["Einstellungen", IconEinstellungen],
];

function IconZeile({
  name,
  Icon,
  farbe,
}: {
  name: string;
  Icon: (typeof GROUP_ICONS)[string];
  farbe: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 4px",
        color: farbe,
      }}
    >
      <Icon size={24} />
      <Icon size={48} />
      <span style={{ fontFamily: "sans-serif", fontSize: 13, opacity: 0.85 }}>
        {name}
      </span>
    </div>
  );
}

function Abschnitt({
  titel,
  hintergrund,
  farbe,
}: {
  titel: string;
  hintergrund: string;
  farbe: string;
}) {
  return (
    <div style={{ background: hintergrund, padding: 24, color: farbe }}>
      <h2 style={{ fontFamily: "sans-serif", fontSize: 16, marginBottom: 4 }}>{titel}</h2>
      <p
        style={{
          fontFamily: "sans-serif",
          fontSize: 12,
          opacity: 0.7,
          marginBottom: 16,
        }}
      >
        Icon-Farbe: {farbe}
      </p>

      <h3 style={{ fontFamily: "sans-serif", fontSize: 13, opacity: 0.7, marginBottom: 4 }}>
        Gruppen-Icons (3 davon Eigenbau: Beton, Straßenbau, Spezial)
      </h3>
      {GRUPPEN_ICONS.map(([name, Icon]) => (
        <IconZeile key={name} name={name} Icon={Icon} farbe={farbe} />
      ))}

      <h3
        style={{
          fontFamily: "sans-serif",
          fontSize: 13,
          opacity: 0.7,
          marginTop: 20,
          marginBottom: 4,
        }}
      >
        UI-Icons
      </h3>
      {UI_ICONS.map(([name, Icon]) => (
        <IconZeile key={name} name={name} Icon={Icon} farbe={farbe} />
      ))}
    </div>
  );
}

export default function IconUebersicht() {
  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontFamily: "sans-serif",
          padding: "16px 24px 0",
          fontSize: 13,
          color: "#645c50",
        }}
      >
        Temporäre Übersichtsseite (docs/DESIGN-ICONS.md) - nach Abnahme löschen.
        Je Icon: 24px, 48px, Name.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: 0,
        }}
      >
        <Abschnitt titel="Hell" hintergrund="#E8EDF2" farbe="#1B2A3A" />
        <Abschnitt titel="Dunkel" hintergrund="#1B2A3A" farbe="#E8EDF2" />
      </div>
    </main>
  );
}
