import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LineupForm } from "@/components/LineupForm";
import { Page, PageHero } from "@/components/home/Page";
import { saveLineup } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { matchLineup } from "@/lib/lineup";
import { formatDate } from "@/lib/stats";

export const metadata: Metadata = { title: "Line-up graphic" };

export default async function LineupPage({ params }: { params: Promise<{ club: string; id: string }> }) {
  const { club: slug, id } = await params;
  const { data, st, admin, coach } = await loadClub(slug);
  if (!admin && !coach) redirect(`${st.base}/login?next=${encodeURIComponent(`${st.base}/matches/${id}/lineup`)}`);
  const match = st.getMatch(id);
  if (!match) notFound();
  const noPhotos = data.players.filter((p) => p.active && !p.photo).length;

  return (
    <Page accent={data.club.accent}>
      <PageHero
        size="mini"
        back={{ href: `${st.base}/matches/${id}`, label: "Back to the match" }}
        lead="The"
        accent="line-up."
        meta={`${st.fixtureTitle(match)} · ${formatDate(match.date)}`}
      >
        <p className="hx-hero-note">
          The players start out guessed from the squad and their positions. Change anything, save, and download the PNG for Instagram.
          {noPhotos > 0 && (
            <>
              {" "}
              {noPhotos} active {noPhotos === 1 ? "player has" : "players have"} no photo yet and {noPhotos === 1 ? "shows" : "show"} as a shirt;{" "}
              {admin ? (
                <>
                  add photos and short names under <Link href={`${st.base}/settings#squad`}>Settings → Squad</Link>.
                </>
              ) : (
                "a club admin can add photos and short names."
              )}
            </>
          )}
        </p>
      </PageHero>
      <div className="hx-wrap hx-body">
        <LineupForm
          action={saveLineup.bind(null, slug, id)}
          players={data.players}
          initial={matchLineup(match, data.players)}
          image={`${st.base}/matches/${id}/graphics/lineup`}
        />
      </div>
    </Page>
  );
}
