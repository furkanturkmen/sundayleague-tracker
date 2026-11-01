import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Band } from "@/components/home/Band";
import { Reveal } from "@/components/home/Motion";
import { Page, PageHero, SeasonLinks } from "@/components/home/Page";
import { AddMoment, DeleteMoment } from "@/components/MomentEditor";
import { deleteMoment, saveMoment } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import type { Lang, T } from "@/lib/i18n";
import { homeVenue } from "@/lib/i18n/nl-matches";
import { getLang, getT } from "@/lib/i18n/server";
import { formatDate, seasonLabel, type Award, type Stats } from "@/lib/stats";
import type { Moment } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Hall of Fame & Hall of Shame") };
}

/** An award's figure ("60% of 8", "2 yellow, 1 red", "1.4 per game") with its words in the visitor's language. */
const figure = (display: string, t: T) => display.replace(/\b(of|yellow|red|per game|in)\b/g, (w) => t(w));

// Two halls, each under its own light: warm gold for the legends, red for the rest. Every award names its holder
// large with the chasing pack under them; the stories and the darkest days follow.

function AwardItem({ st, award, t }: { st: Stats; award: Award; t: T }) {
  const [winner, ...rest] = award.leaders;
  return (
    <div className="hl-award">
      <span className="hl-icon">
        <Icon name={award.icon} />
      </span>
      <h3>{t(award.title)}</h3>
      <p className="hl-blurb">{t(award.blurb)}</p>
      {winner ? (
        <>
          <p className="hl-winner">
            <Link href={`${st.base}/players/${winner.player.id}`}>{winner.player.name}</Link>
            <b>{figure(winner.display, t)}</b>
          </p>
          {rest.length > 0 && (
            <ol className="hl-runners" start={2}>
              {rest.map((l) => (
                <li key={l.player.id}>
                  <Link href={`${st.base}/players/${l.player.id}`}>{l.player.name}</Link>
                  <span>{figure(l.display, t)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <p className="hx-empty">{t("Vacant. For now.")}</p>
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

function Moments({
  st,
  id,
  kind,
  title,
  items,
  edit,
  t,
  lang,
}: {
  st: Stats;
  id: string;
  kind: "fame" | "shame";
  title: string;
  items: Moment[];
  edit: Editing;
  t: T;
  lang: Lang;
}) {
  if (!items.length && !edit) return null;
  return (
    <div className="hl-block" id={id}>
      <h3 className="hl-sub">{title}</h3>
      {edit && <AddMoment action={edit.save} kind={kind} players={edit.players} matches={edit.matches} />}
      {!items.length && <p className="hx-empty">{t("Nothing here yet.")}</p>}
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
                    {t("vs")} {match.opponent}, {formatDate(match.date, undefined, lang)}
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
  const t = await getT();
  const lang = await getLang();
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
        matches: [...data.matches].reverse().map((m) => ({ id: m.id, label: `${formatDate(m.date, undefined, lang)} ${t("vs")} ${m.opponent}` })),
      }
    : null;

  return (
    <Page accent={data.club.accent}>
      <PageHero lead={t("Fame &")} accent={t("shame.")} meta={t(seasonLabel(season))}>
        <SeasonLinks href={(s) => `${st.base}/halls?season=${s}`} seasons={st.seasons} active={season}>
          {admin && (
            <Link href="#hl-fame-moments" className="hx-manage">
              {t("Add a moment")}
            </Link>
          )}
        </SeasonLinks>
      </PageHero>

      <div className="hx-bands">
        <Band className="hx-band-halls hl-hall hl-fame" labelledBy="hl-fame-title" bg={<span className="hl-light" />}>
          <Reveal className="hx-head">
            <h2 id="hl-fame-title">
              {t("Hall of")} <em>{t("Fame.")}</em>
            </h2>
            <p>{t("Legends of the Sunday morning. Their names will be sung (by themselves, mostly).")}</p>
          </Reveal>
          <Reveal className="hl-awards">
            {fame.map((a) => (
              <AwardItem key={a.title} st={st} award={a} t={t} />
            ))}
          </Reveal>
          <Moments st={st} id="hl-fame-moments" kind="fame" title={t("Legendary moments")} items={fameMoments} edit={edit} t={t} lang={lang} />
        </Band>

        <Band className="hx-band-board hl-hall hl-shame" labelledBy="hl-shame-title" bg={<span className="hl-light" />}>
          <Reveal className="hx-head">
            <h2 id="hl-shame-title">
              {t("Hall of")} <em>{t("Shame.")}</em>
            </h2>
            <p>{t("Every club has them. Ours just happen to keep turning up.")}</p>
          </Reveal>
          <Reveal className="hl-awards">
            {shame.map((a) => (
              <AwardItem key={a.title} st={st} award={a} t={t} />
            ))}
          </Reveal>
          <Moments st={st} id="hl-shame-moments" kind="shame" title={t("Moments we'd rather forget")} items={shameMoments} edit={edit} t={t} lang={lang} />
          {darkest.length > 0 && (
            <div className="hl-block">
              <h3 className="hl-sub">{t("Darkest days")}</h3>
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
                          {formatDate(m.date, undefined, lang)} · {t(m.competition)} · {m.venue === "H" ? homeVenue(lang) : t("Away")}
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
