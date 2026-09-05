// Zentrales Icon-Modul (docs/DESIGN-ICONS.md): Komponenten importieren Icons
// ausschließlich von hier, nie direkt aus @tabler/icons-react - so lässt sich
// ein Icon später an einer einzigen Stelle austauschen. Alle Icons erben ihre
// Farbe über currentColor, nie fest eingefärbt.
import type { ComponentType } from "react";
import {
  IconMapPinCheck,
  IconMapPin,
  IconEye,
  IconEyeOff,
  IconLayoutGrid,
  IconSparkles,
  IconClock,
  IconAlertTriangle,
  IconHelmet,
  IconBarrierBlock,
  IconCamera,
  IconPhotoPlus,
  IconFilter,
  IconSearch,
  IconNavigation,
  IconFlag,
  IconUser,
  IconLogin,
  IconSettings,
  IconBackhoe,
  IconCrane,
  IconBulldozer,
  IconTruck,
  IconContainer,
  type IconProps,
} from "@tabler/icons-react";
import { IconBeton, IconStrassenbau, IconSpezial } from "@/components/icons/GroupIcons";

// — UI-Icons (docs/DESIGN-ICONS.md Abschnitt 4) —
export const IconCheckin = IconMapPinCheck;
export const IconStandort = IconMapPin;
export const IconFrisch = IconEye;
export const IconVeraltet = IconEyeOff;
export const IconAlbum = IconLayoutGrid;
export const IconFreischaltung = IconSparkles;
export const IconArbeitszeiten = IconClock;
export const IconSicherheitshinweis = IconAlertTriangle;
export const IconBauhelm = IconHelmet;
export const IconAbsperrung = IconBarrierBlock;
export const IconFotoAufnehmen = IconCamera;
export const IconFotoHinzufuegen = IconPhotoPlus;
export const IconFilterIcon = IconFilter;
export const IconSuche = IconSearch;
export const IconRoute = IconNavigation;
export const IconMelden = IconFlag;
export const IconKonto = IconUser;
export const IconAnmelden = IconLogin;
export const IconEinstellungen = IconSettings;

// — Gruppen-Icons (docs/DESIGN-ICONS.md Abschnitt 2) —
export { IconBeton, IconStrassenbau, IconSpezial };
export const IconBagger = IconBackhoe;
export const IconKraene = IconCrane;
export const IconLader = IconBulldozer;
export const IconTransport = IconTruck;
export const IconAusstattung = IconContainer;

/**
 * Bildet `observable_types.group_name` auf ihr Icon ab. Unbekannte Gruppen
 * fallen auf das Transport-Icon (LKW) zurück, statt gar kein Icon zu zeigen.
 */
export const GROUP_ICONS: Record<string, ComponentType<IconProps>> = {
  Bagger: IconBagger,
  Kräne: IconKraene,
  Lader: IconLader,
  Transport: IconTransport,
  Ausstattung: IconAusstattung,
  Beton: IconBeton,
  Straßenbau: IconStrassenbau,
  Spezial: IconSpezial,
};

export function gruppenIcon(groupName: string | null | undefined): ComponentType<IconProps> {
  return (groupName && GROUP_ICONS[groupName]) || IconTransport;
}
