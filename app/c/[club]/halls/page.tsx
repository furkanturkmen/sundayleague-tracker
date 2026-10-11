import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PlayerLink, SeasonTabs } from "@/components/ui";
import { loadClub } from "@/lib/club";
import { formatDate, seasonLabel, type Award, type Stats } from "@/lib/stats";
import type { Moment } from "@/lib/types";

export const metadata: Metadata = { title: "Hall of Fame & Hall of Shame" };

function AwardCard({ st, award }: { st: Stats; award: Award }) {
  const [winner, ...rest] = award.leaders;
  return (
    <div className="award">
      <div className="award-head">
        <span className="award-icon" aria-hidden="true">{award.icon}</span>
        <div>
          <h3>{award.title}</h3>
          <div className="award-blurb">{award.blurb}</div>
        </div>
      </div>
      {winner ? (
        <>
          <div className="award-winner">
            <PlayerLink st={st} id={winner.player.id} />
            <span className="val">{winner.display}</span>
          </div>
          {rest.length > 0 && (
            <ul className="award-runners">
              {rest.map((l) => (
                <li key={l.player.id}>
                  <PlayerLink st={st} id={l.player.id} />
                  <span>{l.display}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="empty">Vacant. For now.</p>
      )}
    </div>
  );
}

function Moments({ st, items }: { st: Stats; items: Moment[] }) {
  return (
    <div className="grid grid-2" style={{ marginTop: 16 }}>
      {items.map((m) => {
        const match = m.matchId ? st.getMatch(m.matchId) : undefined;
        return (
          <div key={m.id} className="award moment">
            <h3>{m.title}</h3>
            <div className="small muted">
              {m.player && <PlayerLink st={st} id={m.player} />}
              {m.player && match && " · "}
              {match && (
                <Link href={`${st.base}/matches/${match.id}`}>
                  vs {match.opponent}, {formatDate(match.date)}
                </Link>
              )}
            </div>
            {m.story && <p>{m.story}</p>}
          </div>
        );
      })}
    </div>
  );
}

type Props = { params: Promise<{ club: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function HallsPage({ params, searchParams }: Props) {
  const { data, st, admin } = await loadClub((await params).club);
  const query = await searchParams;
  const season = st.resolveSeason(query.season);
  const ms = st.inSeason(season);
  const fame = st.hallOfFame(ms);
  const shame = st.hallOfShame(ms);
  // Moments without a match are timeless and show in every season.
  const keep = (m: Moment) => season === "all" || !m.matchId || ms.some((x) => x.id === m.matchId);
  const fameMoments = data.moments.filter((m) => m.kind === "fame" && keep(m));
  const shameMoments = data.moments.filter((m) => m.kind === "shame" && keep(m));
  const darkest = ms
    .filter((m) => m.result === "L")
    .sort((a, b) => b.ga - b.gf - (a.ga - a.gf) || b.ga - a.ga)
    .slice(0, 3);

  return (
    <>
      <PageHeader
        title="Fame & Shame"
        kicker={seasonLabel(season)}
        actions={admin && <Link href={`${st.base}/settings#moments`} className="btn btn-secondary">+ Add a moment</Link>}
      >
        <SeasonTabs base={`${st.base}/halls`} seasons={st.seasons} active={season} />
      </PageHeader>

      <section className="hall hall-fame">
        <h2>🏆 Hall of Fame</h2>
        <p>Legends of the Sunday morning. Their names will be sung (by themselves, mostly).</p>
        <div className="grid grid-3">
          {fame.map((a) => (
            <AwardCard key={a.title} st={st} award={a} />
          ))}
        </div>
        {fameMoments.length > 0 && (
          <>
            <h3 style={{ marginTop: 24 }}>Legendary moments</h3>
            <Moments st={st} items={fameMoments} />
          </>
        )}
      </section>

      <section className="hall hall-shame section">
        <h2>🤡 Hall of Shame</h2>
        <p>Every club has them. Ours just happen to keep turning up.</p>
        <div className="grid grid-3">
          {shame.map((a) => (
            <AwardCard key={a.title} st={st} award={a} />
          ))}
        </div>
        {shameMoments.length > 0 && (
          <>
            <h3 style={{ marginTop: 24 }}>Moments we&apos;d rather forget</h3>
            <Moments st={st} items={shameMoments} />
          </>
        )}
        {darkest.length > 0 && (
          <>
            <h3 style={{ marginTop: 24 }}>Darkest days</h3>
            <div className="grid grid-3" style={{ marginTop: 16 }}>
              {darkest.map((m) => (
                <Link key={m.id} href={`${st.base}/matches/${m.id}`} className="award" style={{ textDecoration: "none" }}>
                  <div className="award-winner">
                    <span>{m.opponent}</span>
                    <span className="val">
                      {m.gf}–{m.ga}
                    </span>
                  </div>
                  <div className="small muted">
                    {formatDate(m.date)} · {m.competition} · {m.venue === "H" ? "Home" : "Away"}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
