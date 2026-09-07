import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { Onboarding } from "@/components/Onboarding";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { BottomNav } from "@/components/nav/BottomNav";
import { MapView } from "@/components/map/MapView";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baustellenjäger",
  description:
    "Finde die spannendsten Baustellen in der Nähe und schau dir an, welche Fahrzeuge dort gerade arbeiten.",
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
          {/* Dauerhaft gemountet (nicht pro Route) - siehe components/map/MapView.tsx. */}
          <MapView />
          {/* Einziger scrollender Bereich im Rahmen - BottomNav & Co. sind
              Geschwister davon (nicht Nachfahren) und bleiben deshalb beim
              Scrollen unberührt an ihrer Position stehen. min-h-0 hebt
              Flexbox' Standardverhalten auf: ein flex-1-Kind schrumpft sonst
              nie unter seine Inhaltshöhe, wodurch overflow-y-auto nie
              greifen und der Rahmen selbst aufgebläht würde. */}
          <div className="min-h-0 flex-1 overflow-y-auto flex flex-col">
            <AuthProvider>{children}</AuthProvider>
          </div>
          <BottomNav />
          <Onboarding />
          {/* Höchster z-index im Rahmen (z-[100]) - soll bei jedem frischen
              Laden kurz alles andere (Karte, Onboarding) verdecken. */}
          <LoadingScreen />
          <AnalyticsProvider />
        </div>
      </body>
    </html>
  );
}
