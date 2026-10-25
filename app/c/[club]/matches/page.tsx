import type { Metadata } from "next";
import Link from "next/link";
import { Crest, GetStarted, PageHeader, PlayerLink, ResultBadge, TeamLogo } from "@/components/ui";
import { loadClub } from "@/lib/club";
import { formatDate, seasonLabel, seasonOf, summarise, type PlayedMatch, type Stats } from "@/lib/stats";

export const metadata: Metadata = { title: "Matches" };

export default async function MatchesPage({ params }: { params: Promise<{ club: string }> }) {
  const { data, st, admin } = await loadClub((await params).club);
  const last = st.played[st.played.length - 1];

  return (
    <>
      <PageHeader
        title="Matches"
        kicker="Fixtures & results"
        actions={admin && <Link href={`${st.base}/matches/new`} className="btn">+ Add match</Link>}
      />

      {last && <LastMatch st={st} m={last} club={data.club} />}

      {st.upcoming.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2>Upcoming</h2>
          <div className="table-wrap">
            <table>
              <tbody>
                {st.upcoming.map((m) => (
                  <tr key={m.id}>
                    <td className="muted">{formatDate(m.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                    <td className="strong">
                      <span className="with-logo">
                        <TeamLogo code={m.opponentCode} name={m.opponent} />
                        <Link href={`${st.base}/matches/${m.id}`}>{st.fixtureTitle(m)}</Link>
                        {m.kickoff && <span className="muted small">{m.kickoff}</span>}
                      </span>
                    </td>
                    <td>{m.competition !== "League" && <span className="chip">{m.competition}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {st.played.length === 0 && <GetStarted st={st} admin={admin} what="matches" />}

      {[...st.seasons].reverse().map((season) => {
        const list = st.inSeason(season).reverse();
        const s = summarise(list);
        const voided = st.voided.filter((m) => seasonOf(m.date) === season);
        // Abandoned and called-off matches sit between the results by date, without counting.
        const rows = [...list.map((m) => ({ m, played: m })), ...voided.map((m) => ({ m, played: undefined }))].sort((a, b) =>
          b.m.date.localeCompare(a.m.date),
        );
        return (
          <section key={season} className="card" style={{ marginBottom: 24 }}>
            <h2>
              {seasonLabel(season)}
              <span className="small muted" style={{ fontWeight: 600 }}>
                P{s.p} W{s.w} D{s.d} L{s.l} · {s.gf}–{s.ga}
              </span>
            </h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th></th>
                    <th className="num">Score</th>
                    <th>Scorers</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ m, played }) => (
                    <tr key={m.id} className={played ? undefined : "voided"}>
                      <td>{played ? <ResultBadge result={played.result} /> : <span className="chip">{m.status === "abandoned" ? "Abandoned" : "Called off"}</span>}</td>
                      <td className="muted">{formatDate(m.date, { day: "numeric", month: "short" })}</td>
                      <td className="strong">
                        <span className="with-logo">
                          <TeamLogo code={m.opponentCode} name={m.opponent} />
                          <Link href={`${st.base}/matches/${m.id}`}>{m.opponent}</Link> <span className="muted small">({m.venue})</span>
                        </span>
                      </td>
                      <td>{m.competition !== "League" && <span className="chip">{m.competition}</span>}</td>
                      <td className="num strong">
                        <Link href={`${st.base}/matches/${m.id}`}>{played ? `${played.gf}–${played.ga}` : "–"}</Link>
                      </td>
                      <td className="small">
                        {m.goals.length === 0 && <span className="muted">–</span>}
                        {m.goals.map((g, i) => (
                          <span key={i}>
                            {i > 0 && ", "}
                            <PlayerLink st={st} id={g.scorer} />
                            {g.minute !== undefined && <span className="muted"> {g.minute}′</span>}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      {st.played.length > 0 && <p className="small muted">Scores are shown with ours first.</p>}
    </>
  );
}

/** The most recent result, in full, above the fixture list. */
function LastMatch({ st, m, club }: { st: Stats; m: PlayedMatch; club: { name: string; shortName: string; logo: string | null } }) {
  const us = <Crest short={club.shortName} logo={club.logo} size={44} />;
  const them = <TeamLogo code={m.opponentCode} name={m.opponent} size={52} />;
  const home = m.venue === "H" ? { crest: us, name: club.name } : { crest: them, name: m.opponent };
  const away = m.venue === "H" ? { crest: them, name: m.opponent } : { crest: us, name: club.name };
  const [hs, as] = m.venue === "H" ? [m.gf, m.ga] : [m.ga, m.gf];
  const unassigned = m.gf - m.goals.length;

  return (
    <section className="card last-match">
      <h2>
        <span className="h2-title">Last match</span>
        <Link href={`${st.base}/matches/${m.id}`} className="card-link">
          Match details →
        </Link>
      </h2>
      <div className="scoreboard">
        <div className="team">
          {home.crest}
          <span>{home.name}</span>
        </div>
        <div className="big">
          {hs}–{as}
        </div>
        <div className="team">
          {away.crest}
          <span>{away.name}</span>
        </div>
      </div>
      <div className="meta-row">
        <ResultBadge result={m.result} />
        <span>{formatDate(m.date, { weekday: "long", day: "numeric", month: "long" })}</span>
        <span>{m.competition}</span>
      </div>
      <ul className="last-match-events">
        {m.goals.map((g, i) => (
          <li key={i}>
            <span className="muted">Goal</span>
            <span>
              <strong>
                <PlayerLink st={st} id={g.scorer} />
              </strong>
              {g.minute !== undefined && <span className="muted"> {g.minute}′</span>}
              {g.penalty && <span className="muted"> (pen)</span>}
              {g.assist && <span className="muted small"> · assist {st.playerName(g.assist)}</span>}
            </span>
          </li>
        ))}
        {unassigned > 0 && (
          <li>
            <span className="muted">Goal</span>
            <span className="muted">
              {unassigned} {unassigned === 1 ? "goal" : "goals"} without a scorer yet
            </span>
          </li>
        )}
        {m.motm && (
          <li>
            <span className="muted">MOTM</span>
            <strong>
              <PlayerLink st={st} id={m.motm} />
            </strong>
          </li>
        )}
        {m.cards.map((c, i) => (
          <li key={`c${i}`}>
            <span className="muted">{c.type === "Y" ? "Yellow" : "Red"}</span>
            <PlayerLink st={st} id={c.player} />
          </li>
        ))}
      </ul>
    </section>
  );
}
