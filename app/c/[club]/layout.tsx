import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { RememberClub } from "@/components/RecentClubs";
import { Crest } from "@/components/ui";
import { logout } from "@/lib/actions";
import { loadClubOpen } from "@/lib/club";
import { inkFor } from "@/lib/color";

type Props = { children: ReactNode; params: Promise<{ club: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await loadClubOpen((await params).club);
  return {
    title: { default: data.club.name, template: `%s · ${data.club.name}` },
    ...(data.club.logo && { icons: { icon: data.club.logo } }),
    // A private club stays out of search engines.
    ...(data.club.private && { robots: { index: false, follow: false } }),
  };
}

export default async function ClubLayout({ children, params }: Props) {
  const { club: slug } = await params;
  // Open, not gated: a visitor who isn't let into a private club still gets the header and the sign-in page.
  const { data, st, admin, coach, squad, canView } = await loadClubOpen(slug);
  const { club } = data;
  const theme = { "--accent": club.accent, "--gold": club.gold, "--accent-ink": inkFor(club.accent) } as CSSProperties;

  return (
    <div className="club-theme" style={theme}>
      <RememberClub club={{ slug: club.slug, name: club.name, shortName: club.shortName, accent: club.accent, gold: club.gold, logo: club.logo }} />
      <header className="site-header">
        <div className="container header-inner">
          <Link href={st.base} className="brand">
            <Crest short={club.shortName} logo={club.logo} size={32} />
            <span>{club.name}</span>
          </Link>
          {canView && <Nav base={st.base} admin={admin} />}
        </div>
      </header>
      <main className="container">{children}</main>
      <footer className="site-footer container">
        <span>
          {club.name}
          {club.founded && <> · Est. {club.founded}</>}
        </span>
        <span className="footer-links">
          <Link href="/">Sunday League Tracker</Link>
          {admin || coach || (squad && data.club.private) ? (
            <form action={logout.bind(null, slug)}>
              <button className="btn-link">{admin ? "Sign out" : coach ? "Sign out (coach)" : "Sign out"}</button>
            </form>
          ) : (
            <Link href={`${st.base}/login`}>Sign in</Link>
          )}
        </span>
      </footer>
    </div>
  );
}
