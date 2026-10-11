import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { Crest } from "@/components/ui";
import { club } from "@/data/club";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: club.name, template: `%s · ${club.name}` },
  description: `Club tracker for ${club.name}: players, results, records, analysis and the halls of fame and shame.`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              <Crest size={32} />
              <span>{club.name}</span>
            </Link>
            <Nav />
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer container">
          <span>
            {club.name} · Est. {club.founded}
          </span>
          <span className="muted">Up the DWS.</span>
        </footer>
      </body>
    </html>
  );
}
