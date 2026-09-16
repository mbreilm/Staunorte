import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { Onboarding } from "@/components/Onboarding";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { SeitenaufrufZaehler } from "@/components/analytics/SeitenaufrufZaehler";
import { BottomNav } from "@/components/nav/BottomNav";
import { MapView } from "@/components/map/MapView";
import "./globals.css";

const BESCHREIBUNG =
  "Finde die spannendsten Baustellen in der Nähe und schau dir an, welche Fahrzeuge dort gerade arbeiten.";

export const metadata: Metadata = {
  // Absolute Basis für alle Adressen in den Metadaten. Ohne sie baut
  // Next.js relative Bildpfade nicht zu vollständigen Adressen aus - und
  // eine Linkvorschau in WhatsApp oder Signal kann mit "/og-bild.png"
  // nichts anfangen, das Bild bliebe leer.
  metadataBase: new URL("https://baustellenjaeger.com"),
  title: "Baustellenjäger",
  description: BESCHREIBUNG,
  // Vorschau beim Teilen des Links. 1200x630 ist das Format, das
  // Messenger und soziale Netze erwarten; kleinere Bilder werden von
  // manchen Diensten gar nicht erst angezeigt.
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "Baustellenjäger",
    title: "Baustellenjäger",
    description: BESCHREIBUNG,
    url: "https://baustellenjaeger.com",
    images: [
      {
        url: "/og-bild.png",
        width: 1200,
        height: 630,
        alt: "Bauhelm mit Fernglas - das Logo von Baustellenjäger",
      },
    ],
  },
  // X/Twitter wertet die OpenGraph-Angaben nur teilweise aus und braucht
  // zusätzlich den Kartentyp, sonst erscheint nur ein kleines Icon.
  twitter: {
    card: "summary_large_image",
    title: "Baustellenjäger",
    description: BESCHREIBUNG,
    images: ["/og-bild.png"],
  },
  // Sorgt dafür, dass die App auf iOS ebenfalls ohne Browser-Leiste startet.
  appleWebApp: {
    capable: true,
    title: "Baustellenjäger",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#c67139",
  // Die Karte wird einhändig bedient - kein versehentliches Zoomen der Seite.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body
        className="h-dvh overflow-hidden flex justify-center"
        style={{ background: "var(--color-neutral-300)" }}
      >
        {/* Telefon-Rahmen: Die App ist für einhändige Bedienung auf dem
            Handy gebaut (CLAUDE.md), nicht für breite Browserfenster - ohne
            dieses Maximum würden Grids (z.B. das Sammelalbum) auf breiten
            Bildschirmen auf unproportionale Kachelgrößen aufblähen.
            `contain: layout` macht dieses div zum Containing Block für
            `position: fixed` - ohne das würden Karte, BottomNav und alle
            Sheets/Dialoge trotz des Rahmens die volle Fensterbreite
            ausfüllen. Der Rahmen selbst scrollt NICHT (h-full, overflow
            hidden) - nur der innere Seiteninhalt-Bereich weiter unten tut
            das. Würde stattdessen der Rahmen selbst scrollen, würden
            BottomNav/MapView/Dialoge (als `fixed`, jetzt relativ zu diesem
            Rahmen statt zum echten Viewport positioniert) beim Scrollen
            mitwandern statt an Ort und Stelle zu bleiben. */}
        <div
          className="relative h-full w-full max-w-[430px] overflow-hidden flex flex-col"
          style={{ background: "var(--color-bg)", contain: "layout" }}
        >
          {/* AuthProvider umschliesst den GESAMTEN Rahmen, nicht nur den
              Seiteninhalt. Die Karte liegt ausserhalb des scrollenden
              Bereichs, braucht die Anmeldung aber ebenfalls - das
              Vorschau-Sheet enthaelt den Merken-Knopf. Stand der Provider
              nur um {children}, warf useAuth() dort eine Ausnahme und riss
              die ganze Seite mit sich. Der Provider rendert selbst kein
              DOM-Element, das Flex-Layout des Rahmens bleibt also
              unveraendert. */}
          <AuthProvider>
          {/* Dauerhaft gemountet (nicht pro Route) - siehe components/map/MapView.tsx. */}
          <MapView />
          {/* Einziger scrollender Bereich im Rahmen - BottomNav & Co. sind
              Geschwister davon (nicht Nachfahren) und bleiben deshalb beim
              Scrollen unberührt an ihrer Position stehen. min-h-0 hebt
              Flexbox' Standardverhalten auf: ein flex-1-Kind schrumpft sonst
              nie unter seine Inhaltshöhe, wodurch overflow-y-auto nie
              greifen und der Rahmen selbst aufgebläht würde. */}
          <div className="min-h-0 flex-1 overflow-y-auto flex flex-col">
            {children}
          </div>
          <BottomNav />
          <Onboarding />
          {/* Höchster z-index im Rahmen (z-[100]) - soll bei jedem frischen
              Laden kurz alles andere (Karte, Onboarding) verdecken. */}
          <LoadingScreen />
          <AnalyticsProvider />
          <SeitenaufrufZaehler />
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
