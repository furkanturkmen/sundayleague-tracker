import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MatchForm } from "@/components/MatchForm";
import { Page, PageHero } from "@/components/home/Page";
import { saveMatch } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Add match") };
}

export default async function NewMatchPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st, admin } = await loadClub(slug);
  if (!admin) redirect(`${st.base}/login?next=${encodeURIComponent(`${st.base}/matches/new`)}`);
  const opponents = [...new Set(data.matches.map((m) => m.opponent))].sort();
  const competitions = [...new Set(data.matches.map((m) => m.competition))];
  const t = await getT();

  return (
    <Page accent={data.club.accent}>
      <PageHero
        size="mini"
        back={{ href: `${st.base}/matches`, label: t("All matches") }}
        lead={t("Add a")}
        accent={t("match.")}
        meta={t("A result, or a fixture still to come.")}
      />
      <div className="hx-wrap hx-body hx-form-page">
        <MatchForm action={saveMatch.bind(null, slug)} players={data.players} opponents={opponents} competitions={competitions} />
      </div>
    </Page>
  );
}
