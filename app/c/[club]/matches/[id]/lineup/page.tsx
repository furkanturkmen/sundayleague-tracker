import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LineupForm } from "@/components/LineupForm";
import { PageHeader } from "@/components/ui";
import { saveLineup } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { matchLineup } from "@/lib/lineup";
import { formatDate } from "@/lib/stats";

export const metadata: Metadata = { title: "Line-up graphic" };

export default async function LineupPage({ params }: { params: Promise<{ club: string; id: string }> }) {
  const { club: slug, id } = await params;
  const { data, st, admin } = await loadClub(slug);
  if (!admin) redirect(`${st.base}/login?next=${encodeURIComponent(`${st.base}/matches/${id}/lineup`)}`);
  const match = st.getMatch(id);
  if (!match) notFound();
  const noPhotos = data.players.filter((p) => p.active && !p.photo).length;

  return (
    <>
      <Link href={`${st.base}/matches/${id}`} className="small muted">← Back to the match</Link>
      <PageHeader title="Line-up graphic" kicker={`${st.fixtureTitle(match)} · ${formatDate(match.date)}`}>
        <p className="muted" style={{ margin: 0 }}>
          The players start out guessed from the squad and their positions. Change anything, save, and download the PNG for Instagram.
          {noPhotos > 0 && (
            <>
              {" "}{noPhotos} active {noPhotos === 1 ? "player has" : "players have"} no photo yet and {noPhotos === 1 ? "shows" : "show"} as a shirt;
              add photos and short names under <Link href={`${st.base}/settings#squad`}>Settings → Squad</Link>.
            </>
          )}
        </p>
      </PageHeader>
      <LineupForm
        action={saveLineup.bind(null, slug, id)}
        players={data.players}
        initial={matchLineup(match, data.players)}
        image={`${st.base}/matches/${id}/graphics/lineup`}
      />
    </>
  );
}
