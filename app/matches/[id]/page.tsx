import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty, PlayerLink, ResultBadge } from "@/components/ui";
import { club } from "@/data/club";
import { matches } from "@/data/matches";
import { fixtureTitle, formatDate, getMatch, getPlayed, neighbours, playerName, seasonLabel, seasonOf } from "@/lib/stats";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return matches.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const m = getMatch(id);
  return { title: m ? `${fixtureTitle(m)} (${formatDate(m.date)})` : "Match" };
}

export default async function MatchPage({ params }: Props) {
  const { id } = await params;
  const fixture = getMatch(id);
  if (!fixture) notFound();
  const m = getPlayed(id);
  const { prev, next } = neighbours(id);

  const home = fixture.venue === "H" ? club.name : fixture.opponent;
  const away = fixture.venue === "H" ? fixture.opponent : club.name;
  const homeScore = m && (fixture.venue === "H" ? m.gf : m.ga);
  const awayScore = m && (fixture.venue === "H" ? m.ga : m.gf);
  const goals = [...fixture.goals].sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));

  return (
    <>
      <Link href="/matches" className="small muted">← All matches</Link>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="scoreboard">
          <div className="team">{home}</div>
          <div className="big">{m ? `${homeScore}–${awayScore}` : "vs"}</div>
          <div className="team">{away}</div>
        </div>
        <div className="meta-row">
          {m && <ResultBadge result={m.result} />}
          <span>{formatDate(fixture.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          <span>{fixture.competition}</span>
          <span>{seasonLabel(seasonOf(fixture.date))}</span>
          <span>{fixture.venue === "H" ? "Home" : "Away"}</span>
        </div>
      </div>

      {!m ? (
        <p className="section muted">Not played yet.</p>
      ) : (
        <div className="grid grid-3 section">
          <div className="card">
            <h2>Goals</h2>
            {goals.length ? (
              <ul className="event-list">
                {goals.map((g, i) => (
                  <li key={i}>
                    <span className="min">{g.minute !== undefined ? `${g.minute}′` : "–"}</span>
                    <span>
                      <strong><PlayerLink id={g.scorer} /></strong>
                      {g.penalty && <span className="muted"> (pen)</span>}
                      {g.assist && <span className="muted small"> · assist {playerName(g.assist)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Didn&apos;t trouble the scorers.</Empty>
            )}
            {(m.ownGoals.length > 0 || m.penaltiesMissed.length > 0) && (
              <ul className="event-list" style={{ marginTop: 14 }}>
                {m.ownGoals.map((p, i) => (
                  <li key={`og${i}`}><span className="min">OG</span><span><PlayerLink id={p} /> <span className="muted">scored an own goal</span></span></li>
                ))}
                {m.penaltiesMissed.map((p, i) => (
                  <li key={`pm${i}`}><span className="min">✗</span><span><PlayerLink id={p} /> <span className="muted">missed a penalty</span></span></li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2>Awards & discipline</h2>
            <ul className="event-list">
              <li>
                <span className="min">⭐</span>
                <span>{m.motm ? <><strong><PlayerLink id={m.motm} /></strong> <span className="muted">Man of the Match</span></> : <span className="muted">No Man of the Match given</span>}</span>
              </li>
              {m.cards.map((c, i) => (
                <li key={i}>
                  <span className="min"><span className={c.type === "Y" ? "card-y" : "card-r"} title={c.type === "Y" ? "Yellow card" : "Red card"} /></span>
                  <span><PlayerLink id={c.player} /> <span className="muted">{c.type === "Y" ? "booked" : "sent off"}</span></span>
                </li>
              ))}
            </ul>
            {m.notes && <p style={{ marginBottom: 0, color: "var(--ink-2)" }}>{m.notes}</p>}
          </div>

          <div className="card">
            <h2>Squad ({m.squad.length})</h2>
            <ul className="event-list">
              {m.squad.map((p) => (
                <li key={p}><PlayerLink id={p} /></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="prev-next">
        {prev ? <Link href={`/matches/${prev.id}`}>← {prev.opponent}</Link> : <span />}
        {next && <Link href={`/matches/${next.id}`}>{next.opponent} →</Link>}
      </div>
    </>
  );
}
