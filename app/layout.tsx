import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { Onboarding } from "@/components/Onboarding";
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
      <body className="min-h-full flex flex-col">
        {/* Dauerhaft gemountet (nicht pro Route) - siehe components/map/MapView.tsx. */}
        <MapView />
        <AuthProvider>{children}</AuthProvider>
        <BottomNav />
        <Onboarding />
        <AnalyticsProvider />
      </body>
    </html>
  );
}
