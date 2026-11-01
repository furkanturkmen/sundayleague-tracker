import type { Metadata } from "next";
import { headers } from "next/headers";
import { AdminPassword, DangerZone, RoleLogin, Visibility } from "@/components/AccessEditor";
import { Page } from "@/components/home/Page";
import { changePassword, deleteClub, setCoachPassword, setSquadPassword, setVisibility } from "@/lib/actions";
import { hasCoachLogin, hasRecoveryCode, hasSquadLogin } from "@/lib/club";
import { RecoveryCode } from "@/components/RecoveryCode";
import { getT } from "@/lib/i18n/server";
import { loadSettings, SettingsHero } from "../shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Access · Settings") };
}

export default async function AccessSettingsPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st } = await loadSettings(slug, "access");
  const { club } = data;
  const [coachOn, squadOn, recoveryOn] = await Promise.all([hasCoachLogin(slug), hasSquadLogin(slug), hasRecoveryCode(slug)]);
  const t = await getT();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const clubUrl = `${proto}://${host}/c/${slug}`;
  const loginUrl = `${clubUrl}/login`;

  return (
    <Page accent={club.accent}>
      <SettingsHero base={st.base} active="access" />
      <div className="hx-wrap hx-body hx-form-page">
        <div className="ve">
          <section aria-labelledby="ac-who">
            <h2 id="ac-who" className="ve-h">
              {t("Who can do what")}
            </h2>
            <ul className="ac-roles">
              {club.private ? (
                <li>
                  <b>{t("Squad")}</b>
                  <span>{t("Sees results, players, stats and the halls with the squad password.")} {squadOn ? "" : t("No squad password yet.")}</span>
                </li>
              ) : (
                <li>
                  <b>{t("Anyone with the link")}</b>
                  <span>{t("Sees results, players, stats and the halls.")}</span>
                </li>
              )}
              <li>
                <b>{t("Coach")}</b>
                <span>{t("Sets line-ups and makes the graphics.")} {coachOn ? t("Login is on.") : t("Off until you set a coach password.")}</span>
              </li>
              <li>
                <b>{t("Admin")}</b>
                <span>{t("Changes everything: squad, results, settings. That's you.")}</span>
              </li>
            </ul>
          </section>

          <section className="ce-group" aria-labelledby="ac-see">
            <h3 id="ac-see" className="ve-h">
              {t("Who can see the club")}
            </h3>
            <Visibility action={setVisibility.bind(null, slug)} isPrivate={club.private} />
            {club.private && (
              <>
                <p className="ce-note">{t("The squad password only opens the club to look around. Send it to the team with the link.")}</p>
                <RoleLogin role="squad" action={setSquadPassword.bind(null, slug)} isSet={squadOn} loginUrl={clubUrl} />
              </>
            )}
          </section>

          <section className="ce-group" aria-labelledby="ac-admin">
            <h3 id="ac-admin" className="ve-h">
              {t("Admin password")}
            </h3>
            <p className="ce-note">{t("Share it only with whoever runs the stats.")}</p>
            <AdminPassword action={changePassword.bind(null, slug)} />
          </section>

          <section id="recovery" className="ce-group" aria-labelledby="ac-recovery">
            <h3 id="ac-recovery" className="ve-h">
              {t("Recovery code")}
            </h3>
            <p className="ce-note">{t("Resets the admin password from the sign-in page when nobody remembers it. Each code works once.")}</p>
            <RecoveryCode slug={slug} isSet={recoveryOn} />
          </section>

          <section id="coach-login" className="ce-group" aria-labelledby="ac-coach">
            <h3 id="ac-coach" className="ve-h">
              {t("Coach login")}
            </h3>
            <p className="ce-note">{t("A second password that only lets the coach set line-ups, not change the squad, results or settings.")}</p>
            <RoleLogin role="coach" action={setCoachPassword.bind(null, slug)} isSet={coachOn} loginUrl={loginUrl} />
          </section>

          <DangerZone action={deleteClub.bind(null, slug)} name={club.name} />
        </div>
      </div>
    </Page>
  );
}
