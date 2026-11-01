import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Band } from "@/components/home/Band";
import { Reveal } from "@/components/home/Motion";
import { Page, PageHero, StatsNav } from "@/components/home/Page";
import { loadClub } from "@/lib/club";
import type { Lang, T } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Records") };
}

// The club's best and worst, set like a record book: what the record is, the figure large, and when it happened.

function Record({ label, value, children }: { label: string; value: ReactNode; children?: ReactNode }) {
  return (
    <div className="rc">
      <span className="hx-label">{label}</span>
      <span className="rc-value">{value}</span>
      {children && <span className="rc-detail">{children}</span>}
    </div>
  );
}

function Group({ id, lead, accent, band, children }: { id: string; lead: string; accent: string; band: string; children: ReactNode }) {
  return (
    <Band className={band} labelledBy={id}>
      <Reveal className="hx-head">
        <h2 id={id}>
          {lead} <em>{accent}</em>
        </h2>
      </Reveal>
      <Reveal className="rc-grid">{children}</Reveal>
    </Band>
  );
}

function MatchRef({ st, m, t, lang }: { st: Stats; m?: PlayedMatch; t: T; lang: Lang }) {
  if (!m) return <>–</>;
  return (
    <Link href={`${st.base}/matches/${m.id}`}>
      {t("vs")} {m.opponent} ({t(m.venue)}), {formatDate(m.date, undefined, lang)}
    </Link>
  );
}

function RunRef({ run, t, lang }: { run: Run; t: T; lang: Lang }) {
  if (!run.from || !run.to) return <>{t("Not yet")}</>;
  return (
    <>
      {formatDate(run.from.date, undefined, lang)} → {formatDate(run.to.date, undefined, lang)}
    </>
  );
}

