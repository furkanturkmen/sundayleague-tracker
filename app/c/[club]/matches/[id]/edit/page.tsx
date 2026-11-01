import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MatchForm } from "@/components/MatchForm";
import { Page, PageHero } from "@/components/home/Page";
import { saveMatch } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { getLang, getT } from "@/lib/i18n/server";
import { formatDate } from "@/lib/stats";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Edit match") };
}

export default async function EditMatchPage({ params }: { params: Promise<{ club: string; id: string }> }) {
  const { club: slug, id } = await params;
  const { data, st, admin } = await loadClub(slug);
  if (!admin) redirect(`${st.base}/login?next=${encodeURIComponent(`${st.base}/matches/${id}/edit`)}`);
  const match = st.getMatch(id);
  if (!match) notFound();
  const opponents = [...new Set(data.matches.map((m) => m.opponent))].sort();
  const competitions = [...new Set(data.matches.map((m) => m.competition))];
  const [t, lang] = await Promise.all([getT(), getLang()]);

  return (
    <Page accent={data.club.accent}>
      <PageHero
        size="mini"
        back={{ href: `${st.base}/matches/${id}`, label: t("Back to the match") }}
        lead={t("Edit the")}
        accent={t("match.")}
        meta={`${st.fixtureTitle(match)} · ${formatDate(match.date, undefined, lang)}`}
      />
      <div className="hx-wrap hx-body hx-form-page">
        <MatchForm action={saveMatch.bind(null, slug)} players={data.players} match={match} opponents={opponents} competitions={competitions} />
      </div>
    </Page>
  );
}
