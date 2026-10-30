import type { Metadata } from "next";
import { ClubForm } from "@/components/forms";
import { Page } from "@/components/home/Page";
import { updateClub } from "@/lib/actions";
import { loadSettings, SettingsHero } from "../shared";

export const metadata: Metadata = { title: "Club · Settings" };

export default async function ClubSettingsPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st } = await loadSettings(slug, "club");
  const { club } = data;
  return (
    <Page accent={club.accent}>
      <SettingsHero base={st.base} active="club" />
      <div className="hx-wrap hx-body hx-form-page">
        <section className="card section">
          <h2>Club details</h2>
          <ClubForm action={updateClub.bind(null, slug)} club={club} />
        </section>
      </div>
    </Page>
  );
}
