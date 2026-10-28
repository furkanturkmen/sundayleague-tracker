import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { HomeHero, type HeroFixture } from "@/components/home/HomeHero";
import { CountUp, Reveal, ScrollFlag } from "@/components/home/Motion";
import { Rail } from "@/components/home/Rail";
import { WhatIfTable } from "@/components/home/WhatIfTable";
import { Icon } from "@/components/Icon";
import { Kit } from "@/components/Kit";
import { Crest, GetStarted, TeamLogo } from "@/components/ui";
import { loadClub } from "@/lib/club";
import { brighten } from "@/lib/color";
import { formatDate, seasonLabel, summarise, type PlayedMatch } from "@/lib/stats";
import type { Match } from "@/lib/types";
import { amsterdam } from "@/lib/time";
import stadium from "@/public/images/stadium-floodlights.jpg";

// The club's front door, a cold night under the floodlights. The next match and the clock to kick-off on the
// stadium; then where we stand (with Sunday played in advance), the results to drag through, the season in
// numbers, the squad and the halls.

export default async function ClubHome({ params }: { params: Promise<{ club: string }> }) {
  const { data, st, admin, coach } = await loadClub((await params).club);
  const { club } = data;
  const season = st.inSeason(st.currentSeason);
  const s = summarise(season);
  const stats = st.allStats(season);
  const top = (key: "goals" | "assists") =>
    stats.filter((p) => p[key] > 0).sort((a, b) => b[key] - a[key] || a.apps - b.apps).slice(0, 5).map((p) => ({ player: p.player, value: p[key] }));
  // Abandoned matches sit among the results by date, so the rail matches what actually happened.
  const recent: (PlayedMatch | Match)[] = [...st.played, ...st.voided].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const next = st.upcoming[0];
  const form = st.played.slice(-5);
  const fame = st.hallOfFame(st.played)[0];
  const shame = st.hallOfShame(st.played)[0];
  const league = data.standings.filter((r) => r.competition === "league");
  const us = league.find((r) => r.isUs);
  const squad = data.players.filter((p) => p.active).sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name));
  const crest = (size: number) => <Crest short={club.shortName} logo={club.logo} size={size} />;
  const theirs = (m: { opponentCode?: string; opponent: string }, size: number) => <TeamLogo code={m.opponentCode} name={m.opponent} size={size} />;
  const nextInLeague = next?.competition === "League" && us ? next : null;

  const fixture: HeroFixture | null = next
    ? {
        href: `${st.base}/matches/${next.id}`,
        at: next.kickoff ? amsterdam(next.date, next.kickoff) : null,
        day: amsterdam(next.date),
        when: `${formatDate(next.date, { weekday: "long", day: "numeric", month: "long" })}${next.kickoff ? `, ${next.kickoff}` : ""}`,
        meta: `${next.venue === "H" ? "Home" : "Away"} · ${next.competition}`,
        home: next.venue === "H" ? { name: club.shortName, crest: crest(84) } : { name: next.opponent, crest: theirs(next, 84) },
        away: next.venue === "H" ? { name: next.opponent, crest: theirs(next, 84) } : { name: club.shortName, crest: crest(84) },
      }
    : null;

  return (
    <div className="hx" style={{ "--hx-bright": brighten(club.accent) } as CSSProperties}>
      <ScrollFlag />
      <HomeHero
        photo={<Image src={stadium} alt="" fill sizes="100vw" placeholder="blur" priority className="hx-photo" />}
        title={club.name}
        tagline={club.tagline}
        fixture={fixture}
        actions={
          <>
            {next && (admin || coach) && (
              <Link href={`${st.base}/matches/${next.id}/lineup`} className="hx-btn hx-btn-primary">
                Set the line-up
              </Link>
            )}
            {next && (
              <Link href={`${st.base}/matches/${next.id}`} className={admin || coach ? "hx-btn" : "hx-btn hx-btn-primary"}>
                Match details
              </Link>
            )}
            <Link href={`${st.base}/players`} className="hx-btn hx-btn-ghost">
              Meet the squad
            </Link>
          </>
        }
      />

      <div className="hx-body">
        {data.players.length === 0 && <GetStarted st={st} admin={admin} what="players" />}
        {data.players.length > 0 && st.played.length === 0 && <GetStarted st={st} admin={admin} what="matches" />}

        {league.length > 0 && (
          <section className="hx-section hx-stand" aria-labelledby="hx-stand-title">
            <Reveal className="hx-head">
              <h2 id="hx-stand-title">
                Where we <em>stand.</em>
              </h2>
              <p>
                {us
                  ? `${ordinal(us.position)} of ${league.length} with ${us.points} ${us.points === 1 ? "point" : "points"} from ${us.played} ${us.played === 1 ? "game" : "games"}${us.penaltyPoints ? `, after ${us.penaltyPoints} deducted` : ""}.`
                  : club.voetbal?.league}{" "}
                <Link href={`${st.base}/table`}>Full table</Link>
              </p>
            </Reveal>
            {/* The last five as a scoreboard: one huge letter each, oldest on the left. */}
            {form.length > 0 && (
              <Reveal className="hx-form">
                <span className="hx-label">Form, last {form.length}</span>
                <ol>
                  {form.map((m, i) => (
                    <li key={m.id}>
                      <Link href={`${st.base}/matches/${m.id}`} className={`hx-${m.result}`}>
                        <b>{m.result}</b>
                        <span>
                          {m.gf}–{m.ga} {m.opponent}
                          {i === form.length - 1 && <em>latest</em>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Reveal>
            )}
            <div className="hx-stand-grid">
              <Reveal className="hx-table">
                <WhatIfTable
                  opponent={nextInLeague?.opponent ?? null}
                  rows={league.map((r) => ({
                    team: r.team,
                    logo: <TeamLogo code={r.clubCode} name={r.team} size={22} />,
                    played: r.played,
                    goalsFor: r.goalsFor,
                    goalsAgainst: r.goalsAgainst,
                    points: r.points,
                    penaltyPoints: r.penaltyPoints,
                    isUs: r.isUs,
                    isNext: Boolean(nextInLeague && r.clubCode && r.clubCode === nextInLeague.opponentCode),
                  }))}
                />
              </Reveal>
            </div>
          </section>
        )}

        {recent.length > 0 && (
          <section className="hx-section" aria-labelledby="hx-results-title">
            <Reveal className="hx-head">
              <h2 id="hx-results-title">
                The <em>results.</em>
              </h2>
              <p>
                Newest first. Drag or swipe through. <Link href={`${st.base}/matches`}>All matches</Link>
              </p>
            </Reveal>
            <Rail label="Latest results">
              {recent.map((m) => {
                const played = "result" in m ? m : null;
                const home = m.venue === "H";
                return (
                  <Link key={m.id} href={`${st.base}/matches/${m.id}`} className={`hx-result ${played ? `hx-${played.result}` : "hx-void"}`} draggable={false}>
                    <span className="hx-result-top">
                      <span>{formatDate(m.date, { day: "numeric", month: "short" })}</span>
                      <span className={m.competition === "League" ? undefined : "hx-cup"}>{m.competition}</span>
                    </span>
                    <span className="hx-result-teams">
                      {home ? crest(52) : theirs(m, 52)}
                      <span className="hx-result-score">
                        {played ? (
                          <>
                            {home ? played.gf : played.ga}
                            <i>–</i>
                            {home ? played.ga : played.gf}
                          </>
                        ) : (
                          <small>{m.status === "abandoned" ? "Abandoned" : "Called off"}</small>
                        )}
                      </span>
                      {home ? theirs(m, 52) : crest(52)}
                    </span>
                    <span className="hx-result-name">{home ? `${club.shortName} vs ${m.opponent}` : `${m.opponent} vs ${club.shortName}`}</span>
                    {played && <span className="hx-result-badge">{played.result === "W" ? "Won" : played.result === "D" ? "Drawn" : "Lost"}</span>}
                  </Link>
                );
              })}
            </Rail>
          </section>
        )}

        <section className="hx-section" aria-labelledby="hx-numbers-title">
          <Reveal className="hx-head">
            <h2 id="hx-numbers-title">
              {seasonLabel(st.currentSeason)} in <em>numbers.</em>
            </h2>
            <p>
              Every competition. <Link href={`${st.base}/stats`}>All stats</Link>
            </p>
          </Reveal>
          <Reveal className="hx-numbers">
            {[
              { label: "Played", value: s.p },
              { label: "Won", value: s.w },
              { label: "Scored", value: s.gf },
              { label: "Conceded", value: s.ga },
              { label: "Clean sheets", value: s.cleanSheets },
              { label: "Win rate", value: Math.round(s.winPct), suffix: "%" },
            ].map((n) => (
              <div key={n.label}>
                <span className="hx-number">
                  <CountUp value={n.value} suffix={n.suffix} />
                </span>
                <span className="hx-label">{n.label}</span>
              </div>
            ))}
          </Reveal>
          <div className="hx-leaders">
            {[
              { title: "Goals", rows: top("goals"), empty: "Nobody has scored yet." },
              { title: "Assists", rows: top("assists"), empty: "No assists logged yet." },
            ].map((l, i) => (
              <Reveal key={l.title} className="hx-leader" delay={i * 0.08}>
                <h3>{l.title}</h3>
                {l.rows.length ? (
                  <>
                    {/* The leader set large, the chasing pack as a quiet list. */}
                    <Link href={`${st.base}/players/${l.rows[0].player.id}`} className="hx-leader-top">
                      <span>{l.rows[0].player.name}</span>
                      <b>{l.rows[0].value}</b>
                    </Link>
                    {l.rows.length > 1 && (
                      <ol start={2}>
                        {l.rows.slice(1).map((r, j) => (
                          <li key={r.player.id}>
                            <span className="hx-rank">{j + 2}</span>
                            <Link href={`${st.base}/players/${r.player.id}`}>{r.player.name}</Link>
                            <span className="hx-val">{r.value}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </>
                ) : (
                  <p className="hx-empty">{l.empty}</p>
                )}
                <Link href={`${st.base}/stats/rankings`} className="hx-more">
                  All rankings
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {squad.length > 0 && (
          <section className="hx-section" aria-labelledby="hx-squad-title">
            <Reveal className="hx-head">
              <h2 id="hx-squad-title">
                The <em>squad.</em>
              </h2>
              <p>
                {squad.length} players. <Link href={`${st.base}/players`}>Everyone</Link>
              </p>
            </Reveal>
            <Rail label="Squad">
              {squad.map((p) => (
                <Link key={p.id} href={`${st.base}/players/${p.id}`} className="hx-player" draggable={false}>
                  <Kit main={club.accent} trim={club.gold} number={p.number} logo={club.logo} className="hx-player-kit" />
                  <span className="hx-player-name">{p.name}</span>
                  <span className="hx-player-pos">{p.position}</span>
                </Link>
              ))}
            </Rail>
          </section>
        )}

        <section className="hx-section" aria-labelledby="hx-halls-title">
          <Reveal className="hx-head">
            <h2 id="hx-halls-title">
              Fame &amp; <em>shame.</em>
            </h2>
            <p>
              Who leads each hall right now. <Link href={`${st.base}/halls`}>Both halls</Link>
            </p>
          </Reveal>
          <div className="hx-halls">
            {[
              { hall: "Hall of Fame", cls: "fame", award: fame },
              { hall: "Hall of Shame", cls: "shame", award: shame },
            ].map(({ hall, cls, award }, i) => (
              <Reveal key={hall} className={`hx-hall hx-hall-${cls}`} delay={i * 0.1}>
                <Link href={`${st.base}/halls`}>
                  <span className="hx-hall-icon">
                    <Icon name={award.icon} />
                  </span>
                  <span className="hx-label">{hall}</span>
                  <strong>{award.title}</strong>
                  <span className="hx-hall-who">
                    {award.leaders[0] ? (
                      <>
                        {award.leaders[0].player.name} <span>{award.leaders[0].display}</span>
                      </>
                    ) : (
                      "Vacant"
                    )}
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ordinal(n: number) {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}
