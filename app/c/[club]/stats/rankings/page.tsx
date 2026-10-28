import type { Metadata } from "next";
import Link from "next/link";
import { NewRankingForm } from "@/components/RankingEditor";
import { PageHeader, StatsTabs } from "@/components/ui";
import { createRanking } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { allRankings } from "@/lib/rankings";

export const metadata: Metadata = { title: "Rankings" };

export default async function RankingsPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st, admin, coach } = await loadClub(slug);
  const rankings = allRankings(data, st);
  const canEdit = admin || coach;

  return (
    <>
      <PageHeader title="Stats" kicker="Rankings">
        <StatsTabs base={st.base} active="rankings" />
      </PageHeader>

      <div className="ranking-grid">
        {rankings.map((r) => (
          <Link key={r.id} href={`${st.base}/stats/rankings/${r.id}`} className="card ranking-card">
            <div className="ranking-card-head">
              <h2>
                {r.title} {r.accentText && <span className="ranking-accent">{r.accentText}</span>}
              </h2>
              <span className="small muted">{r.auto ? `From the stats · ${r.note}` : r.note}</span>
            </div>
            {r.rows.length ? (
              <ol className="ranking-podium">
                {r.rows.slice(0, 3).map((row, i) => (
                  <li key={row.player.id}>
                    <span className="ranking-place">{i + 1}</span>
                    <span className="ranking-name">{row.player.name}</span>
                    {row.value !== undefined && <span className="ranking-value">{row.value}</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted small" style={{ margin: 0 }}>{r.auto ? "Nobody yet this season." : "Nobody on the list yet."}</p>
            )}
            {r.rows.length > 3 && <span className="small muted">+ {r.rows.length - 3} more</span>}
          </Link>
        ))}
      </div>

      {canEdit ? (
        <div className="section">
          <NewRankingForm action={createRanking.bind(null, slug)} />
        </div>
      ) : (
        <p className="small muted section">The coach makes these lists. Each one has a graphic for Instagram.</p>
      )}
    </>
  );
}
