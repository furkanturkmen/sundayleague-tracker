import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PlayerLink, ResultBadge } from "@/components/ui";
import { fixtureTitle, formatDate, played, seasonLabel, seasons, summarise, upcoming } from "@/lib/stats";

export const metadata: Metadata = { title: "Matches" };

export default function MatchesPage() {
  return (
    <>
      <PageHeader title="Matches" kicker="Fixtures & results" />

      {upcoming.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2>Upcoming</h2>
          <div className="table-wrap">
            <table>
              <tbody>
                {upcoming.map((m) => (
                  <tr key={m.id}>
                    <td className="muted">{formatDate(m.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                    <td className="strong">{fixtureTitle(m)}</td>
                    <td><span className="chip">{m.competition}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {[...seasons].reverse().map((season) => {
        const list = played.filter((m) => m.season === season).reverse();
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
                        <Link href={`/matches/${m.id}`}>{m.opponent}</Link> <span className="muted small">({m.venue})</span>
                      </td>
                      <td>{m.competition !== "League" && <span className="chip">{m.competition}</span>}</td>
                      <td className="num strong">
                        <Link href={`/matches/${m.id}`}>{m.gf}–{m.ga}</Link>
                      </td>
                      <td className="small">
                        {m.goals.length === 0 && <span className="muted">–</span>}
                        {m.goals.map((g, i) => (
                          <span key={i}>
                            {i > 0 && ", "}
                            <PlayerLink id={g.scorer} />
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
      <p className="small muted">Scores are shown DWS first.</p>
    </>
  );
}
