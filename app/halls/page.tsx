import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PlayerLink, SeasonTabs } from "@/components/ui";
import { fameMoments, shameMoments } from "@/data/moments";
import { formatDate, hallOfFame, hallOfShame, inSeason, resolveSeason, seasonLabel, seasons, type Award } from "@/lib/stats";
import type { Moment } from "@/lib/types";

export const metadata: Metadata = { title: "Hall of Fame & Hall of Shame" };

function AwardCard({ award }: { award: Award }) {
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
            <PlayerLink id={winner.player.id} />
            <span className="val">{winner.display}</span>
          </div>
          {rest.length > 0 && (
            <ul className="award-runners">
              {rest.map((l) => (
                <li key={l.player.id}>
                  <PlayerLink id={l.player.id} />
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

function Moments({ items }: { items: Moment[] }) {
  return (
    <div className="grid grid-2" style={{ marginTop: 16 }}>
      {items.map((m) => (
        <div key={m.title} className="award moment">
          <h3>{m.title}</h3>
          <div className="small muted">
            {m.player && <PlayerLink id={m.player} />}
            {m.player && m.date && " · "}
            {m.date && <Link href={`/matches/${m.date}`}>{formatDate(m.date)}</Link>}
          </div>
          <p>{m.story}</p>
        </div>
      ))}
    </div>
  );
}

export default async function HallsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const season = resolveSeason(params.season);
  const ms = inSeason(season);
  const fame = hallOfFame(ms);
  const shame = hallOfShame(ms);
  const keep = (m: Moment) => season === "all" || (m.date ? ms.some((x) => x.id === m.date) : false);
  const darkest = [...ms].filter((m) => m.result === "L").sort((a, b) => b.ga - b.gf - (a.ga - a.gf) || b.ga - a.ga).slice(0, 3);

  return (
    <>
      <PageHeader title="Fame & Shame" kicker={seasonLabel(season)}>
        <SeasonTabs base="/halls" seasons={seasons} active={season} />
      </PageHeader>

      <section className="hall hall-fame">
        <h2>🏆 Hall of Fame</h2>
        <p>Legends of the Sunday morning. Their names will be sung (by themselves, mostly).</p>
        <div className="grid grid-3">
          {fame.map((a) => (
            <AwardCard key={a.title} award={a} />
          ))}
        </div>
        {fameMoments.filter(keep).length > 0 && (
          <>
            <h3 style={{ marginTop: 24 }}>Legendary moments</h3>
            <Moments items={fameMoments.filter(keep)} />
          </>
        )}
      </section>

      <section className="hall hall-shame section">
        <h2>🤡 Hall of Shame</h2>
        <p>Every club has them. Ours just happen to keep turning up.</p>
        <div className="grid grid-3">
          {shame.map((a) => (
            <AwardCard key={a.title} award={a} />
          ))}
        </div>
        {shameMoments.filter(keep).length > 0 && (
          <>
            <h3 style={{ marginTop: 24 }}>Moments we&apos;d rather forget</h3>
            <Moments items={shameMoments.filter(keep)} />
          </>
        )}
        {darkest.length > 0 && (
          <>
            <h3 style={{ marginTop: 24 }}>Darkest days</h3>
            <div className="grid grid-3" style={{ marginTop: 16 }}>
              {darkest.map((m) => (
                <Link key={m.id} href={`/matches/${m.id}`} className="award" style={{ textDecoration: "none" }}>
                  <div className="award-winner">
                    <span>{m.opponent}</span>
                    <span className="val">{m.gf}–{m.ga}</span>
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
