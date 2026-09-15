import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // VORÜBERGEHEND für die Fehlersuche am iPhone (Stand 15.09.2026).
  //
  // Ohne das liefert Next.js in der Produktion keine Quellkarten aus. Im
  // Web-Inspektor stehen dann nur Kürzel wie `dy` und `t` statt echter
  // Funktionsnamen - man sieht, DASS etwas wirft, aber nicht wo.
  //
  // Wieder entfernen, sobald der Fehler gefunden ist: Quellkarten machen
  // das Deployment größer und legen den Quelltext offen (bei einer
  // Browser-App ohnehin kein Geheimnis, aber unnötig).
  productionBrowserSourceMaps: true,
};

export default nextConfig;
