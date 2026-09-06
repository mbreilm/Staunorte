import { createElement } from "react";
import type { IconProps } from "@tabler/icons-react";
import { gruppenIcon } from "@/lib/icons";

type Props = IconProps & {
  /** `observable_types.group_name` bzw. `v_place_observables.group_name`. */
  groupName: string | null | undefined;
};

/**
 * Rendert das Icon der Fahrzeuggruppe. Bewusst eine eigene Komponente statt
 * `const Icon = gruppenIcon(...)` an jeder Aufrufstelle: eine im Render
 * ermittelte Komponente in eine Variable zu schreiben verstößt gegen
 * `react-hooks/static-components` (React würde ihren State bei jedem Render
 * verwerfen). `createElement` umgeht das, weil hier kein neuer Komponententyp
 * entsteht - es wird nur einer aus GROUP_ICONS nachgeschlagen.
 */
export function GruppenIcon({ groupName, ...props }: Props) {
  return createElement(gruppenIcon(groupName), props);
}
