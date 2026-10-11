import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { RememberClub } from "@/components/RecentClubs";
import { Crest } from "@/components/ui";
import { logout } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { inkFor } from "@/lib/color";

type Props = { children: ReactNode; params: Promise<{ club: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await loadClub((await params).club);
  return { title: { default: data.club.name, template: `%s · ${data.club.name}` } };
}

export default async function ClubLayout({ children, params }: Props) {
  const { club: slug } = await params;
  const { data, st, admin } = await loadClub(slug);
  const { club } = data;
  const theme = { "--accent": club.accent, "--gold": club.gold, "--accent-ink": inkFor(club.accent) } as CSSProperties;

  return (
    <div className="club-theme" style={theme}>
      <RememberClub club={{ slug: club.slug, name: club.name, shortName: club.shortName, accent: club.accent, gold: club.gold }} />
      <header className="site-header">
        <div className="container header-inner">
          <Link href={st.base} className="brand">
            <Crest short={club.shortName} size={32} />
            <span>{club.name}</span>
          </Link>
          <Nav base={st.base} admin={admin} />
        </div>
      </header>
      <main className="container">{children}</main>
      <footer className="site-footer container">
        <span>
          {club.name}
          {club.founded && <> · Est. {club.founded}</>}
        </span>
        <span className="footer-links">
          <Link href="/">All clubs</Link>
          {admin ? (
            <form action={logout.bind(null, slug)}>
              <button className="btn-link">Sign out</button>
            </form>
          ) : (
            <Link href={`${st.base}/login`}>Admin sign in</Link>
          )}
        </span>
      </footer>
    </div>
  );
}
