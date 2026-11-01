"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { useT } from "@/components/I18n";

/**
 * The club's links. On a wide screen they sit in the header; on the redesigned pages on a phone they fold behind a
 * Menu button into a full-screen sheet (the button is hidden everywhere else by CSS).
 */
export function Nav({ base, admin }: { base: string; admin: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const t = useT();
  const links = [
    { href: base, label: t("Home") },
    { href: `${base}/matches`, label: t("Matches") },
    { href: `${base}/table`, label: t("Table") },
    { href: `${base}/players`, label: t("Players") },
    { href: `${base}/stats`, label: t("Stats") },
    { href: `${base}/halls`, label: t("Fame & Shame") },
    // Straight to the first tab: going via /settings and its redirect showed the old page for a moment.
    ...(admin ? [{ href: `${base}/settings/squad`, match: `${base}/settings`, label: t("Settings") }] : []),
  ];

  // Close on navigation and on Escape, and keep the page behind still while the sheet is open.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.toggleAttribute("data-menu-open", true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.removeAttribute("data-menu-open");
    };
  }, [open]);

  return (
    <>
      <button type="button" className="nav-toggle" aria-expanded={open} aria-controls="club-nav" onClick={() => setOpen((o) => !o)}>
        <span>{open ? t("Close") : t("Menu")}</span>
        <span className="nav-toggle-icon" aria-hidden="true" />
      </button>
      <nav id="club-nav" className="nav" aria-label="Club" data-open={open || undefined}>
        {links.map((l, i) => {
          const active = l.href === base ? path === base : path.startsWith(("match" in l && l.match) || l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={active ? "active" : undefined}
              aria-current={active ? "page" : undefined}
              style={{ "--i": i } as CSSProperties}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
