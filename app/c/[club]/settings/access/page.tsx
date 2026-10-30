import type { Metadata } from "next";
import { CoachPasswordForm, DeleteClubForm, PasswordForm } from "@/components/forms";
import { Page } from "@/components/home/Page";
import { changePassword, deleteClub, setCoachPassword } from "@/lib/actions";
import { hasCoachLogin } from "@/lib/club";
import { loadSettings, SettingsHero } from "../shared";

export const metadata: Metadata = { title: "Access · Settings" };

export default async function AccessSettingsPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st } = await loadSettings(slug, "access");
  const { club } = data;
  return (
    <Page accent={club.accent}>
      <SettingsHero base={st.base} active="access" />
      <div className="hx-wrap hx-body hx-form-page">
        <section className="card section">
          <h2>Admin password</h2>
          <PasswordForm action={changePassword.bind(null, slug)} />
        </section>
        <section id="coach-login" className="card section">
          <h2>Coach login</h2>
          <p className="small muted">
            A separate password for the coach. It only lets them set line-ups for the graphics, not change the squad, results or settings.
          </p>
          <CoachPasswordForm action={setCoachPassword.bind(null, slug)} isSet={await hasCoachLogin(slug)} />
        </section>
        <section className="card section danger-zone">
          <h2>Danger zone</h2>
          <DeleteClubForm action={deleteClub.bind(null, slug)} name={club.name} />
        </section>
      </div>
    </Page>
  );
}
