import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { Onboarding } from "@/components/Onboarding";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  themeColor: "#F2A20C",
  // Die Karte wird einhändig bedient - kein versehentliches Zoomen der Seite.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <Onboarding />
      </body>
    </html>
  );
}
