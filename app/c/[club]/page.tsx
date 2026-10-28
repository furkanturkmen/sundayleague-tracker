import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Crest, GetStarted, TeamLogo } from "@/components/ui";
import { loadClub } from "@/lib/club";
import { brighten } from "@/lib/color";
import stadium from "@/public/images/stadium-floodlights.jpg";
import { formatDate, seasonLabel, summarise, type PlayedMatch } from "@/lib/stats";
import type { Match, Standing } from "@/lib/types";

// The club's front door. One question first: when do we play next, and where do we stand? The next fixture sits on
// the stadium photo with the league position beside it; below, the evidence: the table around us, the season's
// numbers, the last results and who is scoring.

export default async function ClubHome({ params }: { params: Promise<{ club: string }> }) {
  const { data, st, admin, coach } = await loadClub((await params).club);
  const { club } = data;
  const season = st.inSeason(st.currentSeason);
  const s = summarise(season);
  const stats = st.allStats(season);
  const top = (key: "goals" | "assists") =>
    stats.filter((p) => p[key] > 0).sort((a, b) => b[key] - a[key] || a.apps - b.apps).slice(0, 5).map((p) => ({ player: p.player, value: p[key] }));
  const leaders = [
    { title: "Goals", rows: top("goals"), empty: "Nobody has scored yet." },
    { title: "Assists", rows: top("assists"), empty: "No assists logged yet." },
  ];
  // Abandoned matches sit among the results by date, so the list matches what actually happened.
  const recent: (PlayedMatch | Match)[] = [...st.played, ...st.voided].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const next = st.upcoming[0];
  const form = st.played.slice(-5);
  const fame = st.hallOfFame(st.played)[0];
  const shame = st.hallOfShame(st.played)[0];
  const league = data.standings.filter((r) => r.competition === "league");
  const us = league.find((r) => r.isUs);
  const crest = (size: number) => <Crest short={club.shortName} logo={club.logo} size={size} />;

  return (
    <>
      <section className="hm" aria-labelledby="hm-title" style={{ "--hm-bright": brighten(club.accent) } as CSSProperties}>
        <div className="hm-bg" aria-hidden="true">
          <Image src={stadium} alt="" fill sizes="100vw" placeholder="blur" priority className="hm-photo" />
        </div>

        <div className="hm-head">
          {crest(48)}
          <div>
            <h1 id="hm-title">{club.name}</h1>
            {club.tagline && <p>{club.tagline}</p>}
          </div>
        </div>

        <div className="hm-next">
          <h2>Next match</h2>
          {next ? (
            <>
              <div className="hm-faceoff">
                <Side home name={next.venue === "H" ? club.shortName : next.opponent}>
                  {next.venue === "H" ? crest(88) : <TeamLogo code={next.opponentCode} name={next.opponent} size={88} />}
                </Side>
                <span className="hm-vs">vs</span>
                <Side name={next.venue === "H" ? next.opponent : club.shortName}>
                  {next.venue === "H" ? <TeamLogo code={next.opponentCode} name={next.opponent} size={88} /> : crest(88)}
                </Side>
              </div>
              <p className="hm-when">
                <strong>
                  {formatDate(next.date, { weekday: "long", day: "numeric", month: "long" })}
                  {next.kickoff && <>, {next.kickoff}</>}
                </strong>
                <span>
                  {untilWords(next.date)} · {next.venue === "H" ? "Home" : "Away"} · {next.competition}
                </span>
              </p>
              <div className="hm-actions">
                {(admin || coach) && (
                  <Link href={`${st.base}/matches/${next.id}/lineup`} className="hm-btn hm-btn-primary">
                    Set the line-up
                  </Link>
                )}
                <Link href={`${st.base}/matches/${next.id}`} className={admin || coach ? "hm-btn" : "hm-btn hm-btn-primary"}>
                  Match details
                </Link>
              </div>
            </>
          ) : (
            <p className="hm-when">
              <strong>No fixture scheduled</strong>
              <span>{admin ? "Add one, or link voetbal.nl in Settings to sync them." : "The next one shows here once it's announced."}</span>
            </p>
          )}
        </div>

        <div className="hm-stand">
          <h2>{us ? "League position" : `${seasonLabel(st.currentSeason)} so far`}</h2>
          {us ? (
            <>
              <p className="hm-pos">
                {ordinal(us.position)} <span>of {league.length}</span>
              </p>
              <p className="hm-pos-sub">{standingLine(us)}</p>
            </>
          ) : (
            <p className="hm-pos">
              {s.w}–{s.d}–{s.l} <span>W–D–L</span>
            </p>
          )}
          {form.length > 0 && (
            <div className="hm-form">
              <span>Form</span>
              <ol aria-label="Last results, oldest first">
                {form.map((m) => (
                  <li key={m.id}>
                    <Link href={`${st.base}/matches/${m.id}`} className={`hm-chip hm-chip-${m.result}`} title={`${m.gf}–${m.ga} vs ${m.opponent}, ${formatDate(m.date)}`}>
                      {m.result}
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>

      <div className="hm-more" style={{ "--hm-bright": brighten(club.accent) } as CSSProperties}>
        {data.players.length === 0 && <GetStarted st={st} admin={admin} what="players" />}
        {data.players.length > 0 && st.played.length === 0 && <GetStarted st={st} admin={admin} what="matches" />}

        <div className="hm-row">
          <section className="hm-panel hm-table" aria-labelledby="hm-table-title">
            <header>
              <h2 id="hm-table-title">League table</h2>
              {league.length > 0 && <Link href={`${st.base}/table`}>Full table</Link>}
            </header>
            {league.length ? (
              <table>
                <thead>
                  <tr>
                    <th className="num">#</th>
                    <th>Team</th>
                    <th className="num">P</th>
                    <th className="num">Goals</th>
                    <th className="num">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {tableSlice(league).map((r) => (
                    <tr key={r.team} className={r.isUs ? "is-us" : undefined}>
                      <td className="num">{r.position}</td>
                      <td>
                        <span className="hm-team">
                          <TeamLogo code={r.clubCode} name={r.team} size={20} />
                          {r.team}
                        </span>
                      </td>
                      <td className="num">{r.played}</td>
                      <td className="num">
                        {r.goalsFor}–{r.goalsAgainst}
                      </td>
                      <td className="num">
                        {r.points}
                        {r.penaltyPoints > 0 && <small> −{r.penaltyPoints}</small>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="hm-empty">No league table yet. It appears once voetbal.nl is linked in Settings.</p>
            )}
          </section>

          <section className="hm-panel" aria-labelledby="hm-season-title">
            <header>
              <h2 id="hm-season-title">{seasonLabel(st.currentSeason)}</h2>
              <Link href={`${st.base}/stats`}>All stats</Link>
            </header>
            <dl className="hm-figures">
              <div>
                <dt>Played</dt>
                <dd>{s.p}</dd>
              </div>
              <div>
                <dt>W–D–L</dt>
                <dd>
                  {s.w}–{s.d}–{s.l}
                </dd>
              </div>
              <div>
                <dt>Scored</dt>
                <dd>{s.gf}</dd>
              </div>
              <div>
                <dt>Conceded</dt>
                <dd>{s.ga}</dd>
              </div>
              <div>
                <dt>Clean sheets</dt>
                <dd>{s.cleanSheets}</dd>
              </div>
              <div>
                <dt>Win rate</dt>
                <dd>{s.p ? `${Math.round(s.winPct)}%` : "–"}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="hm-row">
          <section className="hm-panel" aria-labelledby="hm-results-title">
            <header>
              <h2 id="hm-results-title">Latest results</h2>
              <Link href={`${st.base}/matches`}>All matches</Link>
            </header>
            {recent.length ? (
              <ol className="hm-results">
                {recent.map((m) => {
                  const played = "result" in m ? m : null;
                  return (
                    <li key={m.id}>
                      <Link href={`${st.base}/matches/${m.id}`} className={played ? undefined : "hm-void"}>
                        <TeamLogo code={m.opponentCode} name={m.opponent} size={28} />
                        <span className="hm-results-team">
                          {m.opponent}
                          <small>
                            {formatDate(m.date, { day: "numeric", month: "short" })} · {m.venue === "H" ? "Home" : "Away"} ·{" "}
                            <span className={m.competition === "League" ? undefined : "hm-cup"}>{m.competition}</span>
                          </small>
                        </span>
                        {played ? (
                          <>
                            <span className="hm-score">
                              {played.gf}–{played.ga}
                            </span>
                            <span className={`hm-chip hm-chip-${played.result}`}>{played.result}</span>
                          </>
                        ) : (
                          <span className="hm-void-label">{m.status === "abandoned" ? "Abandoned" : "Called off"}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="hm-empty">Nothing played yet.</p>
            )}
          </section>

          <section className="hm-panel" aria-labelledby="hm-leaders-title">
            <header>
              <h2 id="hm-leaders-title">Leading the way</h2>
              <Link href={`${st.base}/stats/rankings`}>Rankings</Link>
            </header>
            <div className="hm-leaders">
              {leaders.map((l) => (
                <div key={l.title}>
                  <h3>{l.title}</h3>
                  {l.rows.length ? (
                    <ol>
                      {l.rows.map((r, i) => (
                        <li key={r.player.id}>
                          <span className="hm-rank">{i + 1}</span>
                          <Link href={`${st.base}/players/${r.player.id}`}>{r.player.name}</Link>
                          <span className="hm-val">{r.value}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="hm-empty">{l.empty}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="hm-halls">
              {[
                { hall: "Hall of Fame", cls: "fame", award: fame },
                { hall: "Hall of Shame", cls: "shame", award: shame },
              ].map(({ hall, cls, award }) => (
                <Link key={hall} href={`${st.base}/halls`} className={`hm-hall hm-hall-${cls}`}>
                  <Icon name={award.icon} />
                  <span>
                    <strong>{award.title}</strong>
                    <small>
                      {hall} · {award.leaders[0] ? `${award.leaders[0].player.name}, ${award.leaders[0].display}` : "vacant"}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Side({ name, home, children }: { name: string; home?: boolean; children: ReactNode }) {
  return (
    <span className="hm-side">
      {children}
      <span>
        {name}
        <small>{home ? "Home" : "Away"}</small>
      </span>
    </span>
  );
}

function ordinal(n: number) {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** "1 pt from 2 games, 5 deducted": the points, and why they look low when there is a deduction. */
function standingLine(r: Standing): string {
  const pts = `${r.points} ${r.points === 1 ? "pt" : "pts"} from ${r.played} ${r.played === 1 ? "game" : "games"}`;
  return r.penaltyPoints > 0 ? `${pts}, ${r.penaltyPoints} deducted` : `${pts} · ${r.won}W ${r.drawn}D ${r.lost}L`;
}

/** "Today", "Tomorrow", "In 4 days", counted in calendar days in Amsterdam. */
function untilWords(iso: string): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
  const days = Math.round((Date.parse(iso) - Date.parse(today)) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
}

/** Five rows of the table with us in the middle, or the top five when we're not in it. */
function tableSlice<T extends { isUs: boolean }>(rows: T[]): T[] {
  const i = rows.findIndex((r) => r.isUs);
  const start = i < 0 ? 0 : Math.max(0, Math.min(i - 2, rows.length - 5));
  return rows.slice(start, start + 5);
}
