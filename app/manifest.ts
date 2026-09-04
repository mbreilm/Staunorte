import type { MetadataRoute } from "next";

/**
 * Web-App-Manifest. Next.js liefert das automatisch unter /manifest.webmanifest
 * aus. Damit kann die PWA auf dem Homescreen installiert werden und startet
 * dann ohne Browser-Leiste (display: "standalone").
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baustellenjäger",
    short_name: "Baustellen",
    description:
      "Finde die spannendsten Baustellen in der Nähe und schau dir an, welche Fahrzeuge dort gerade arbeiten.",
    lang: "de",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#F2A20C",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
