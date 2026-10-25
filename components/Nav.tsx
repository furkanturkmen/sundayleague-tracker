"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({ base, admin }: { base: string; admin: boolean }) {
  const path = usePathname();
  const links = [
    { href: base, label: "Home" },
    { href: `${base}/matches`, label: "Matches" },
    { href: `${base}/table`, label: "Table" },
    { href: `${base}/players`, label: "Players" },
    { href: `${base}/records`, label: "Records" },
    { href: `${base}/analysis`, label: "Analysis" },
    { href: `${base}/halls`, label: "Fame & Shame" },
    ...(admin ? [{ href: `${base}/settings`, label: "Settings" }] : []),
  ];
  return (
    <nav className="nav" aria-label="Club">
      {links.map((l) => {
        const active = l.href === base ? path === base : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
