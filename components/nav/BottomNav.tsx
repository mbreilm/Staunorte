"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconKarte, IconAlbum, IconKonto } from "@/lib/icons";

const TABS = [
  { href: "/", label: "Karte", icon: IconKarte },
  { href: "/album", label: "Album", icon: IconAlbum },
  { href: "/konto", label: "Profil", icon: IconKonto },
];

// Nur auf den drei Haupt-Tabs sichtbar - nicht auf Detail-/Erfassen-/
// Rechtstexten, wo eine eigene "Zurück"-Navigation greift.
const SICHTBAR_AUF = new Set(["/", "/album", "/konto"]);

export function BottomNav() {
  const pathname = usePathname();
  if (!SICHTBAR_AUF.has(pathname)) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2"
      aria-label="Hauptnavigation"
    >
      <div className="flex items-center gap-1 rounded-full bg-[var(--color-surface)] px-2 py-2 shadow-[var(--shadow-lg)]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const aktiv = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex min-w-[76px] flex-col items-center gap-0.5 rounded-full px-4 py-1.5 transition-colors"
              style={{
                color: aktiv ? "var(--color-bg)" : "var(--color-text)",
                background: aktiv ? "var(--color-accent)" : "transparent",
              }}
              aria-current={aktiv ? "page" : undefined}
            >
              <Icon size={20} />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

