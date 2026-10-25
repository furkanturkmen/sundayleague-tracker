import type { Metadata } from "next";
import Link from "next/link";
import { BarChart } from "@/components/BarChart";
import { Empty, FormGuide, PageHeader, PlayerLink, SeasonTabs, StatsTabs, StatTile } from "@/components/ui";
import { loadClub } from "@/lib/club";
import { MINUTE_BUCKETS, byMonth, formatMonth, goalsByMinute, groupSummary, partnerships, seasonLabel, summarise, type Summary } from "@/lib/stats";

export const metadata: Metadata = { title: "Stats" };

function SplitTable({ rows, label }: { rows: ({ name: string } & Summary)[]; label: string }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{label}</th>
            <th className="num">P</th>
            <th className="num">W</th>
            <th className="num">D</th>
            <th className="num">L</th>
            <th className="num">GF</th>
            <th className="num">GA</th>
            <th className="num">PPG</th>
            <th>Win %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="strong">{r.name}</td>
              <td className="num">{r.p}</td>
              <td className="num">{r.w}</td>
              <td className="num">{r.d}</td>
              <td className="num">{r.l}</td>
              <td className="num">{r.gf}</td>
              <td className="num">{r.ga}</td>
              <td className="num">{r.ppg.toFixed(2)}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="meter" aria-hidden="true">
                    <span style={{ width: `${r.winPct}%` }} />
                  </div>
                  <span className="small">{Math.round(r.winPct)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Props = { params: Promise<{ club: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AnalysisPage({ params, searchParams }: Props) {
  const { st } = await loadClub((await params).club);
  const query = await searchParams;
  const season = st.resolveSeason(query.season);
  const ms = st.inSeason(season);
  const s = summarise(ms);
  const months = byMonth(ms);
  const minutes = goalsByMinute(ms);
  const venues = groupSummary(ms, (m) => (m.venue === "H" ? "Home" : "Away"));
  const comps = groupSummary(ms, (m) => m.competition);
  const duos = partnerships(ms).slice(0, 8);
  const impact = st.withWithout(ms);
  const ppgRanked = impact.slice(0, 6);
  const firstHalf = ms.flatMap((m) => m.goals).filter((g) => g.minute !== undefined && g.minute <= 45).length;
  const secondHalf = ms.flatMap((m) => m.goals).filter((g) => g.minute !== undefined && g.minute > 45).length;
  const penalties = ms.flatMap((m) => m.goals).filter((g) => g.penalty).length;
  const failedToScore = ms.filter((m) => m.gf === 0).length;

  return (
    <>
      <PageHeader title="Stats" kicker={seasonLabel(season)}>
        <StatsTabs base={st.base} active="overview" />
        <SeasonTabs base={`${st.base}/stats`} seasons={st.seasons} active={season} />
      </PageHeader>

      {ms.length === 0 ? (
        <Empty>No matches played in this period.</Empty>
      ) : (
        <>
          <div className="tiles">
            <StatTile label="Played" value={s.p} sub={`${s.w}W ${s.d}D ${s.l}L`} />
            <StatTile label="Win rate" value={`${Math.round(s.winPct)}%`} />
            <StatTile label="Points per game" value={s.ppg.toFixed(2)} />
            <StatTile label="Goals per game" value={(s.gf / s.p).toFixed(1)} sub={`${s.gf} scored`} />
            <StatTile label="Conceded per game" value={(s.ga / s.p).toFixed(1)} sub={`${s.ga} conceded`} />
            <StatTile label="Goal difference" value={s.gd > 0 ? `+${s.gd}` : s.gd} />
            <StatTile label="Clean sheets" value={s.cleanSheets} />
            <StatTile label="Blanks" value={failedToScore} sub="games without scoring" />
          </div>

          <div className="card section">
            <h2>Form</h2>
            <FormGuide st={st} matches={ms} />
          </div>

          <div className="grid grid-2 section">
            <div className="card">
              <BarChart title="Goals scored by month" data={months.map((m) => ({ label: formatMonth(m.month), value: m.gf, hint: `${formatMonth(m.month)} · ${m.p} played` }))} />
            </div>
            <div className="card">
              <BarChart title="Goals conceded by month" tone="against" data={months.map((m) => ({ label: formatMonth(m.month), value: m.ga, hint: `${formatMonth(m.month)} · ${m.p} played` }))} />
            </div>
            <div className="card">
              <BarChart title="When we score" data={MINUTE_BUCKETS.map((b, i) => ({ label: b, value: minutes[i], hint: `Minutes ${b}` }))} />
              <p className="small muted" style={{ marginBottom: 0 }}>
                {firstHalf} first half, {secondHalf} second half · {penalties} from the spot
              </p>
            </div>
            <div className="card">
              <BarChart title="Points by month" data={months.map((m) => ({ label: formatMonth(m.month), value: m.pts, hint: `${formatMonth(m.month)} · ${m.w}W ${m.d}D ${m.l}L` }))} unit=" pts" />
            </div>
          </div>

          <div className="grid grid-2 section">
            <div className="card">
              <h2>Home vs away</h2>
              <SplitTable rows={venues} label="Venue" />
            </div>
            <div className="card">
              <h2>By competition</h2>
              <SplitTable rows={comps} label="Competition" />
            </div>
          </div>

          <div className="grid grid-2 section">
            <div className="card">
              <h2>Best partnerships</h2>
              {duos.length ? (
                <ol className="rank-list">
                  {duos.map((d, i) => (
                    <li key={`${d.assist}-${d.scorer}`}>
                      <span className="pos">{i + 1}</span>
                      <span>
                        <PlayerLink st={st} id={d.assist} /> <span className="muted">→</span> <PlayerLink st={st} id={d.scorer} />
                      </span>
                      <span className="val">{d.count}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty>No assisted goals yet.</Empty>
              )}
              <p className="small muted" style={{ marginBottom: 0 }}>Assist provider → goalscorer</p>
            </div>

            <div className="card">
              <h2>With and without</h2>
              {ppgRanked.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th className="num">PPG with</th>
                        <th className="num">PPG without</th>
                        <th className="num">Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {impact.map((r) => (
                        <tr key={r.player.id}>
                          <td className="strong">
                            <Link href={`${st.base}/players/${r.player.id}`}>{r.player.name}</Link>
                            <span className="muted small"> ({r.with.p}/{r.without.p})</span>
                          </td>
                          <td className="num">{r.with.ppg.toFixed(2)}</td>
                          <td className="num">{r.without.ppg.toFixed(2)}</td>
                          <td className={`num ${r.diff >= 0 ? "diff-pos" : "diff-neg"}`}>
                            {r.diff >= 0 ? "+" : ""}
                            {r.diff.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty>Everyone has played every game - nothing to compare.</Empty>
              )}
              <p className="small muted" style={{ marginBottom: 0 }}>
                Points per game with each player in the squad vs without. Numbers in brackets are games with/without. Small samples - take with a pinch of salt.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
