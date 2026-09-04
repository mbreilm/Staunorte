// Zeitbezüge in natürlicher Sprache ("vor 3 Tagen") - deutsches Locale,
// siehe CLAUDE.md Ordnerstruktur.
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";

export function vorZeit(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: de });
}

export function istAelterAlsTage(iso: string, tage: number): boolean {
  return differenceInDays(new Date(), new Date(iso)) > tage;
}
