import type { Metadata } from "next";
import Link from "next/link";
import { GetStarted, PageHeader, PlayerLink, ResultBadge } from "@/components/ui";
import { loadClub } from "@/lib/club";
import { formatDate, seasonLabel, summarise } from "@/lib/stats";

export const metadata: Metadata = { title: "Matches" };

export default async function MatchesPage({ params }: { params: Promise<{ club: string }> }) {
  const { st, admin } = await loadClub((await params).club);

  return (
    <>
      <PageHeader
        title="Matches"
        kicker="Fixtures & results"
        actions={admin && <Link href={`${st.base}/matches/new`} className="btn">+ Add match</Link>}
      />

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
                      <Link href={`${st.base}/matches/${m.id}`}>{st.fixtureTitle(m)}</Link>
                    </td>
                    <td><span className="chip">{m.competition}</span></td>
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
                  {list.map((m) => (
                    <tr key={m.id}>
                      <td><ResultBadge result={m.result} /></td>
                      <td className="muted">{formatDate(m.date, { day: "numeric", month: "short" })}</td>
                      <td className="strong">
                        <Link href={`${st.base}/matches/${m.id}`}>{m.opponent}</Link> <span className="muted small">({m.venue})</span>
                      </td>
                      <td>{m.competition !== "League" && <span className="chip">{m.competition}</span>}</td>
                      <td className="num strong">
                        <Link href={`${st.base}/matches/${m.id}`}>{m.gf}–{m.ga}</Link>
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
