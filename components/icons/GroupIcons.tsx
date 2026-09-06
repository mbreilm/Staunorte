import type { IconProps } from "@tabler/icons-react";

// Die drei Gruppen-Icons, die es bei Tabler nicht gibt (docs/DESIGN-ICONS.md
// Abschnitt 3). Exakt im Tabler-Stil gezeichnet: viewBox 0 0 24 24,
// stroke="currentColor", stroke-width 2, runde Enden/Ecken, fill none - damit
// sie sich nahtlos neben echten Tabler-Icons einreihen. Nur <path>, ganzzahlige
// Koordinaten, gemeinsames Fahrzeug-Skelett (Räder r=2 auf y=17, Boden y=19,
// Chassis-Oberkante y=15) und - wie jedes Tabler-Baufahrzeug - Blickrichtung
// nach rechts. Die Pfade sind identisch zu public/icons/groups/*.svg; wer eins
// ändert, muss das andere mitziehen. Props bewusst
// kompatibel zu IconProps aus @tabler/icons-react (size/className/...), damit
// sie in GROUP_ICONS (lib/icons.ts) austauschbar mit echten Tabler-Icons sind.
function baueSvgProps({ size = 24, stroke = 2, ...rest }: IconProps) {
  // Tabler-Konvention: `stroke` meint bei IconProps die Strichstärke, nicht
  // die Farbe (die kommt immer von currentColor) - daher hier umbenannt statt
  // ans native SVG-Attribut `stroke` durchgereicht.
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

/** Betonmischer: Fahrzeugkörper mit schräg liegender Trommel darauf. */
export function IconBeton(props: IconProps) {
  return (
    <svg {...baueSvgProps(props)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M6 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M8 19h9" />
      <path d="M21 15v-4a1 1 0 0 0 -1 -1h-3v5h-13" />
      <path d="M4 15v-6m8 6v-2" />
      <path d="M12 13l1 -3l-7 -5l-2 4z" />
      <path d="M8 11l2 -3" />
    </svg>
  );
}

/** Straßenwalze: breite Walze vorn rechts, normales Rad hinten, Kabine darüber. */
export function IconStrassenbau(props: IconProps) {
  return (
    <svg {...baueSvgProps(props)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M15 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M7 19h11" />
      <path d="M15 15v-4h-10v4h10" />
      <path d="M12 11v-3a1 1 0 0 0 -1 -1h-3v4" />
    </svg>
  );
}

/** Saug-/Spülfahrzeug: Fahrzeugkörper mit dickem, nach unten gebogenem Schlauch. */
export function IconSpezial(props: IconProps) {
  return (
    <svg {...baueSvgProps(props)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M10 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M17 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M19 19h-7" />
      <path d="M21 15v-4a1 1 0 0 0 -1 -1h-2v-3h-8v8h11" />
      <path d="M10 11h-3a3 3 0 0 0 -3 3v5" />
    </svg>
  );
}
