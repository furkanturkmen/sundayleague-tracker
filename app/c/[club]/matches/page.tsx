import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Band } from "@/components/home/Band";
import { Reveal } from "@/components/home/Motion";
import { Page, PageHero } from "@/components/home/Page";
import { Crest, GetStarted, TeamLogo } from "@/components/ui";
import { loadClub } from "@/lib/club";
import { formatDate, seasonLabel, seasonOf, summarise, type PlayedMatch, type Stats } from "@/lib/stats";
import type { Match } from "@/lib/types";

export const metadata: Metadata = { title: "Matches" };

// Every match on the cold night: what's coming up, the last result as a scoreboard, then each season's results
// as one long list you can run your eye down.

const WORD = { W: "Won", D: "Drawn", L: "Lost" } as const;

export default async function MatchesPage({ params }: { params: Promise<{ club: string }> }) {
  const { data, st, admin } = await loadClub((await params).club);
  const { club } = data;
  const last = st.played.at(-1);
  const all = summarise(st.played);
  const crest = (size: number) => <Crest short={club.shortName} logo={club.logo} size={size} />;
  const theirs = (m: Match, size: number) => <TeamLogo code={m.opponentCode} name={m.opponent} size={size} />;
  const sides = (m: Match, size: number) =>
    m.venue === "H"
      ? { home: { name: club.shortName, crest: crest(size) }, away: { name: m.opponent, crest: theirs(m, size) } }
      : { home: { name: m.opponent, crest: theirs(m, size) }, away: { name: club.shortName, crest: crest(size) } };

  return (
    <Page accent={club.accent}>
      <PageHero
        lead="Every"
        accent="match."
        meta={
          st.played.length > 0 ? (
            <>
              {all.p} played · {all.w} won · {all.d} drawn · {all.l} lost{st.seasons.length > 1 && " · all time"}
            </>
          ) : (
            "No results yet"
          )
        }
      >
        {admin && (
          <Link href={`${st.base}/matches/new`} className="hx-btn hx-btn-primary">
            Add a match
          </Link>
        )}
      </PageHero>

      <div className="hx-bands">
        {st.played.length === 0 && st.upcoming.length === 0 && (
          <div className="hx-wrap hx-start">
            <GetStarted st={st} admin={admin} what="matches" />
          </div>
        )}

        {st.upcoming.length > 0 && (
          <Band className="hx-band-halls" labelledBy="mx-next-title">
            <Reveal className="hx-head">
              <h2 id="mx-next-title">
                Coming <em>up.</em>
              </h2>
            </Reveal>
            <ol className="mx-fixtures">
              {st.upcoming.map((m, i) => {
                const { home, away } = sides(m, 40);
                return (
                  <Reveal as="li" key={m.id} delay={Math.min(i, 6) * 0.05}>
                    <Link href={`${st.base}/matches/${m.id}`} className="mx-fixture">
                      <span className="mx-date">
                        <small>{formatDate(m.date, { weekday: "short" })}</small>
                        <b>{formatDate(m.date, { day: "numeric" })}</b>
                        <small>{formatDate(m.date, { month: "short" })}</small>
                      </span>
                      <span className="mx-faceoff">
                        <span className="mx-side">
                          {home.crest}
                          <span>{home.name}</span>
                        </span>
                        <span className="hx-vs">vs</span>
                        <span className="mx-side">
                          {away.crest}
                          <span>{away.name}</span>
                        </span>
                      </span>
                      <span className="mx-when">
                        <b>{m.kickoff ?? "TBC"}</b>
                        <span className={m.competition === "League" ? undefined : "hx-cup"}>
                          {m.venue === "H" ? "Home" : "Away"} · {m.competition}
                        </span>
                      </span>
                    </Link>
                  </Reveal>
                );
              })}
            </ol>
          </Band>
        )}

        {last && (
          <Band
            className="hx-band-board"
            labelledBy="mx-last-title"
            bg={<span className="hx-ghost">{last.venue === "H" ? `${last.gf}–${last.ga}` : `${last.ga}–${last.gf}`}</span>}
          >
            <Reveal className="hx-head">
              <h2 id="mx-last-title">
                The last <em>one.</em>
              </h2>
              <p>
                {formatDate(last.date, { weekday: "long", day: "numeric", month: "long" })} · {last.competition}
              </p>
            </Reveal>
            <LastMatch st={st} m={last} sides={sides(last, 96)} />
          </Band>
        )}

        {st.played.length + st.voided.length > 0 && (
          <Band className="hx-band-halls" labelledBy="mx-all-title">
            <Reveal className="hx-head">
              <h2 id="mx-all-title">
                All <em>results.</em>
              </h2>
              <p>Newest first, with our score first.</p>
            </Reveal>
            {[...st.seasons].reverse().map((season) => (
              <SeasonResults key={season} st={st} season={season} />
            ))}
          </Band>
        )}
      </div>
    </Page>
  );
}

