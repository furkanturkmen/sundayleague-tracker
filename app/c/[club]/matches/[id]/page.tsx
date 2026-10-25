import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ConfirmSubmit } from "@/components/forms";
import { Empty, PlayerLink, ResultBadge } from "@/components/ui";
import { deleteMatch } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { formatDate, seasonLabel, seasonOf } from "@/lib/stats";

type Props = { params: Promise<{ club: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { club, id } = await params;
  const { st } = await loadClub(club);
  const m = st.getMatch(id);
  return { title: m ? `${st.fixtureTitle(m)} (${formatDate(m.date)})` : "Match" };
}

export default async function MatchPage({ params }: Props) {
  const { club: slug, id } = await params;
  const { data, st, admin } = await loadClub(slug);
  const fixture = st.getMatch(id);
  if (!fixture) notFound();
  const m = st.getPlayed(id);
  const { prev, next } = st.neighbours(id);
  const { club } = data;

  const home = fixture.venue === "H" ? club.name : fixture.opponent;
  const away = fixture.venue === "H" ? fixture.opponent : club.name;
  const homeScore = m && (fixture.venue === "H" ? m.gf : m.ga);
  const awayScore = m && (fixture.venue === "H" ? m.ga : m.gf);

  return (
    <>
      <div className="page-title-row">
        <Link href={`${st.base}/matches`} className="small muted">← All matches</Link>
        {admin && (
          <div className="form-actions">
            <Link href={`${st.base}/matches/${id}/edit`} className="btn btn-secondary">Edit</Link>
            <form action={deleteMatch.bind(null, slug)}>
              <input type="hidden" name="id" value={id} />
              <ConfirmSubmit message="Delete this match and everything recorded in it?">Delete</ConfirmSubmit>
            </form>
          </div>
        )}
      </div>
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
        <p className="section muted">Not played yet.{admin && " Edit the match to add the result once it's done."}</p>
      ) : (
        <div className="grid grid-3 section">
          <div className="card">
            <h2>Goals</h2>
            {m.gf > 0 ? (
              <ul className="event-list">
                {m.goals.map((g, i) => (
                  <li key={i}>
                    <span className="min">{g.minute !== undefined ? `${g.minute}′` : "–"}</span>
                    <span>
                      <strong><PlayerLink st={st} id={g.scorer} /></strong>
                      {g.penalty && <span className="muted"> (pen)</span>}
                      {g.assist && <span className="muted small"> · assist {st.playerName(g.assist)}</span>}
                    </span>
                  </li>
                ))}
                {/* The official score can come from voetbal.nl before anyone has said who scored. */}
                {m.gf > m.goals.length && (
                  <li>
                    <span className="min">–</span>
                    <span className="muted">
                      {m.gf - m.goals.length} {m.gf - m.goals.length === 1 ? "goal" : "goals"} without a scorer yet
                    </span>
                  </li>
                )}
              </ul>
            ) : (
              <Empty>Didn&apos;t trouble the scorers.</Empty>
            )}
            {(m.ownGoals.length > 0 || m.penaltiesMissed.length > 0) && (
              <ul className="event-list" style={{ marginTop: 14 }}>
                {m.ownGoals.map((p, i) => (
                  <li key={`og${i}`}><span className="min">OG</span><span><PlayerLink st={st} id={p} /> <span className="muted">scored an own goal</span></span></li>
                ))}
                {m.penaltiesMissed.map((p, i) => (
                  <li key={`pm${i}`}><span className="min"><Icon name="miss" /></span><span><PlayerLink st={st} id={p} /> <span className="muted">missed a penalty</span></span></li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2>Awards & discipline</h2>
            <ul className="event-list">
              <li>
                <span className="min"><Icon name="star" className="motm-star" /></span>
                <span>
                  {m.motm ? (
                    <>
                      <strong><PlayerLink st={st} id={m.motm} /></strong> <span className="muted">Man of the Match</span>
                    </>
                  ) : (
                    <span className="muted">No Man of the Match given</span>
                  )}
                </span>
              </li>
              {m.cards.map((c, i) => (
                <li key={i}>
                  <span className="min"><span className={c.type === "Y" ? "card-y" : "card-r"} title={c.type === "Y" ? "Yellow card" : "Red card"} /></span>
                  <span><PlayerLink st={st} id={c.player} /> <span className="muted">{c.type === "Y" ? "booked" : "sent off"}</span></span>
                </li>
              ))}
            </ul>
            {m.notes && <p style={{ marginBottom: 0, color: "var(--ink-2)" }}>{m.notes}</p>}
          </div>

          <div className="card">
            <h2>Squad ({m.squad.length})</h2>
            {m.squad.length ? (
              <ul className="event-list">
                {m.squad.map((p) => (
                  <li key={p}><PlayerLink st={st} id={p} /></li>
                ))}
              </ul>
            ) : (
              <Empty>Squad not recorded.</Empty>
            )}
          </div>
        </div>
      )}

      <div className="prev-next">
        {prev ? <Link href={`${st.base}/matches/${prev.id}`}>← {prev.opponent}</Link> : <span />}
        {next && <Link href={`${st.base}/matches/${next.id}`}>{next.opponent} →</Link>}
      </div>
    </>
  );
}
