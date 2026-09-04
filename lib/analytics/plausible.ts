// Dünner Wrapper um Plausible (T15) - feuert nur, wenn Einwilligung erteilt
// wurde und das Skript geladen ist (siehe components/analytics/AnalyticsProvider).
// Events sind exakt die, die die PRD-Metriken brauchen.
export type AnalyticsEvent =
  | "Erfassung gestartet"
  | "Erfassung abgeschlossen"
  | "Check-in abgeschlossen"
  | "Album geöffnet";

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
  }
}

export function trackEvent(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined") return;
  window.plausible?.(event, props ? { props } : undefined);
}
