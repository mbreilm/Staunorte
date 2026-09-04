"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Karte", icon: MapIcon },
  { href: "/album", label: "Album", icon: AlbumIcon },
  { href: "/konto", label: "Profil", icon: ProfilIcon },
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
              <Icon />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function AlbumIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="14" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ProfilIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4.5 20c1.4-3.8 4.2-5.8 7.5-5.8s6.1 2 7.5 5.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
