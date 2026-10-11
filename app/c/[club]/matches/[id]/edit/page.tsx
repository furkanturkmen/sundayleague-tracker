import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MatchForm } from "@/components/MatchForm";
import { PageHeader } from "@/components/ui";
import { saveMatch } from "@/lib/actions";
import { loadClub } from "@/lib/club";

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
    <div className="narrow-wide">
      <PageHeader title={`Edit: ${st.fixtureTitle(match)}`} kicker="Match" />
      <MatchForm action={saveMatch.bind(null, slug)} players={data.players} match={match} opponents={opponents} competitions={competitions} />
    </div>
  );
}
