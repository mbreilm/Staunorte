// Gemeinsamer Zustand des Erst-Onboardings (components/Onboarding.tsx).
//
// Auch die Karte muss ihn kennen: Das Onboarding fragt selbst nach dem
// Standort. Ohne diese Information würde die Karte kurz darauf ein zweites
// Mal danach fragen - einmal reicht.
export const ONBOARDING_GEZEIGT_SCHLUESSEL = "baustellenjaeger:onboarding-gezeigt";

/**
 * Wurde das Onboarding in diesem Browser schon einmal durchlaufen?
 *
 * Kein Storage-Zugriff (privater Modus, blockierte Website-Daten) wird als
 * "ja" gewertet: Das Onboarding zeigt sich dann ohnehin bei jedem Aufruf,
 * und die Karte soll deswegen nicht dauerhaft verstummen.
 */
export function onboardingSchonGelaufen(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_GEZEIGT_SCHLUESSEL) === "1";
  } catch {
    return true;
  }
}

export function onboardingAlsGezeigtMerken(): void {
  try {
    window.localStorage.setItem(ONBOARDING_GEZEIGT_SCHLUESSEL, "1");
  } catch {
    // s.o. - dann eben bei jedem Aufruf erneut.
  }
}
