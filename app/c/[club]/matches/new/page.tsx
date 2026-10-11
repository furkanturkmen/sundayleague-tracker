import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MatchForm } from "@/components/MatchForm";
import { PageHeader } from "@/components/ui";
import { saveMatch } from "@/lib/actions";
import { loadClub } from "@/lib/club";

export const metadata: Metadata = { title: "Add match" };

export default async function NewMatchPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st, admin } = await loadClub(slug);
  if (!admin) redirect(`${st.base}/login?next=${encodeURIComponent(`${st.base}/matches/new`)}`);
  const opponents = [...new Set(data.matches.map((m) => m.opponent))].sort();
  const competitions = [...new Set(data.matches.map((m) => m.competition))];

  return (
    <div className="narrow-wide">
      <PageHeader title="Add match" kicker="Result or upcoming fixture" />
      <MatchForm action={saveMatch.bind(null, slug)} players={data.players} opponents={opponents} competitions={competitions} />
    </div>
  );
}
