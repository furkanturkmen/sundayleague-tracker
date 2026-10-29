import type { Metadata } from "next";
import Link from "next/link";
import { BarChart } from "@/components/BarChart";
import { Band } from "@/components/home/Band";
import { CountUp, Reveal } from "@/components/home/Motion";
import { Page, PageHero, SeasonLinks, StatsNav } from "@/components/home/Page";
import { loadClub } from "@/lib/club";
import { MINUTE_BUCKETS, byMonth, formatDate, formatMonth, goalsByMinute, groupSummary, partnerships, seasonLabel, summarise, type Summary } from "@/lib/stats";

export const metadata: Metadata = { title: "Stats" };

// The season taken apart: the headline numbers, the form as a row of letters, when the goals come, where we do
// well and who makes the difference.

function SplitTable({ rows, label }: { rows: ({ name: string } & Summary)[]; label: string }) {
  return (
    <div className="hx-table st-split">
      <table>
        <thead>
          <tr>
            <th>{label}</th>
            <th className="num">P</th>
            <th className="num st-wide">W</th>
            <th className="num st-wide">D</th>
            <th className="num st-wide">L</th>
            <th className="num">Goals</th>
            <th className="num">PPG</th>
            <th className="num">Won</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td className="num">{r.p}</td>
              <td className="num st-wide">{r.w}</td>
              <td className="num st-wide">{r.d}</td>
              <td className="num st-wide">{r.l}</td>
              <td className="num">
                {r.gf}–{r.ga}
              </td>
              <td className="num">{r.ppg.toFixed(2)}</td>
              <td className="num">
                <span className="st-meter" aria-hidden="true">
                  <span style={{ width: `${r.winPct}%` }} />
                </span>
                {Math.round(r.winPct)}%
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
  const { data, st } = await loadClub((await params).club);
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
  const goals = ms.flatMap((m) => m.goals);
  const firstHalf = goals.filter((g) => g.minute !== undefined && g.minute <= 45).length;
  const secondHalf = goals.filter((g) => g.minute !== undefined && g.minute > 45).length;
  const penalties = goals.filter((g) => g.penalty).length;
  const failedToScore = ms.filter((m) => m.gf === 0).length;

  const numbers: { label: string; value: number; shown?: string; suffix?: string; sub?: string }[] = [
    { label: "Played", value: s.p, sub: `${s.w}W ${s.d}D ${s.l}L` },
    { label: "Win rate", value: Math.round(s.winPct), suffix: "%" },
    { label: "Points a game", value: s.ppg, shown: s.ppg.toFixed(2) },
    { label: "Goal difference", value: s.gd, shown: s.gd > 0 ? `+${s.gd}` : String(s.gd) },
    { label: "Scored a game", value: s.p ? s.gf / s.p : 0, shown: s.p ? (s.gf / s.p).toFixed(1) : "0", sub: `${s.gf} in all` },
    { label: "Conceded a game", value: s.p ? s.ga / s.p : 0, shown: s.p ? (s.ga / s.p).toFixed(1) : "0", sub: `${s.ga} in all` },
    { label: "Clean sheets", value: s.cleanSheets },
    { label: "Blanks", value: failedToScore, sub: "games without a goal" },
  ];

  return (
    <Page accent={data.club.accent}>
      <PageHero lead="The" accent="numbers." meta={`${seasonLabel(season)} · ${s.p} ${s.p === 1 ? "match" : "matches"}`}>
        <StatsNav base={st.base} active="overview" />
        <SeasonLinks href={(x) => `${st.base}/stats?season=${x}`} seasons={st.seasons} active={season} />
      </PageHero>

      <div className="hx-bands">
        {ms.length === 0 ? (
          <div className="hx-wrap hx-start">
            <p className="hx-empty">No matches played in this period.</p>
          </div>
        ) : (
          <>
            <Band className="hx-band-numbers" labelledBy="st-numbers-title">
              <h2 id="st-numbers-title" className="sr-only">
                In numbers
              </h2>
              <Reveal className="hx-numbers st-numbers">
                {numbers.map((n) => (
                  <div key={n.label}>
                    <span className="hx-number">{n.shown ?? <CountUp value={n.value} suffix={n.suffix} />}</span>
                    <span className="hx-label">{n.label}</span>
                    {n.sub && <span className="st-sub">{n.sub}</span>}
                  </div>
                ))}
              </Reveal>

              <Reveal className="st-form-wrap" delay={0.05}>
                <h3 className="hx-label">Form, oldest first</h3>
                <ol className="st-form">
                  {ms.map((m) => (
                    <li key={m.id}>
                      <Link href={`${st.base}/matches/${m.id}`} className={`hx-${m.result}`} title={`${m.gf}–${m.ga} vs ${m.opponent}, ${formatDate(m.date)}`}>
                        {m.result}
                      </Link>
                    </li>
                  ))}
                </ol>
              </Reveal>
            </Band>

            <Band className="hx-band-halls" labelledBy="st-when-title">
              <Reveal className="hx-head">
                <h2 id="st-when-title">
                  When it <em>happens.</em>
                </h2>
                <p>
                  {firstHalf} goals before half-time, {secondHalf} after. {penalties} from the spot.
                </p>
              </Reveal>
              <div className="st-charts">
                <Reveal>
                  <BarChart
                    title="Goals scored by month"
                    data={months.map((m) => ({ label: formatMonth(m.month), value: m.gf, hint: `${formatMonth(m.month)} · ${m.p} played` }))}
                  />
                </Reveal>
                <Reveal delay={0.06}>
                  <BarChart
                    title="Goals conceded by month"
                    tone="against"
                    data={months.map((m) => ({ label: formatMonth(m.month), value: m.ga, hint: `${formatMonth(m.month)} · ${m.p} played` }))}
                  />
                </Reveal>
                <Reveal>
                  <BarChart title="When we score" data={MINUTE_BUCKETS.map((b, i) => ({ label: b, value: minutes[i], hint: `Minutes ${b}` }))} />
                </Reveal>
                <Reveal delay={0.06}>
                  <BarChart
                    title="Points by month"
                    data={months.map((m) => ({ label: formatMonth(m.month), value: m.pts, hint: `${formatMonth(m.month)} · ${m.w}W ${m.d}D ${m.l}L` }))}
                    unit=" pts"
                  />
                </Reveal>
              </div>
            </Band>

            <Band className="hx-band-pitch" labelledBy="st-where-title">
              <Reveal className="hx-head">
                <h2 id="st-where-title">
                  Where we <em>win.</em>
                </h2>
              </Reveal>
              <div className="st-two">
                <Reveal>
                  <SplitTable rows={venues} label="Venue" />
                </Reveal>
                <Reveal delay={0.06}>
                  <SplitTable rows={comps} label="Competition" />
                </Reveal>
              </div>
            </Band>

            <Band className="hx-band-board" labelledBy="st-who-title">
              <Reveal className="hx-head">
                <h2 id="st-who-title">
                  Who makes the <em>difference.</em>
                </h2>
                <p>Small samples, so take it with a pinch of salt.</p>
              </Reveal>
              <div className="st-two">
                <Reveal className="st-duos">
                  <h3>Best partnerships</h3>
                  <p className="hx-label">Who set up whom</p>
                  {duos.length ? (
                    <ol>
                      {duos.map((d, i) => (
                        <li key={`${d.assist}-${d.scorer}`}>
                          <span className="hx-rank">{i + 1}</span>
                          <span className="st-duo">
                            <Link href={`${st.base}/players/${d.assist}`}>{st.playerName(d.assist)}</Link>
                            <span aria-label="to"> → </span>
                            <Link href={`${st.base}/players/${d.scorer}`}>{st.playerName(d.scorer)}</Link>
                          </span>
                          <b>{d.count}</b>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="hx-empty">No assisted goals yet.</p>
                  )}
                </Reveal>

                <Reveal className="st-impact" delay={0.06}>
                  <h3>With and without</h3>
                  <p className="hx-label">Points a game with each player in the squad and without them. The small numbers are games with and without.</p>
                  {impact.length ? (
                    <div className="hx-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Player</th>
                            <th className="num">With</th>
                            <th className="num">Without</th>
                            <th className="num">Diff</th>
                          </tr>
                        </thead>
                        <tbody>
                          {impact.map((r) => (
                            <tr key={r.player.id}>
                              <td>
                                <Link href={`${st.base}/players/${r.player.id}`}>{r.player.name}</Link>
                                <small className="st-games">
                                  {" "}
                                  {r.with.p}/{r.without.p}
                                </small>
                              </td>
                              <td className="num">{r.with.ppg.toFixed(2)}</td>
                              <td className="num">{r.without.ppg.toFixed(2)}</td>
                              <td className={`num ${r.diff >= 0 ? "st-up" : "st-down"}`}>
                                {r.diff >= 0 ? "+" : "−"}
                                {Math.abs(r.diff).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="hx-empty">Everyone has played every game, so there&apos;s nothing to compare.</p>
                  )}
                </Reveal>
              </div>
            </Band>
          </>
        )}
      </div>
    </Page>
  );
}
