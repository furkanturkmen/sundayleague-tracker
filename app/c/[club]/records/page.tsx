import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader, ResultBadge } from "@/components/ui";
import { loadClub } from "@/lib/club";
import {
  assistsInMatch,
  formatDate,
  goalsInMatch,
  groupSummary,
  longestRun,
  maxBy,
  seasonLabel,
  summarise,
  type PlayedMatch,
  type Run,
  type Stats,
} from "@/lib/stats";

export const metadata: Metadata = { title: "Records" };

function Record({ label, value, children }: { label: string; value: ReactNode; children?: ReactNode }) {
  return (
    <div className="card record">
      <div className="record-label">{label}</div>
      <div className="record-value">{value}</div>
      {children && <div className="record-detail">{children}</div>}
    </div>
  );
}

function MatchRef({ st, m }: { st: Stats; m?: PlayedMatch }) {
  if (!m) return <>–</>;
  return (
    <Link href={`${st.base}/matches/${m.id}`}>
      vs {m.opponent} ({m.venue}), {formatDate(m.date)}
    </Link>
  );
}

function RunRef({ run }: { run: Run }) {
  if (!run.from || !run.to) return <>Not yet</>;
  return (
    <>
      {formatDate(run.from.date)} → {formatDate(run.to.date)}
    </>
  );
}

