import type { IconProps } from "@tabler/icons-react";

// Die drei Gruppen-Icons, die es bei Tabler nicht gibt (docs/DESIGN-ICONS.md
// Abschnitt 3). Exakt im Tabler-Stil gezeichnet: viewBox 0 0 24 24,
// stroke="currentColor", stroke-width 2, runde Enden/Ecken, fill none - damit
// sie sich nahtlos neben echten Tabler-Icons einreihen. Props bewusst
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
      <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M14 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M16 19h-9" />
      <path d="M3 15v-3a1 1 0 0 1 1 -1h3v4h13" />
      <path d="M20 15v-6m-8 6v-2" />
      <path d="M12 13l-1 -3l7 -5l2 4z" />
      <path d="M16 11l-2 -3" />
    </svg>
  );
}

/** Straßenwalze: breite Walze vorn, normales Rad hinten, kleine Kabine darüber. */
export function IconStrassenbau(props: IconProps) {
  return (
    <svg {...baueSvgProps(props)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M4 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <path d="M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M18 19h-11" />
      <path d="M7 13v-2h7v4h6" />
      <path d="M9 11v-3a1 1 0 0 1 1 -1h2v4" />
    </svg>
  );
}

/** Saug-/Spülfahrzeug: Fahrzeugkörper mit dickem, nach unten gebogenem Schlauch. */
export function IconSpezial(props: IconProps) {
  return (
    <svg {...baueSvgProps(props)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M4 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M10 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M19 19h-13" />
      <path d="M4 15v-4a1 1 0 0 1 1 -1h2v-2h7v7h-10" />
      <path d="M14 12h2a3 3 0 0 1 3 3v4" />
    </svg>
  );
}
