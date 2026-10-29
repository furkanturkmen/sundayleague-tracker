import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/home/Motion";
import { Page, PageHero, Section, StatsNav } from "@/components/home/Page";
import { NewRankingForm } from "@/components/RankingEditor";
import { createRanking } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { allRankings } from "@/lib/rankings";

export const metadata: Metadata = { title: "Rankings" };

// Every list on one page, each led by its number one: the coach's lists and the ones worked out from the stats.

export default async function RankingsPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st, admin, coach } = await loadClub(slug);
  const rankings = allRankings(data, st);
  const canEdit = admin || coach;

  return (
    <Page accent={data.club.accent}>
      <PageHero lead="The" accent="rankings." meta="Each list has its own graphic for Instagram.">
        <StatsNav base={st.base} active="rankings" />
      </PageHero>

      <div className="hx-wrap hx-body">
        <ol className="rk-grid">
          {rankings.map((r, i) => {
            const [first, ...rest] = r.rows;
            return (
              <Reveal as="li" key={r.id} delay={(i % 3) * 0.06}>
                <Link href={`${st.base}/stats/rankings/${r.id}`} className="rk">
                  <span className="hx-label">{r.auto ? `From the stats · ${r.note}` : r.note}</span>
                  <span className="rk-title">
                    {r.title} {r.accentText && <em>{r.accentText}</em>}
                  </span>
                  {first ? (
                    <>
                      <span className="rk-first">
                        <span className="rk-place">1</span>
                        <span className="rk-name">{first.player.name}</span>
                        {first.value !== undefined && <b>{first.value}</b>}
                      </span>
                      {rest.length > 0 && (
                        <ol className="rk-rest" start={2}>
                          {rest.slice(0, 2).map((row, j) => (
                            <li key={row.player.id}>
                              <span className="hx-rank">{j + 2}</span>
                              <span className="rk-name">{row.player.name}</span>
                              {row.value !== undefined && <span className="hx-val">{row.value}</span>}
                            </li>
                          ))}
                        </ol>
                      )}
                      <span className="rk-more">{r.rows.length > 3 ? `${r.rows.length - 3} more on the list` : "See the list"}</span>
                    </>
                  ) : (
                    <span className="hx-empty">{r.auto ? "Nobody yet this season." : "Nobody on the list yet."}</span>
                  )}
                </Link>
              </Reveal>
            );
          })}
        </ol>

        {canEdit ? (
          <Section id="rk-new" lead="A new" accent="list." note="Give it a title, then put the players in order." small>
            <NewRankingForm action={createRanking.bind(null, slug)} />
          </Section>
        ) : (
          <p className="hx-empty rk-note">The coach makes these lists.</p>
        )}
      </div>
    </Page>
  );
}
