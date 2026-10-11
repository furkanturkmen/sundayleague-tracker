import Link from "next/link";
import { Crest, FormGuide, MatchLine, PlayerLink, StatTile, Empty } from "@/components/ui";
import { club } from "@/data/club";
import {
  allStats,
  currentRun,
  currentSeason,
  fixtureTitle,
  formatDate,
  hallOfFame,
  hallOfShame,
  inSeason,
  played,
  seasonLabel,
  summarise,
  upcoming,
} from "@/lib/stats";

const runWord = { W: "wins", D: "draws", L: "defeats" } as const;

export default function Home() {
  const season = inSeason(currentSeason);
  const s = summarise(season);
  const stats = allStats(season);
  const scorers = stats.filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals || a.apps - b.apps).slice(0, 5);
  const assisters = stats.filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists || a.apps - b.apps).slice(0, 5);
  const recent = [...played].reverse().slice(0, 5);
  const next = upcoming[0];
  const run = currentRun(played);
  const fame = hallOfFame(played)[0];
  const shame = hallOfShame(played)[0];

  return (
    <>
      <section className="hero">
        <Crest size={72} />
        <div>
          <h1>{club.name}</h1>
          <p>{club.tagline}</p>
        </div>
        <div className="hero-record" aria-label={`${seasonLabel(currentSeason)} record`}>
          <div><strong>{s.w}</strong><span>Won</span></div>
          <div><strong>{s.d}</strong><span>Drawn</span></div>
          <div><strong>{s.l}</strong><span>Lost</span></div>
          <div><strong>{s.pts}</strong><span>Points</span></div>
        </div>
      </section>

      <div className="grid grid-3">
        <div className="card">
          <h2>Next up</h2>
          {next ? (
            <>
              <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{fixtureTitle(next)}</div>
              <div className="muted">
                {formatDate(next.date, { weekday: "long", day: "numeric", month: "long" })} · {next.competition}
              </div>
            </>
          ) : (
            <Empty>No fixtures scheduled.</Empty>
          )}
        </div>
        <div className="card">
          <h2>Form</h2>
          <FormGuide matches={[...played].slice(-10)} />
          {run && run.length > 1 && (
            <p className="small muted" style={{ marginBottom: 0 }}>
              {run.length} {runWord[run.result]} on the bounce.
            </p>
          )}
        </div>
        <div className="card">
          <h2>{seasonLabel(currentSeason)} so far</h2>
          <div className="tiles" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <StatTile label="Scored" value={s.gf} />
            <StatTile label="Conceded" value={s.ga} />
            <StatTile label="Clean sheets" value={s.cleanSheets} />
          </div>
        </div>
      </div>

      <div className="grid grid-3 section">
        <div className="card">
          <h2>
            Latest results <Link href="/matches" className="card-link">All matches →</Link>
          </h2>
          {recent.map((m) => (
            <MatchLine key={m.id} m={m} />
          ))}
        </div>
        <div className="card">
          <h2>
            Top scorers <Link href="/players?sort=goals" className="card-link">Squad →</Link>
          </h2>
          {scorers.length ? (
            <ol className="rank-list">
              {scorers.map((p, i) => (
                <li key={p.player.id}>
                  <span className="pos">{i + 1}</span>
                  <PlayerLink id={p.player.id} />
                  <span className="val">{p.goals}</span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>Nobody has scored yet this season.</Empty>
          )}
        </div>
        <div className="card">
          <h2>
            Top assists <Link href="/players?sort=assists" className="card-link">Squad →</Link>
          </h2>
          {assisters.length ? (
            <ol className="rank-list">
              {assisters.map((p, i) => (
                <li key={p.player.id}>
                  <span className="pos">{i + 1}</span>
                  <PlayerLink id={p.player.id} />
                  <span className="val">{p.assists}</span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>No assists yet this season.</Empty>
          )}
        </div>
      </div>

      <div className="grid grid-2 section">
        {[
          { hall: "Hall of Fame", cls: "hall-fame", award: fame },
          { hall: "Hall of Shame", cls: "hall-shame", award: shame },
        ].map(({ hall, cls, award }) => (
          <Link key={hall} href="/halls" className={`hall ${cls}`} style={{ textDecoration: "none" }}>
            <div className="kicker" style={{ color: "inherit" }}>{hall}</div>
            <h2 style={{ margin: "6px 0" }}>
              {award.icon} {award.title}
            </h2>
            <p style={{ margin: 0 }}>
              {award.leaders[0] ? `${award.leaders[0].player.name} · ${award.leaders[0].display}` : "Vacant"} — see the full list →
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