export default async function RecordsPage({ params }: { params: Promise<{ club: string }> }) {
  const { data, st } = await loadClub((await params).club);
  const t = await getT();
  const lang = await getLang();
  const ms = st.played;
  const { seasons, inSeason, allStats, playerName } = st;
  const hero = (
    <PageHero
      lead={t("The")}
      accent={t("records.")}
      meta={ms.length ? `${t("All time")} · ${t(ms.length === 1 ? "{n} match" : "{n} matches", { n: ms.length })}` : t("All time")}
    >
      <StatsNav base={st.base} active="records" />
    </PageHero>
  );
  if (ms.length === 0)
    return (
      <Page accent={data.club.accent}>
        {hero}
        <div className="hx-wrap hx-body">
          <p className="hx-empty">{t("Records start once the first result is in.")}</p>
        </div>
      </Page>
    );
  const biggestWin = maxBy(
    ms.filter((m) => m.result === "W"),
    (m) => m.gf - m.ga + m.gf / 100,
  );
  const worstLoss = maxBy(
    ms.filter((m) => m.result === "L"),
    (m) => m.ga - m.gf + m.ga / 100,
  );
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
    <Page accent={data.club.accent}>
      {hero}
      <div className="hx-bands">
        <Group id="rc-results" lead={t("The")} accent={t("results.")} band="hx-band-numbers">
          <Record label={t("Biggest win")} value={biggestWin ? `${biggestWin.gf}–${biggestWin.ga}` : "–"}>
            <MatchRef st={st} t={t} lang={lang} m={biggestWin} />
          </Record>
          <Record label={t("Heaviest defeat")} value={worstLoss ? `${worstLoss.gf}–${worstLoss.ga}` : "–"}>
            <MatchRef st={st} t={t} lang={lang} m={worstLoss} />
          </Record>
          <Record label={t("Highest scoring game")} value={highest ? t("{n} goals", { n: highest.gf + highest.ga }) : "–"}>
            {highest && (
              <>
                {highest.gf}–{highest.ga}{" "}
              </>
            )}
            <MatchRef st={st} t={t} lang={lang} m={highest} />
          </Record>
          <Record label={t("Most goals scored")} value={mostScored?.gf ?? "–"}>
            <MatchRef st={st} t={t} lang={lang} m={mostScored} />
          </Record>
          <Record label={t("Most goals conceded")} value={mostConceded?.ga ?? "–"}>
            <MatchRef st={st} t={t} lang={lang} m={mostConceded} />
          </Record>
        </Group>

        <Group id="rc-runs" lead={t("The")} accent={t("runs.")} band="hx-band-halls">
          {[
            { label: "Longest winning run", run: longestRun(ms, (m) => m.result === "W") },
            { label: "Longest unbeaten run", run: longestRun(ms, (m) => m.result !== "L") },
            { label: "Most clean sheets in a row", run: longestRun(ms, (m) => m.ga === 0) },
            { label: "Scored in consecutive games", run: longestRun(ms, (m) => m.gf > 0) },
            { label: "Longest losing run", run: longestRun(ms, (m) => m.result === "L") },
            { label: "Longest winless run", run: longestRun(ms, (m) => m.result !== "W") },
          ].map(({ label, run }) => (
            <Record key={label} label={t(label)} value={t(run.length === 1 ? "{n} game" : "{n} games", { n: run.length })}>
              <RunRef run={run} t={t} lang={lang} />
            </Record>
          ))}
        </Group>

        <Group id="rc-players" lead={t("The")} accent={t("players.")} band="hx-band-board">
          <Record label={t("Most goals in a game")} value={goalsMatch ? `${goalsMatch.value} · ${goalsMatch.player.name}` : "–"}>
            <MatchRef st={st} t={t} lang={lang} m={goalsMatch?.match} />
          </Record>
          <Record label={t("Most assists in a game")} value={assistsMatch ? `${assistsMatch.value} · ${assistsMatch.player.name}` : "–"}>
            <MatchRef st={st} t={t} lang={lang} m={assistsMatch?.match} />
          </Record>
          <Record label={t("Most goals in a season")} value={bestSeasonGoals ? `${bestSeasonGoals.goals} · ${bestSeasonGoals.player.name}` : "–"}>
            {bestSeasonGoals && t(seasonLabel(bestSeasonGoals.season))}
          </Record>
          <Record label={t("Fastest goal")} value={earliest ? `${earliest.g.minute}′` : "–"}>
            {earliest && (
              <>
                <Link href={`${st.base}/players/${earliest.g.scorer}`}>{playerName(earliest.g.scorer)}</Link> <MatchRef st={st} t={t} lang={lang} m={earliest.m} />
              </>
            )}
          </Record>
          <Record label={t("Latest goal")} value={latest ? `${latest.g.minute}′` : "–"}>
            {latest && (
              <>
                <Link href={`${st.base}/players/${latest.g.scorer}`}>{playerName(latest.g.scorer)}</Link> <MatchRef st={st} t={t} lang={lang} m={latest.m} />
              </>
            )}
          </Record>
        </Group>

        <Band className="hx-band-pitch" labelledBy="rc-seasons">
          <Reveal className="hx-head">
            <h2 id="rc-seasons">
              {t("Season by")} <em>{t("season.")}</em>
            </h2>
          </Reveal>
          <Reveal className="hx-table rc-table">
            <table>
              <thead>
                <tr>
                  <th>{t("Season")}</th>
                  <th className="num">{t("P")}</th>
                  <th className="num">{t("W")}</th>
                  <th className="num">{t("D")}</th>
                  <th className="num">{t("L")}</th>
                  <th className="num">{t("GF")}</th>
                  <th className="num">{t("GA")}</th>
                  <th className="num">{t("Pts")}</th>
                  <th>{t("Top scorer")}</th>
                  <th>{t("Top assists")}</th>
                  <th>{t("Most MOTM")}</th>
                </tr>
              </thead>
              <tbody>
                {[...seasonRows].reverse().map((r) => (
                  <tr key={r.season}>
                    <td>{t(seasonLabel(r.season))}</td>
                    <td className="num">{r.sum.p}</td>
                    <td className="num">{r.sum.w}</td>
                    <td className="num">{r.sum.d}</td>
                    <td className="num">{r.sum.l}</td>
                    <td className="num">{r.sum.gf}</td>
                    <td className="num">{r.sum.ga}</td>
                    <td className="num rc-pts">{r.sum.pts}</td>
                    <td>{r.topScorer && r.topScorer.goals > 0 ? `${r.topScorer.player.name} (${r.topScorer.goals})` : "–"}</td>
                    <td>{r.topAssist && r.topAssist.assists > 0 ? `${r.topAssist.player.name} (${r.topAssist.assists})` : "–"}</td>
                    <td>{r.topMotm && r.topMotm.motm > 0 ? `${r.topMotm.player.name} (${r.topMotm.motm})` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </Band>

        <Band className="hx-band-halls" labelledBy="rc-h2h">
          <Reveal className="hx-head">
            <h2 id="rc-h2h">
              {t("Head to")} <em>{t("head.")}</em>
            </h2>
            <p>{t("Every team we have played, most meetings first. Scores show ours first.")}</p>
          </Reveal>
          <Reveal className="hx-table rc-table">
            <table>
              <thead>
                <tr>
                  <th>{t("Opponent")}</th>
                  <th className="num">{t("P")}</th>
                  <th className="num">{t("W")}</th>
                  <th className="num">{t("D")}</th>
                  <th className="num">{t("L")}</th>
                  <th className="num">{t("GF")}</th>
                  <th className="num">{t("GA")}</th>
                  <th className="num">{t("PPG")}</th>
                  <th>{t("Last")}</th>
                </tr>
              </thead>
              <tbody>
                {opponents.map((o) => {
                  const last = [...ms].reverse().find((m) => m.opponent === o.name);
                  return (
                    <tr key={o.name}>
                      <td>{o.name}</td>
                      <td className="num">{o.p}</td>
                      <td className="num">{o.w}</td>
                      <td className="num">{o.d}</td>
                      <td className="num">{o.l}</td>
                      <td className="num">{o.gf}</td>
                      <td className="num">{o.ga}</td>
                      <td className="num">{o.ppg.toFixed(2)}</td>
                      <td>
                        {last && (
                          <Link href={`${st.base}/matches/${last.id}`} className={`rc-last hx-${last.result}`}>
                            <span className="mx-result">{t(last.result)}</span> {last.gf}–{last.ga}
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Reveal>
        </Band>
      </div>
    </Page>
  );
}