type Side = { name: string; crest: ReactNode };

/** The most recent result as a scoreboard, then who scored, the man of the match and the cards. */
function LastMatch({ st, m, sides }: { st: Stats; m: PlayedMatch; sides: { home: Side; away: Side } }) {
  const [hs, as] = m.venue === "H" ? [m.gf, m.ga] : [m.ga, m.gf];
  const unassigned = m.gf - m.goals.length;
  const events: { what: string; who: ReactNode }[] = [
    ...m.goals.map((g) => ({
      what: g.minute !== undefined ? `${g.minute}′` : "Goal",
      who: (
        <>
          {st.playerName(g.scorer)}
          {g.penalty && <small> pen</small>}
          {g.assist && <small> · assist {st.playerName(g.assist)}</small>}
        </>
      ),
    })),
    ...(unassigned > 0 ? [{ what: "Goal", who: <small>{unassigned} without a scorer yet</small> }] : []),
    ...(m.motm ? [{ what: "MOTM", who: st.playerName(m.motm) }] : []),
    ...m.cards.map((c) => ({ what: c.type === "Y" ? "Yellow" : "Red", who: st.playerName(c.player) })),
  ];

  return (
    <div className={`mx-last hx-${m.result}`}>
      <Reveal className="mx-board">
        <span className="mx-board-side">
          {sides.home.crest}
          <span>{sides.home.name}</span>
        </span>
        <span className="mx-board-score">
          {hs}
          <i>–</i>
          {as}
        </span>
        <span className="mx-board-side">
          {sides.away.crest}
          <span>{sides.away.name}</span>
        </span>
      </Reveal>
      <Reveal className="mx-last-foot" delay={0.1}>
        <p className="mx-verdict">
          <em>{WORD[m.result]}.</em>
        </p>
        {events.length > 0 && (
          <ul className="mx-events">
            {events.map((e, i) => (
              <li key={i}>
                <span>{e.what}</span>
                <b>{e.who}</b>
              </li>
            ))}
          </ul>
        )}
        <Link href={`${st.base}/matches/${m.id}`} className="hx-btn hx-btn-primary">
          Match details
        </Link>
      </Reveal>
    </div>
  );
}

/** One season's results, newest first, with abandoned and called-off matches in their place by date. */
function SeasonResults({ st, season }: { st: Stats; season: string }) {
  const list = st.inSeason(season);
  const s = summarise(list);
  const voided = st.voided.filter((m) => seasonOf(m.date) === season);
  const rows: (PlayedMatch | Match)[] = [...list, ...voided].sort((a, b) => b.date.localeCompare(a.date));
  if (!rows.length) return null;

  return (
    <section className="mx-season" aria-label={seasonLabel(season)}>
      <Reveal className="mx-season-head">
        <h3>{seasonLabel(season)}</h3>
        {s.p > 0 && (
          <p>
            <span>{s.p} played</span>
            <span className="hx-W">{s.w} W</span>
            <span className="hx-D">{s.d} D</span>
            <span className="hx-L">{s.l} L</span>
            <span>
              {s.gf}–{s.ga}
            </span>
          </p>
        )}
      </Reveal>
      <ol className="mx-list">
        {rows.map((m) => {
          const played = "result" in m ? m : null;
          const home = m.venue === "H";
          const scorers = m.goals.map((g) => `${st.playerName(g.scorer)}${g.minute !== undefined ? ` ${g.minute}′` : ""}`).join(", ");
          return (
            <li key={m.id}>
              <Link href={`${st.base}/matches/${m.id}`} className={`mx-row ${played ? `hx-${played.result}` : "hx-void"}`}>
                <span className="mx-result" aria-label={played ? WORD[played.result] : undefined}>
                  {played ? played.result : "–"}
                </span>
                <span className="mx-row-date">{formatDate(m.date, { day: "numeric", month: "short" })}</span>
                <span className="mx-row-team">
                  <TeamLogo code={m.opponentCode} name={m.opponent} size={28} />
                  <span>
                    {m.opponent}
                    <small>
                      {home ? "Home" : "Away"}
                      {m.competition !== "League" && <span className="hx-cup"> · {m.competition}</span>}
                      <span className="mx-row-inline-date"> · {formatDate(m.date, { day: "numeric", month: "short" })}</span>
                    </small>
                  </span>
                </span>
                <span className="mx-row-scorers">{scorers}</span>
                <span className="mx-row-score">
                  {played ? (
                    <>
                      {played.gf}
                      <i>–</i>
                      {played.ga}
                    </>
                  ) : (
                    <small>{m.status === "abandoned" ? "Abandoned" : "Called off"}</small>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