export default async function RecordsPage({ params }: { params: Promise<{ club: string }> }) {
  const { st } = await loadClub((await params).club);
  const ms = st.played;
  const { seasons, inSeason, allStats, playerName } = st;
  if (ms.length === 0) return (
    <>
      <PageHeader title="Club records" kicker="All time" />
      <p className="empty">Records start once the first result is in.</p>
    </>
  );
  const biggestWin = maxBy(ms.filter((m) => m.result === "W"), (m) => m.gf - m.ga + m.gf / 100);
  const worstLoss = maxBy(ms.filter((m) => m.result === "L"), (m) => m.ga - m.gf + m.ga / 100);
  const highest = maxBy(ms, (m) => m.gf + m.ga);
  const mostScored = maxBy(ms, (m) => m.gf);
  const mostConceded = maxBy(ms, (m) => m.ga);

  const goalsMatch = st.bestInMatch(ms, goalsInMatch);
  const assistsMatch = st.bestInMatch(ms, assistsInMatch);

  const allGoals = ms.flatMap((m) => m.goals.filter((g) => g.minute !== undefined && g.scorer !== "og").map((g) => ({ g, m })));
  const earliest = allGoals.reduce<(typeof allGoals)[number] | undefined>((b, x) => (!b || x.g.minute! < b.g.minute! ? x : b), undefined);
  const latest = allGoals.reduce<(typeof allGoals)[number] | undefined>((b, x) => (!b || x.g.minute! > b.g.minute! ? x : b), undefined);

  const seasonRows = seasons.map((s) => {
    const list = inSeason(s);
    const st = allStats(list);
    return {
      season: s,
      sum: summarise(list),
      topScorer: maxBy(st, (p) => p.goals),
      topAssist: maxBy(st, (p) => p.assists),
      topMotm: maxBy(st, (p) => p.motm),
    };
  });

  const bestSeasonGoals = maxBy(
    seasons.flatMap((s) => allStats(inSeason(s)).map((p) => ({ ...p, season: s }))),
    (p) => p.goals,
  );

  const opponents = groupSummary(ms, (m) => m.opponent).sort((a, b) => b.p - a.p || b.ppg - a.ppg);

  return (
    <>
      <PageHeader title="Club records" kicker="All time" />

      <h2>Results</h2>
      <div className="grid grid-3">
        <Record label="Biggest win" value={biggestWin ? `${biggestWin.gf}–${biggestWin.ga}` : "–"}>
          <MatchRef st={st} m={biggestWin} />
        </Record>
        <Record label="Heaviest defeat" value={worstLoss ? `${worstLoss.gf}–${worstLoss.ga}` : "–"}>
          <MatchRef st={st} m={worstLoss} />
        </Record>
        <Record label="Highest scoring game" value={highest ? `${highest.gf + highest.ga} goals` : "–"}>
          {highest && <>{highest.gf}–{highest.ga} </>}
          <MatchRef st={st} m={highest} />
        </Record>
        <Record label="Most goals scored" value={mostScored?.gf ?? "–"}>
          <MatchRef st={st} m={mostScored} />
        </Record>
        <Record label="Most goals conceded" value={mostConceded?.ga ?? "–"}>
          <MatchRef st={st} m={mostConceded} />
        </Record>
      </div>

      <h2 className="section">Streaks</h2>
      <div className="grid grid-3">
        {[
          { label: "Longest winning run", run: longestRun(ms, (m) => m.result === "W") },
          { label: "Longest unbeaten run", run: longestRun(ms, (m) => m.result !== "L") },
          { label: "Most clean sheets in a row", run: longestRun(ms, (m) => m.ga === 0) },
          { label: "Scored in consecutive games", run: longestRun(ms, (m) => m.gf > 0) },
          { label: "Longest losing run", run: longestRun(ms, (m) => m.result === "L") },
          { label: "Longest winless run", run: longestRun(ms, (m) => m.result !== "W") },
        ].map(({ label, run }) => (
          <Record key={label} label={label} value={`${run.length} game${run.length === 1 ? "" : "s"}`}>
            <RunRef run={run} />
          </Record>
        ))}
      </div>

      <h2 className="section">Individual</h2>
      <div className="grid grid-3">
        <Record label="Most goals in a game" value={goalsMatch ? `${goalsMatch.value} · ${goalsMatch.player.name}` : "–"}>
          <MatchRef st={st} m={goalsMatch?.match} />
        </Record>
        <Record label="Most assists in a game" value={assistsMatch ? `${assistsMatch.value} · ${assistsMatch.player.name}` : "–"}>
          <MatchRef st={st} m={assistsMatch?.match} />
        </Record>
        <Record label="Most goals in a season" value={bestSeasonGoals ? `${bestSeasonGoals.goals} · ${bestSeasonGoals.player.name}` : "–"}>
          {bestSeasonGoals && seasonLabel(bestSeasonGoals.season)}
        </Record>
        <Record label="Fastest goal" value={earliest ? `${earliest.g.minute}′` : "–"}>
          {earliest && (
            <>
              <Link href={`${st.base}/players/${earliest.g.scorer}`}>{playerName(earliest.g.scorer)}</Link>{" "}
              <MatchRef st={st} m={earliest.m} />
            </>
          )}
        </Record>
        <Record label="Latest goal" value={latest ? `${latest.g.minute}′` : "–"}>
          {latest && (
            <>
              <Link href={`${st.base}/players/${latest.g.scorer}`}>{playerName(latest.g.scorer)}</Link>{" "}
              <MatchRef st={st} m={latest.m} />
            </>
          )}
        </Record>
      </div>

      <div className="card section">
        <h2>Season by season</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Season</th>
                <th className="num">P</th>
                <th className="num">W</th>
                <th className="num">D</th>
                <th className="num">L</th>
                <th className="num">GF</th>
                <th className="num">GA</th>
                <th className="num">Pts</th>
                <th>Top scorer</th>
                <th>Top assists</th>
                <th>Most MOTM</th>
              </tr>
            </thead>
            <tbody>
              {[...seasonRows].reverse().map((r) => (
                <tr key={r.season}>
                  <td className="strong">{seasonLabel(r.season)}</td>
                  <td className="num">{r.sum.p}</td>
                  <td className="num">{r.sum.w}</td>
                  <td className="num">{r.sum.d}</td>
                  <td className="num">{r.sum.l}</td>
                  <td className="num">{r.sum.gf}</td>
                  <td className="num">{r.sum.ga}</td>
                  <td className="num strong">{r.sum.pts}</td>
                  <td>{r.topScorer && r.topScorer.goals > 0 ? `${r.topScorer.player.name} (${r.topScorer.goals})` : "–"}</td>
                  <td>{r.topAssist && r.topAssist.assists > 0 ? `${r.topAssist.player.name} (${r.topAssist.assists})` : "–"}</td>
                  <td>{r.topMotm && r.topMotm.motm > 0 ? `${r.topMotm.player.name} (${r.topMotm.motm})` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card section">
        <h2>Head to head</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Opponent</th>
                <th className="num">P</th>
                <th className="num">W</th>
                <th className="num">D</th>
                <th className="num">L</th>
                <th className="num">GF</th>
                <th className="num">GA</th>
                <th className="num">PPG</th>
                <th>Last</th>
              </tr>
            </thead>
            <tbody>
              {opponents.map((o) => {
                const last = [...ms].reverse().find((m) => m.opponent === o.name);
                return (
                  <tr key={o.name}>
                    <td className="strong">{o.name}</td>
                    <td className="num">{o.p}</td>
                    <td className="num">{o.w}</td>
                    <td className="num">{o.d}</td>
                    <td className="num">{o.l}</td>
                    <td className="num">{o.gf}</td>
                    <td className="num">{o.ga}</td>
                    <td className="num">{o.ppg.toFixed(2)}</td>
                    <td>
                      {last && (
                        <Link href={`${st.base}/matches/${last.id}`} style={{ textDecoration: "none" }}>
                          <ResultBadge result={last.result} /> <span className="small">{last.gf}–{last.ga}</span>
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
