import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MatchForm } from "@/components/MatchForm";
import { Page, PageHero } from "@/components/home/Page";
import { saveMatch } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { formatDate } from "@/lib/stats";

export const metadata: Metadata = { title: "Edit match" };

export default async function EditMatchPage({ params }: { params: Promise<{ club: string; id: string }> }) {
  const { club: slug, id } = await params;
  const { data, st, admin } = await loadClub(slug);
  if (!admin) redirect(`${st.base}/login?next=${encodeURIComponent(`${st.base}/matches/${id}/edit`)}`);
  const match = st.getMatch(id);
  if (!match) notFound();
  const opponents = [...new Set(data.matches.map((m) => m.opponent))].sort();
  const competitions = [...new Set(data.matches.map((m) => m.competition))];

  return (
    <Page accent={data.club.accent}>
      <PageHero
        size="mini"
        back={{ href: `${st.base}/matches/${id}`, label: "Back to the match" }}
        lead="Edit the"
        accent="match."
        meta={`${st.fixtureTitle(match)} · ${formatDate(match.date)}`}
      />
      <div className="hx-wrap hx-body hx-form-page">
        <MatchForm action={saveMatch.bind(null, slug)} players={data.players} match={match} opponents={opponents} competitions={competitions} />
      </div>
    </Page>
  );
}
