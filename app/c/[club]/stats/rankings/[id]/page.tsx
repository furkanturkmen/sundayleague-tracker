import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RankingEditor } from "@/components/RankingEditor";
import { Submit } from "@/components/forms";
import { Reveal } from "@/components/home/Motion";
import { Page, PageHero } from "@/components/home/Page";
import { deleteRanking, saveRanking } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { dateLocale } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";
import { getRanking } from "@/lib/rankings";
import { ShareGraphic } from "@/components/ShareGraphic";

type Props = { params: Promise<{ club: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { club, id } = await params;
  const { data, st } = await loadClub(club);
  const t = await getT();
  const r = getRanking(data, st, id);
  return { title: r ? (r.auto ? t(r.title) : r.title) : t("Ranking") };
}

export default async function RankingPage({ params }: Props) {
  const { club: slug, id } = await params;
  const { data, st, admin, coach } = await loadClub(slug);
  const ranking = getRanking(data, st, id);
  if (!ranking) notFound();
  const image = `${st.base}/stats/rankings/${id}/graphic`;
  const editable = !ranking.auto && (admin || coach);
  const t = await getT();
  const lang = await getLang();
  // The stat lists have English titles to translate; the coach's own are their own words.
  const title = ranking.auto ? t(ranking.title) : ranking.title;
  const note = ranking.auto
    ? `${t("From the stats")} · ${t(ranking.note)}`
    : ranking.updatedAt
      ? t("Updated {date}", { date: new Date(ranking.updatedAt).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short" }) })
      : ranking.note;

  return (
    <Page accent={data.club.accent}>
      <PageHero
        size="mini"
        back={{ href: `${st.base}/stats/rankings`, label: t("All rankings") }}
        lead={ranking.accentText ? title : undefined}
        accent={ranking.accentText || title}
        meta={note}
      />

      <div className="hx-wrap hx-body">
        {editable ? (
          <>
            <RankingEditor
              action={saveRanking.bind(null, slug, id)}
              players={data.players}
              initial={{ title: ranking.title, accentText: ranking.accentText, players: ranking.rows.map((r) => r.player.id) }}
              image={image}
            />
            <form action={deleteRanking.bind(null, slug)} className="rk-delete">
              <input type="hidden" name="id" value={id} />
              <Submit className="btn-link danger" pending={t("Deleting…")}>
                {t("Delete this ranking")}
              </Submit>
            </form>
          </>
        ) : (
          <div className="lineup-layout">
            <Reveal>
              {ranking.rows.length ? (
                <ol className="rk-list">
                  {ranking.rows.map((row, i) => (
                    <li key={row.player.id}>
                      <Link href={`${st.base}/players/${row.player.id}`}>
                        <span className="rk-place">{i + 1}</span>
                        <span className="rk-name">{row.player.name}</span>
                        {row.value !== undefined && <b>{row.value}</b>}
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="hx-empty">{t("Nobody on this list yet.")}</p>
              )}
            </Reveal>
            <Reveal className="lineup-preview" delay={0.08}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} width={1080} height={1350} alt={t("{title} graphic", { title })} />
              <div className="form-actions">
                <ShareGraphic src={image} />
              </div>
            </Reveal>
          </div>
        )}
      </div>
    </Page>
  );
}
