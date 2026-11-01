import type { Metadata } from "next";
import Link from "next/link";
import { BarChart } from "@/components/BarChart";
import { Band } from "@/components/home/Band";
import { CountUp, Reveal } from "@/components/home/Motion";
import { Page, PageHero, SeasonLinks, StatsNav } from "@/components/home/Page";
import { loadClub } from "@/lib/club";
import type { T } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";
import { MINUTE_BUCKETS, byMonth, formatDate, formatMonth, goalsByMinute, groupSummary, partnerships, seasonLabel, summarise, type Summary } from "@/lib/stats";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Stats") };
}

/** How often each player id appears, most first, then by first appearance. */
function tally(ids: (string | undefined)[]): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const id of ids) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}

// The season taken apart: the headline numbers, the form as a row of letters, when the goals come, where we do
// well and who makes the difference.

function SplitTable({ rows, label, t }: { rows: ({ name: string } & Summary)[]; label: string; t: T }) {
  return (
    <div className="hx-table st-split">
      <table>
        <thead>
          <tr>
            <th>{label}</th>
            <th className="num">{t("P")}</th>
            <th className="num st-wide">{t("W")}</th>
            <th className="num st-wide">{t("D")}</th>
            <th className="num st-wide">{t("L")}</th>
            <th className="num">{t("Goals")}</th>
            <th className="num">{t("PPG")}</th>
            <th className="num">{t("Won")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{t(r.name)}</td>
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
  const t = await getT();
  const lang = await getLang();
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
  const captains = tally(ms.map((m) => m.captain));
  const motms = tally(ms.map((m) => m.motm));
  const goals = ms.flatMap((m) => m.goals);
  const firstHalf = goals.filter((g) => g.minute !== undefined && g.minute <= 45).length;
  const secondHalf = goals.filter((g) => g.minute !== undefined && g.minute > 45).length;
  const penalties = goals.filter((g) => g.penalty).length;
  const failedToScore = ms.filter((m) => m.gf === 0).length;

  const numbers: { label: string; value: number; shown?: string; suffix?: string; sub?: string }[] = [
    { label: t("Played"), value: s.p, sub: t("{w}W {d}D {l}L", { w: s.w, d: s.d, l: s.l }) },
    { label: t("Win rate"), value: Math.round(s.winPct), suffix: "%" },
    { label: t("Points a game"), value: s.ppg, shown: s.ppg.toFixed(2) },
    { label: t("Goal difference"), value: s.gd, shown: s.gd > 0 ? `+${s.gd}` : String(s.gd) },
    { label: t("Scored a game"), value: s.p ? s.gf / s.p : 0, shown: s.p ? (s.gf / s.p).toFixed(1) : "0", sub: t("{n} in all", { n: s.gf }) },
    { label: t("Conceded a game"), value: s.p ? s.ga / s.p : 0, shown: s.p ? (s.ga / s.p).toFixed(1) : "0", sub: t("{n} in all", { n: s.ga }) },
    { label: t("Clean sheets"), value: s.cleanSheets },
    { label: t("Blanks"), value: failedToScore, sub: t("games without a goal") },
  ];

  return (
    <Page accent={data.club.accent}>
      <PageHero lead={t("The")} accent={t("numbers.")} meta={`${t(seasonLabel(season))} · ${t(s.p === 1 ? "{n} match" : "{n} matches", { n: s.p })}`}>
        <StatsNav base={st.base} active="overview" />
        <SeasonLinks href={(x) => `${st.base}/stats?season=${x}`} seasons={st.seasons} active={season} />
      </PageHero>

      <div className="hx-bands">
        {ms.length === 0 ? (
          <div className="hx-wrap hx-start">
            <p className="hx-empty">{t("No matches played in this period.")}</p>
          </div>
        ) : (
          <>
            <Band className="hx-band-numbers" labelledBy="st-numbers-title">
              <h2 id="st-numbers-title" className="sr-only">
                {t("In numbers")}
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
                <h3 className="hx-label">{t("Form, oldest first")}</h3>
                <ol className="st-form">
                  {ms.map((m) => (
                    <li key={m.id}>
                      <Link href={`${st.base}/matches/${m.id}`} className={`hx-${m.result}`} title={`${m.gf}–${m.ga} ${t("vs")} ${m.opponent}, ${formatDate(m.date, undefined, lang)}`}>
                        {t(m.result)}
                      </Link>
                    </li>
                  ))}
                </ol>
              </Reveal>
            </Band>

            <Band className="hx-band-halls" labelledBy="st-when-title">
              <Reveal className="hx-head">
                <h2 id="st-when-title">
                  {t("When it")} <em>{t("happens.")}</em>
                </h2>
                <p>
                  {t("Goals before half-time: {first}. After: {second}. From the spot: {pens}.", { first: firstHalf, second: secondHalf, pens: penalties })}
                </p>
              </Reveal>
              <div className="st-charts">
                <Reveal>
                  <BarChart
                    title={t("Goals scored by month")}
                    data={months.map((m) => ({ label: formatMonth(m.month, lang), value: m.gf, hint: `${formatMonth(m.month, lang)} · ${t("{n} played", { n: m.p })}` }))}
                  />
                </Reveal>
                <Reveal delay={0.06}>
                  <BarChart
                    title={t("Goals conceded by month")}
                    tone="against"
                    data={months.map((m) => ({ label: formatMonth(m.month, lang), value: m.ga, hint: `${formatMonth(m.month, lang)} · ${t("{n} played", { n: m.p })}` }))}
                  />
                </Reveal>
                <Reveal>
                  <BarChart title={t("When we score")} data={MINUTE_BUCKETS.map((b, i) => ({ label: b, value: minutes[i], hint: t("Minutes {range}", { range: b }) }))} />
                </Reveal>
                <Reveal delay={0.06}>
                  <BarChart
                    title={t("Points by month")}
                    data={months.map((m) => ({ label: formatMonth(m.month, lang), value: m.pts, hint: `${formatMonth(m.month, lang)} · ${t("{w}W {d}D {l}L", { w: m.w, d: m.d, l: m.l })}` }))}
                    unit={t(" pts")}
                  />
                </Reveal>
              </div>
            </Band>

            <Band className="hx-band-pitch" labelledBy="st-where-title">
              <Reveal className="hx-head">
                <h2 id="st-where-title">
                  {t("Where we")} <em>{t("win.")}</em>
                </h2>
              </Reveal>
              <div className="st-two">
                <Reveal>
                  <SplitTable rows={venues} label={t("Venue")} t={t} />
                </Reveal>
                <Reveal delay={0.06}>
                  <SplitTable rows={comps} label={t("Competition")} t={t} />
                </Reveal>
              </div>
            </Band>

            <Band className="hx-band-halls" labelledBy="st-armband-title">
              <Reveal className="hx-head">
                <h2 id="st-armband-title">
                  {t("The armband and the")} <em>{t("votes.")}</em>
                </h2>
                <p>{t("Captains from the (C) in the voetbal.nl line-ups; man of the match from the team's vote there, or picked by hand.")}</p>
              </Reveal>
              <div className="st-two">
                {[
                  { key: "captain", title: t("Captains"), label: t("Matches with the armband"), rows: captains, empty: t("No captains from voetbal.nl yet.") },
                  { key: "motm", title: t("Man of the match"), label: t("Times voted best on the pitch"), rows: motms, empty: t("No man of the match yet.") },
                ].map((list, n) => (
                  <Reveal key={list.key} className="st-duos" delay={n * 0.06}>
                    <h3>{list.title}</h3>
                    <p className="hx-label">{list.label}</p>
                    {list.rows.length ? (
                      <ol>
                        {list.rows.slice(0, 8).map((r, i) => (
                          <li key={r.id}>
                            <span className="hx-rank">{i + 1}</span>
                            <span className="st-duo">
                              <Link href={`${st.base}/players/${r.id}`}>{st.playerName(r.id)}</Link>
                            </span>
                            <b>{r.count}</b>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="hx-empty">{list.empty}</p>
                    )}
                  </Reveal>
                ))}
              </div>
            </Band>

            <Band className="hx-band-board" labelledBy="st-who-title">
              <Reveal className="hx-head">
                <h2 id="st-who-title">
                  {t("Who makes the")} <em>{t("difference.")}</em>
                </h2>
                <p>{t("Small samples, so take it with a pinch of salt.")}</p>
              </Reveal>
              <div className="st-two">
                <Reveal className="st-duos">
                  <h3>{t("Best partnerships")}</h3>
                  <p className="hx-label">{t("Who set up whom")}</p>
                  {duos.length ? (
                    <ol>
                      {duos.map((d, i) => (
                        <li key={`${d.assist}-${d.scorer}`}>
                          <span className="hx-rank">{i + 1}</span>
                          <span className="st-duo">
                            <Link href={`${st.base}/players/${d.assist}`}>{st.playerName(d.assist)}</Link>
                            <span aria-label={t("to")}> → </span>
                            <Link href={`${st.base}/players/${d.scorer}`}>{st.playerName(d.scorer)}</Link>
                          </span>
                          <b>{d.count}</b>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="hx-empty">{t("No assisted goals yet.")}</p>
                  )}
                </Reveal>

                <Reveal className="st-impact" delay={0.06}>
                  <h3>{t("With and without")}</h3>
                  <p className="hx-label">{t("Points a game with each player in the squad and without them. The small numbers are games with and without.")}</p>
                  {impact.length ? (
                    <div className="hx-table">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("Player")}</th>
                            <th className="num">{t("With")}</th>
                            <th className="num">{t("Without")}</th>
                            <th className="num">{t("Diff")}</th>
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
                    <p className="hx-empty">{t("Everyone has played every game, so there's nothing to compare.")}</p>
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
