import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Band } from "@/components/home/Band";
import { Reveal } from "@/components/home/Motion";
import { Page, PageHero, SeasonLinks } from "@/components/home/Page";
import { AddMoment, DeleteMoment } from "@/components/MomentEditor";
import { deleteMoment, saveMoment } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { formatDate, seasonLabel, type Award, type Stats } from "@/lib/stats";
import type { Moment } from "@/lib/types";

export const metadata: Metadata = { title: "Hall of Fame & Hall of Shame" };

// Two halls, each under its own light: warm gold for the legends, red for the rest. Every award names its holder
// large with the chasing pack under them; the stories and the darkest days follow.

function AwardItem({ st, award }: { st: Stats; award: Award }) {
  const [winner, ...rest] = award.leaders;
  return (
    <div className="hl-award">
      <span className="hl-icon">
        <Icon name={award.icon} />
      </span>
      <h3>{award.title}</h3>
      <p className="hl-blurb">{award.blurb}</p>
      {winner ? (
        <>
          <p className="hl-winner">
            <Link href={`${st.base}/players/${winner.player.id}`}>{winner.player.name}</Link>
            <b>{winner.display}</b>
          </p>
          {rest.length > 0 && (
            <ol className="hl-runners" start={2}>
              {rest.map((l) => (
                <li key={l.player.id}>
                  <Link href={`${st.base}/players/${l.player.id}`}>{l.player.name}</Link>
                  <span>{l.display}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <p className="hx-empty">Vacant. For now.</p>
      )}
    </div>
  );
}

/** What an admin needs to add and delete moments in place; null for everyone else. */
type Editing = {
  save: Parameters<typeof AddMoment>[0]["action"];
  remove: (f: FormData) => Promise<void>;
  players: { id: string; label: string }[];
  matches: { id: string; label: string }[];
} | null;

function Moments({ st, id, kind, title, items, edit }: { st: Stats; id: string; kind: "fame" | "shame"; title: string; items: Moment[]; edit: Editing }) {
  if (!items.length && !edit) return null;
  return (
    <div className="hl-block" id={id}>
      <h3 className="hl-sub">{title}</h3>
      {edit && <AddMoment action={edit.save} kind={kind} players={edit.players} matches={edit.matches} />}
      {!items.length && <p className="hx-empty">Nothing here yet.</p>}
      <div className="hl-moments">
        {items.map((m, i) => {
          const match = m.matchId ? st.getMatch(m.matchId) : undefined;
          return (
            <Reveal key={m.id} className="hl-moment" delay={(i % 2) * 0.06}>
              <h4>{m.title}</h4>
              {m.story && <p>{m.story}</p>}
              <p className="hl-moment-who">
                {m.player && <Link href={`${st.base}/players/${m.player}`}>{st.playerName(m.player)}</Link>}
                {m.player && match && " · "}
                {match && (
                  <Link href={`${st.base}/matches/${match.id}`}>
                    vs {match.opponent}, {formatDate(match.date)}
                  </Link>
                )}
              </p>
              {edit && <DeleteMoment action={edit.remove} id={m.id} />}
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

type Props = { params: Promise<{ club: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function HallsPage({ params, searchParams }: Props) {
  const { data, st, admin } = await loadClub((await params).club);
  const query = await searchParams;
  const season = st.resolveSeason(query.season);
  const ms = st.inSeason(season);
  const fame = st.hallOfFame(ms);
  const shame = st.hallOfShame(ms);
  // Moments without a match are timeless and show in every season.
  const keep = (m: Moment) => season === "all" || !m.matchId || ms.some((x) => x.id === m.matchId);
  const fameMoments = data.moments.filter((m) => m.kind === "fame" && keep(m));
  const shameMoments = data.moments.filter((m) => m.kind === "shame" && keep(m));
  const darkest = ms
    .filter((m) => m.result === "L")
    .sort((a, b) => b.ga - b.gf - (a.ga - a.gf) || b.ga - a.ga)
    .slice(0, 3);
  const slug = data.club.slug;
  const edit: Editing = admin
    ? {
        save: saveMoment.bind(null, slug),
        remove: deleteMoment.bind(null, slug),
        players: data.players.filter((p) => p.active).map((p) => ({ id: p.id, label: p.name })),
        matches: [...data.matches].reverse().map((m) => ({ id: m.id, label: `${formatDate(m.date)} vs ${m.opponent}` })),
      }
    : null;

  return (
    <Page accent={data.club.accent}>
      <PageHero lead="Fame &" accent="shame." meta={seasonLabel(season)}>
        <SeasonLinks href={(s) => `${st.base}/halls?season=${s}`} seasons={st.seasons} active={season}>
          {admin && (
            <Link href="#hl-fame-moments" className="hx-manage">
              Add a moment
            </Link>
          )}
        </SeasonLinks>
      </PageHero>

      <div className="hx-bands">
        <Band className="hx-band-halls hl-hall hl-fame" labelledBy="hl-fame-title" bg={<span className="hl-light" />}>
          <Reveal className="hx-head">
            <h2 id="hl-fame-title">
              Hall of <em>Fame.</em>
            </h2>
            <p>Legends of the Sunday morning. Their names will be sung (by themselves, mostly).</p>
          </Reveal>
          <Reveal className="hl-awards">
            {fame.map((a) => (
              <AwardItem key={a.title} st={st} award={a} />
            ))}
          </Reveal>
          <Moments st={st} id="hl-fame-moments" kind="fame" title="Legendary moments" items={fameMoments} edit={edit} />
        </Band>

        <Band className="hx-band-board hl-hall hl-shame" labelledBy="hl-shame-title" bg={<span className="hl-light" />}>
          <Reveal className="hx-head">
            <h2 id="hl-shame-title">
              Hall of <em>Shame.</em>
            </h2>
            <p>Every club has them. Ours just happen to keep turning up.</p>
          </Reveal>
          <Reveal className="hl-awards">
            {shame.map((a) => (
              <AwardItem key={a.title} st={st} award={a} />
            ))}
          </Reveal>
          <Moments st={st} id="hl-shame-moments" kind="shame" title="Moments we'd rather forget" items={shameMoments} edit={edit} />
          {darkest.length > 0 && (
            <div className="hl-block">
              <h3 className="hl-sub">Darkest days</h3>
              <ol className="hl-dark">
                {darkest.map((m) => (
                  <li key={m.id}>
                    <Link href={`${st.base}/matches/${m.id}`}>
                      <b>
                        {m.gf}–{m.ga}
                      </b>
                      <span>
                        {m.opponent}
                        <small>
                          {formatDate(m.date)} · {m.competition} · {m.venue === "H" ? "Home" : "Away"}
                        </small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Band>
      </div>
    </Page>
  );
}
