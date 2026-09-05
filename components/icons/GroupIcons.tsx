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
      <path d="M2 17.5h1.5" />
      <path d="M2 17.5v-4.5a1 1 0 0 1 1-1h2.5l2.2 3.2" />
      <path d="M7.7 17.5h2.3" />
      <circle cx="5.7" cy="18.5" r="1.6" />
      <circle cx="17.3" cy="18.5" r="1.6" />
      <rect x="10.5" y="2.5" width="5" height="13" rx="2.5" transform="rotate(-35 13 9)" />
      <path d="M9.8 8l4.8 3" transform="rotate(-35 13 9)" />
    </svg>
  );
}

/** Straßenwalze: breite Walze auf einer Bodenlinie, kleine Kabine darüber. */
export function IconStrassenbau(props: IconProps) {
  return (
    <svg {...baueSvgProps(props)}>
      <path d="M2 20h20" />
      <rect x="3" y="13.5" width="15" height="5.5" rx="2.75" />
      <path d="M9 13.5v-3a1 1 0 0 1 1-1h2.5" />
      <rect x="12.5" y="5.5" width="5" height="4" rx="1" />
    </svg>
  );
}

/** Saug-/Spülfahrzeug: Fahrzeugkörper mit dickem, nach unten gebogenem Schlauch. */
export function IconSpezial(props: IconProps) {
  return (
    <svg {...baueSvgProps(props)}>
      <rect x="3" y="9" width="12" height="8" rx="1.5" />
      <circle cx="7" cy="18.5" r="1.5" />
      <circle cx="13" cy="18.5" r="1.5" />
      <path d="M15 12h2l3 2" />
      <path d="M20 14c1 1.2 1 3-.2 4.3-1 1-2.5 1-3.3-.1" />
    </svg>
  );
}
