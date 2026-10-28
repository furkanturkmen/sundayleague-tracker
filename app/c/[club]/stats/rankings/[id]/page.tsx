import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RankingEditor } from "@/components/RankingEditor";
import { Submit } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { deleteRanking, saveRanking } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { getRanking } from "@/lib/rankings";

type Props = { params: Promise<{ club: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { club, id } = await params;
  const { data, st } = await loadClub(club);
  return { title: getRanking(data, st, id)?.title ?? "Ranking" };
}

export default async function RankingPage({ params }: Props) {
  const { club: slug, id } = await params;
  const { data, st, admin, coach } = await loadClub(slug);
  const ranking = getRanking(data, st, id);
  if (!ranking) notFound();
  const image = `${st.base}/stats/rankings/${id}/graphic`;
  const editable = !ranking.auto && (admin || coach);

  return (
    <>
      <Link href={`${st.base}/stats/rankings`} className="small muted">← All rankings</Link>
      <PageHeader title={[ranking.title, ranking.accentText].filter(Boolean).join(" ")} kicker={ranking.auto ? `From the stats · ${ranking.note}` : `Ranking · ${ranking.note}`} />

      {editable ? (
        <>
          <RankingEditor
            action={saveRanking.bind(null, slug, id)}
            players={data.players}
            initial={{ title: ranking.title, accentText: ranking.accentText, players: ranking.rows.map((r) => r.player.id) }}
            image={image}
          />
          <form action={deleteRanking.bind(null, slug)} className="section">
            <input type="hidden" name="id" value={id} />
            <Submit className="btn-link danger" pending="Deleting…">Delete this ranking</Submit>
          </form>
        </>
      ) : (
        <div className="lineup-layout">
          <div className="card">
            {ranking.rows.length ? (
              <ol className="ranking-podium ranking-full">
                {ranking.rows.map((row, i) => (
                  <li key={row.player.id}>
                    <span className="ranking-place">{i + 1}</span>
                    <Link href={`${st.base}/players/${row.player.id}`} className="ranking-name">{row.player.name}</Link>
                    {row.value !== undefined && <span className="ranking-value">{row.value}</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted" style={{ margin: 0 }}>Nobody on this list yet.</p>
            )}
          </div>
          <div className="card lineup-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} width={1080} height={1350} alt={`${ranking.title} graphic`} />
            <div className="form-actions">
              <a href={`${image}?download=1`} className="btn" download>Download PNG</a>
              <span className="small muted">1080×1350, for Instagram.</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
