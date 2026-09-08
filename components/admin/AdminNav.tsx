"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Meldungen" },
  { href: "/admin/orte", label: "Orte" },
  { href: "/admin/nutzer", label: "Nutzer" },
  { href: "/admin/analytics", label: "Analytics" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {LINKS.map((link) => {
        const aktiv = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className="btn btn-ghost text-sm"
            style={aktiv ? { fontWeight: 700 } : undefined}
            aria-current={aktiv ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
