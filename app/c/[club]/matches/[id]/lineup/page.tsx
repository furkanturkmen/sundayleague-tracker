import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LineupForm } from "@/components/LineupForm";
import { Page, PageHero } from "@/components/home/Page";
import { saveLineup } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { matchLineup } from "@/lib/lineup";
import { getLang, getT } from "@/lib/i18n/server";
import { formatDate } from "@/lib/stats";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Line-up graphic") };
}

export default async function LineupPage({ params }: { params: Promise<{ club: string; id: string }> }) {
  const { club: slug, id } = await params;
  const { data, st, admin, coach } = await loadClub(slug);
  if (!admin && !coach) redirect(`${st.base}/login?next=${encodeURIComponent(`${st.base}/matches/${id}/lineup`)}`);
  const match = st.getMatch(id);
  if (!match) notFound();
  const noPhotos = data.players.filter((p) => p.active && !p.photo).length;
  const [t, lang] = await Promise.all([getT(), getLang()]);

  return (
    <Page accent={data.club.accent}>
      <PageHero
        size="mini"
        back={{ href: `${st.base}/matches/${id}`, label: t("Back to the match") }}
        lead={t("The")}
        accent={t("line-up.")}
        meta={`${st.fixtureTitle(match)} · ${formatDate(match.date, undefined, lang)}`}
      >
        <p className="hx-hero-note">
          {t("The players start out guessed from the squad and their positions. Change anything, save, and download the PNG for Instagram.")}
          {noPhotos > 0 && (
            <>
              {" "}
              {noPhotos === 1
                ? t("{n} active player has no photo yet and shows as a shirt;", { n: 1 })
                : t("{n} active players have no photo yet and show as a shirt;", { n: noPhotos })}{" "}
              {admin ? (
                <>
                  {t("add photos and short names under")} <Link href={`${st.base}/settings/squad`}>{t("Settings → Squad")}</Link>.
                </>
              ) : (
                t("a club admin can add photos and short names.")
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
