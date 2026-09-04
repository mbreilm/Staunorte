// Persistiert den Erfassungs-Flow (app/neu) in localStorage, damit ein
// Neustart der App den Entwurf nicht verwirft (docs/TICKETS.md T7).
// Das ausgewählte Foto selbst ist NICHT Teil des Entwurfs: File-Objekte
// lassen sich nicht sinnvoll in localStorage ablegen, ein Neustart
// verlangt also ein erneutes Auswählen des Fotos - alle anderen Angaben
// bleiben erhalten.
const SCHLUESSEL = "baustellenjaeger:ort-entwurf";

export type OrtEntwurf = {
  lat: number | null;
  lon: number | null;
  adresse: string | null;
  titel: string;
  notiz: string;
  /** Generische Kategorie-Attribute (place_categories.attribute_schema), z. B. { phase: "rohbau" } - keine hartkodierten Felder, siehe CLAUDE.md Regel 1+2. */
  attribute: Record<string, string>;
  ausgewaehlteFahrzeuge: string[];
};

export const LEERER_ENTWURF: OrtEntwurf = {
  lat: null,
  lon: null,
  adresse: null,
  titel: "",
  notiz: "",
  attribute: {},
  ausgewaehlteFahrzeuge: [],
};

export function ladeEntwurf(): OrtEntwurf {
  if (typeof window === "undefined") return LEERER_ENTWURF;
  try {
    const roh = window.localStorage.getItem(SCHLUESSEL);
    if (!roh) return LEERER_ENTWURF;
    return { ...LEERER_ENTWURF, ...JSON.parse(roh) };
  } catch {
    return LEERER_ENTWURF;
  }
}

export function speichereEntwurf(entwurf: OrtEntwurf) {
  try {
    window.localStorage.setItem(SCHLUESSEL, JSON.stringify(entwurf));
  } catch {
    // Privates Fenster o.ä. ohne Storage-Zugriff - der Entwurf übersteht
    // dann halt keinen Neustart, blockiert aber nicht den aktuellen Flow.
  }
}

export function loescheEntwurf() {
  try {
    window.localStorage.removeItem(SCHLUESSEL);
  } catch {
    // s.o.
  }
}
