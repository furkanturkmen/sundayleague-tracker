import Link from "next/link";
import { RecentClubs } from "@/components/RecentClubs";
import { Crest } from "@/components/ui";
import { inkFor } from "@/lib/color";
import { listClubs } from "@/lib/club";

export default async function Landing() {
  const clubs = await listClubs();

  return (
    <div className="container landing">
      <header className="landing-hero">
        <div className="kicker">Sunday League Tracker</div>
        <h1>Every goal, every card, every excuse.</h1>
        <p>Results, player stats, club records, analysis and a Hall of Fame and Hall of Shame for your Sunday league side.</p>
        <Link href="/new" className="btn btn-lg">Create your club</Link>
      </header>

      <RecentClubs existing={clubs.map((c) => c.slug)} />

      <section className="section">
        <h2>Choose your club</h2>
        {clubs.length === 0 ? (
          <p className="empty">No clubs yet. Be the first.</p>
        ) : (
          <div className="club-grid">
            {clubs.map((c) => (
              <Link
                key={c.slug}
                href={`/c/${c.slug}`}
                className="club-card"
                style={{ ["--accent" as string]: c.accent, ["--gold" as string]: c.gold, ["--accent-ink" as string]: inkFor(c.accent) }}
              >
                <Crest short={c.shortName} logo={c.logo} size={40} />
                <div>
                  <strong>{c.name}</strong>
                  <div className="small muted">
                    {c.players} players · {c.matches} played
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
