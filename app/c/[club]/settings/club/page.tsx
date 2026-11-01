import type { Metadata } from "next";
import { ClubEditor } from "@/components/ClubEditor";
import { Page } from "@/components/home/Page";
import { updateClub } from "@/lib/actions";
import { getT } from "@/lib/i18n/server";
import { graphicName } from "@/lib/lineup";
import { loadSettings, SettingsHero } from "../shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Club · Settings") };
}

export default async function ClubSettingsPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st } = await loadSettings(slug, "club");
  const { club, players } = data;
  // Four players for the preview's line-up strip, those with a photo first, so it looks like the real graphic.
  const preview = players
    .filter((p) => p.active)
    .sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)) || (a.number ?? 99) - (b.number ?? 99))
    .slice(0, 4)
    .map((p) => ({ id: p.id, name: graphicName(p, players), photo: p.photo }));
  return (
    <Page accent={club.accent}>
      <SettingsHero base={st.base} active="club" />
      <div className="hx-wrap hx-body hx-form-page hx-form-wide">
        <ClubEditor action={updateClub.bind(null, slug)} club={club} players={preview} />
      </div>
    </Page>
  );
}
