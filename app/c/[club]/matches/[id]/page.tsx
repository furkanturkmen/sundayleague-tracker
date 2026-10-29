import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { ConfirmSubmit } from "@/components/forms";
import { Reveal } from "@/components/home/Motion";
import { Page, Section } from "@/components/home/Page";
import { Crest, TeamLogo } from "@/components/ui";
import { deleteMatch } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { formatDate, seasonLabel, seasonOf } from "@/lib/stats";
import stadium from "@/public/images/stadium-floodlights.jpg";

type Props = { params: Promise<{ club: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { club, id } = await params;
  const { st } = await loadClub(club);
  const m = st.getMatch(id);
  return { title: m ? `${st.fixtureTitle(m)} (${formatDate(m.date)})` : "Match" };
}

// One match. The scoreboard is the hero: both crests and the score as big as the stadium allows. Under it the
// goals by minute, the awards, the squad, the posts for Instagram and the way to the matches either side.

const WORD = { W: "Won", D: "Drawn", L: "Lost" } as const;

export default async function MatchPage({ params }: Props) {
  const { club: slug, id } = await params;
  const { data, st, admin, coach } = await loadClub(slug);
  const fixture = st.getMatch(id);
  if (!fixture) notFound();
  const m = st.getPlayed(id);
  const { prev, next } = st.neighbours(id);
  const { club } = data;

  const us = { name: club.name, crest: <Crest short={club.shortName} logo={club.logo} size={96} /> };
  const them = { name: fixture.opponent, crest: <TeamLogo code={fixture.opponentCode} name={fixture.opponent} size={96} /> };
  const [home, away] = fixture.venue === "H" ? [us, them] : [them, us];
  const [hs, as] = m ? (fixture.venue === "H" ? [m.gf, m.ga] : [m.ga, m.gf]) : [null, null];
  const status = fixture.status === "abandoned" ? "Abandoned" : fixture.status === "called-off" ? "Called off" : null;
  const verdict = m ? WORD[m.result] : (status ?? "To play");

  return (
    <Page accent={club.accent}>
      <section className={`hx-hero hx-hero-short md-hero ${m ? `hx-${m.result}` : "hx-void"}`} aria-labelledby="page-title">
        <div className="hx-hero-photo" aria-hidden="true">
          <Image src={stadium} alt="" fill sizes="100vw" placeholder="blur" priority className="hx-photo" />
        </div>
        <div className="hx-hero-inner">
          <Reveal className="md-top">
            <Link href={`${st.base}/matches`} className="hx-back">
              <span aria-hidden="true">←</span> All matches
            </Link>
            {admin && (
              <div className="md-admin">
                <Link href={`${st.base}/matches/${id}/edit`} className="hx-btn">
                  Edit
                </Link>
                <form action={deleteMatch.bind(null, slug)}>
                  <input type="hidden" name="id" value={id} />
                  <ConfirmSubmit className="md-delete" message="Delete this match and everything recorded in it?">
                    Delete
                  </ConfirmSubmit>
                </form>
              </div>
            )}
          </Reveal>
          <h1 id="page-title" className="sr-only">
            {home.name} {m ? `${hs}–${as}` : "vs"} {away.name}
          </h1>
          <Reveal className="md-board" delay={0.05}>
            <span className="md-side">
              {home.crest}
              <span>{home.name}</span>
            </span>
            <span className="md-score" aria-hidden="true">
              {m ? (
                <>
                  {hs}
                  <i>–</i>
                  {as}
                </>
              ) : (
                <em>vs</em>
              )}
            </span>
            <span className="md-side">
              {away.crest}
              <span>{away.name}</span>
            </span>
          </Reveal>
          <Reveal className="md-meta" delay={0.12}>
            <p className="md-verdict">
              <em>{verdict}.</em>
            </p>
            <p>
              {formatDate(fixture.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {fixture.kickoff && !m && `, ${fixture.kickoff}`}
              <span> · </span>
              <span className={fixture.competition === "League" ? undefined : "hx-cup"}>{fixture.competition}</span>
              <span> · </span>
              {fixture.venue === "H" ? "Home" : "Away"}
              <span> · </span>
              {seasonLabel(seasonOf(fixture.date))}
            </p>
          </Reveal>
        </div>
      </section>

      <div className="hx-wrap hx-body">
        {!m ? (
          <p className="md-note">
            {fixture.status === "abandoned"
              ? "Abandoned. voetbal.nl has no result for this match, so it doesn't count in any stats."
              : fixture.status === "called-off"
                ? "Called off. It doesn't count in any stats."
                : `Not played yet.${admin ? " Edit the match to add the result once it's done." : ""}`}
          </p>
        ) : (
          <div className="md-grid">
            <Section id="md-goals" lead="The" accent="goals." small>
              {m.gf > 0 ? (
                <ol className="md-events">
                  {m.goals.map((g, i) => (
                    <Event key={i} when={g.minute !== undefined ? `${g.minute}′` : "–"}>
                      <PlayerName base={st.base} id={g.scorer} name={st.playerName(g.scorer)} />
                      {g.penalty && <small>penalty</small>}
                      {g.assist && <small>assist {st.playerName(g.assist)}</small>}
                    </Event>
                  ))}
                  {/* The official score can come from voetbal.nl before anyone has said who scored. */}
                  {m.gf > m.goals.length && (
                    <Event when="–">
                      <small>
                        {m.gf - m.goals.length} {m.gf - m.goals.length === 1 ? "goal" : "goals"} without a scorer yet
                      </small>
                    </Event>
                  )}
                  {m.ownGoals.map((p, i) => (
                    <Event key={`og${i}`} when="OG">
                      <PlayerName base={st.base} id={p} name={st.playerName(p)} />
                      <small>scored an own goal</small>
                    </Event>
                  ))}
                  {m.penaltiesMissed.map((p, i) => (
                    <Event key={`pm${i}`} when={<Icon name="miss" />}>
                      <PlayerName base={st.base} id={p} name={st.playerName(p)} />
                      <small>missed a penalty</small>
                    </Event>
                  ))}
                </ol>
              ) : (
                <p className="hx-empty">Didn&apos;t trouble the scorers.</p>
              )}
            </Section>

            <Section id="md-awards" lead="The" accent="verdict." small>
              <div className="md-motm">
                <span className="md-motm-star">
                  <Icon name="star" />
                </span>
                <span className="hx-label">Man of the Match</span>
                {m.motm ? <PlayerName base={st.base} id={m.motm} name={st.playerName(m.motm)} /> : <span className="hx-empty">Not given</span>}
              </div>
              {m.cards.length > 0 && (
                <ol className="md-events">
                  {m.cards.map((c, i) => (
                    <Event key={i} when={<span className={c.type === "Y" ? "card-y" : "card-r"} title={c.type === "Y" ? "Yellow card" : "Red card"} />}>
                      <PlayerName base={st.base} id={c.player} name={st.playerName(c.player)} />
                      <small>{c.type === "Y" ? "booked" : "sent off"}</small>
                    </Event>
                  ))}
                </ol>
              )}
              {m.notes && <blockquote className="md-notes">{m.notes}</blockquote>}
            </Section>

            <Section id="md-squad" lead="The" accent="squad." note={m.squad.length ? `${m.squad.length} players` : undefined} small>
              {m.squad.length ? (
                <ul className="md-squad">
                  {m.squad.map((p) => (
                    <li key={p}>
                      <Link href={`${st.base}/players/${p}`}>{st.playerName(p)}</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hx-empty">Squad not recorded.</p>
              )}
            </Section>
          </div>
        )}

        {(admin || coach) && !fixture.status && <Graphics base={`${st.base}/matches/${id}`} played={Boolean(m)} />}

        <nav className="md-pager" aria-label="Other matches">
          {prev ? (
            <Link href={`${st.base}/matches/${prev.id}`}>
              <span className="hx-label">Previous match</span>
              <b>
                <span aria-hidden="true">← </span>
                {prev.opponent}
              </b>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`${st.base}/matches/${next.id}`} className="md-pager-next">
              <span className="hx-label">Next match</span>
              <b>
                {next.opponent}
                <span aria-hidden="true"> →</span>
              </b>
            </Link>
          )}
        </nav>
      </div>
    </Page>
  );
}

function Event({ when, children }: { when: ReactNode; children: ReactNode }) {
  return (
    <li>
      <span className="md-when">{when}</span>
      <span className="md-what">{children}</span>
    </li>
  );
}

function PlayerName({ base, id, name }: { base: string; id: string; name: string }) {
  if (id === "og") return <b>Own goal</b>;
  return (
    <Link href={`${base}/players/${id}`} className="md-player">
      {name}
    </Link>
  );
}

/** Instagram posts for this match: matchday before it, the result after, and the line-up either way. */
function Graphics({ base, played }: { base: string; played: boolean }) {
  const posts = [
    played ? { key: "result", label: "Result" } : { key: "matchday", label: "Matchday" },
    { key: "lineup", label: "Line-up", edit: `${base}/lineup` },
  ];
  return (
    <Section id="md-posts" lead="For" accent="Instagram." note="1080×1350 posts, made from this match." small>
      <div className="md-posts">
        {posts.map((g) => (
          <figure key={g.key}>
            <a href={`${base}/graphics/${g.key}`} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${base}/graphics/${g.key}`} width={1080} height={1350} alt={`${g.label} graphic`} loading="lazy" />
            </a>
            <figcaption>
              <strong>{g.label}</strong>
              <a href={`${base}/graphics/${g.key}?download=1`} download>
                Download
              </a>
              {g.edit && <Link href={g.edit}>Edit</Link>}
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
