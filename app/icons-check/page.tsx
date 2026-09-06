// Temporäre Vergleichsseite: die drei Eigenbau-Icons direkt neben echten
// Tabler-Icons, in beiden Größen und auf hellem wie dunklem Grund. Dient nur
// der Abnahme des Zeichenstils - nach der Abnahme löschen.
import type { ComponentType } from "react";
import {
  IconBackhoe,
  IconBulldozer,
  IconCrane,
  IconTruck,
  IconContainer,
  type IconProps,
} from "@tabler/icons-react";
import { IconBeton, IconStrassenbau, IconSpezial } from "@/components/icons/GroupIcons";

type Eintrag = [name: string, Icon: ComponentType<IconProps>];

const TABLER: Eintrag[] = [
  ["backhoe", IconBackhoe],
  ["bulldozer", IconBulldozer],
  ["crane", IconCrane],
  ["truck", IconTruck],
  ["container", IconContainer],
];

const EIGENBAU: Eintrag[] = [
  ["beton", IconBeton],
  ["strassenbau", IconStrassenbau],
  ["spezial", IconSpezial],
];

function Zelle({ name, Icon }: { name: string; Icon: ComponentType<IconProps> }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        minWidth: 72,
      }}
    >
      <Icon size={48} />
      <Icon size={24} />
      <span style={{ fontSize: 11, opacity: 0.6 }}>{name}</span>
    </div>
  );
}

function Reihe({ titel, eintraege }: { titel: string; eintraege: Eintrag[] }) {
  return (
    <>
      <h3 style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, margin: "24px 0 12px" }}>
        {titel}
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-end" }}>
        {eintraege.map(([name, Icon]) => (
          <Zelle key={name} name={name} Icon={Icon} />
        ))}
      </div>
    </>
  );
}

function Tafel({
  titel,
  hintergrund,
  farbe,
}: {
  titel: string;
  hintergrund: string;
  farbe: string;
}) {
  return (
    <section
      style={{
        background: hintergrund,
        color: farbe,
        padding: 24,
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2 style={{ fontSize: 14, margin: 0 }}>{titel}</h2>

      <Reihe titel="Tabler" eintraege={TABLER} />
      <Reihe titel="Eigenbau" eintraege={EIGENBAU} />

      <h3 style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, margin: "24px 0 12px" }}>
        Gemischt (fällt eines aus der Reihe?)
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-end" }}>
        {[TABLER[0], EIGENBAU[0], TABLER[1], EIGENBAU[1], TABLER[3], EIGENBAU[2], TABLER[4]].map(
          ([name, Icon], i) => (
            <Zelle key={`${name}-${i}`} name={name} Icon={Icon} />
          ),
        )}
      </div>
    </section>
  );
}

export default function IconVergleich() {
  return (
    // Fixiert über dem Layout-Chrome (Karte, Onboarding, BottomNav), damit die
    // Icons ungestört auf reinem Hell/Dunkel-Grund beurteilt werden können.
    <main
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        alignContent: "start",
        // Deckt auch den Bereich unterhalb der Sektionen ab, sobald die Liste
        // länger als der Bildschirm wird.
        backgroundImage: "linear-gradient(to right, #E8EDF2 50%, #1B2A3A 50%)",
      }}
    >
      <Tafel titel="Hell" hintergrund="#E8EDF2" farbe="#1B2A3A" />
      <Tafel titel="Dunkel" hintergrund="#1B2A3A" farbe="#E8EDF2" />
    </main>
  );
}
