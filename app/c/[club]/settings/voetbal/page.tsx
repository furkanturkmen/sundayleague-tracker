import type { Metadata } from "next";
import { Page } from "@/components/home/Page";
import { LoginForm, SyncNow, TeamLink } from "@/components/VoetbalEditor";
import { removeVoetbalLogin, saveVoetbalLink, saveVoetbalLogin, syncVoetbal } from "@/lib/actions";
import { dateLocale, type Lang, type T } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";
import { hiddenPlayersNote, voetbalConfigured, voetbalLoginEmail } from "@/lib/voetbal";
import { loadSettings, SettingsHero } from "../shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("voetbal.nl · Settings") };
}

/** "today at 07:02", "yesterday at 20:31" or "12 Oct at 07:02", Amsterdam time. */
function syncedLabel(iso: string, t: T, lang: Lang): string {
  const tz = "Europe/Amsterdam";
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: tz });
  const at = new Date(iso);
  const time = at.toLocaleTimeString(dateLocale(lang), { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const now = new Date();
  if (day(at) === day(now)) return t("today at {time}", { time });
  if (day(at) === day(new Date(now.getTime() - 86_400_000))) return t("yesterday at {time}", { time });
  return t("{date} at {time}", { date: at.toLocaleDateString(dateLocale(lang), { timeZone: tz, day: "numeric", month: "short" }), time });
}

export default async function VoetbalSettingsPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st } = await loadSettings(slug, "voetbal");
  const { club } = data;
  const vnl = club.voetbal;
  const email = await voetbalLoginEmail(club.id);
  const siteAccount = voetbalConfigured();
  const canSync = Boolean(email) || siteAccount;
  const [t, lang] = [await getT(), await getLang()];
  const hidden = hiddenPlayersNote(Math.max(0, ...data.matches.map((m) => m.lineupHidden ?? 0)), t);

  return (
    <Page accent={club.accent}>
      <SettingsHero base={st.base} active="voetbal" />
      <div className="hx-wrap hx-body hx-form-page">
        <div className="ve">
          <section className="ve-status" aria-labelledby="ve-status-title">
            {vnl ? (
              <>
                <p className="ve-kicker">{t("Connected team")}</p>
                <h2 id="ve-status-title">{vnl.teamName ?? vnl.teamId}</h2>
                {vnl.league && <p className="ve-league">{vnl.league}</p>}
                <dl className="ve-facts">
                  <div>
                    <dt>{t("Last synced")}</dt>
                    <dd>{vnl.syncedAt ? syncedLabel(vnl.syncedAt, t, lang) : t("Not yet")}</dd>
                  </div>
                  <div>
                    <dt>{t("Account")}</dt>
                    <dd>{email ? t("Your own login") : siteAccount ? t("Site's shared account") : t("None")}</dd>
                  </div>
                  <div>
                    <dt>{t("Syncs by itself")}</dt>
                    <dd>{t("Every morning, and Sunday evening")}</dd>
                  </div>
                </dl>
                {vnl.error && <p className="notice notice-error">{t("Last sync failed: {error}", { error: t(vnl.error) })}</p>}
                {hidden && <p className="notice notice-warn">{hidden}</p>}
                {canSync && <SyncNow sync={syncVoetbal.bind(null, slug)} />}
              </>
            ) : (
              <>
                <p className="ve-kicker">{t("Not connected")}</p>
                <h2 id="ve-status-title">{t("Pull your season from voetbal.nl.")}</h2>
                <p className="ve-league">
                  {t("Fixtures, results, line-ups and the league table come in by themselves. Scorers, assists and cards aren't on voetbal.nl, so you still add those to each match.")}
                </p>
              </>
            )}
          </section>

          <section className="ce-group" aria-labelledby="ve-team">
            <h3 id="ve-team" className="ve-h">{t("Team")}</h3>
            <TeamLink save={saveVoetbalLink.bind(null, slug)} teamId={vnl?.teamId ?? null} />
          </section>

          <section className="ce-group" aria-labelledby="ve-login">
            <h3 id="ve-login" className="ve-h">{t("voetbal.nl login")}</h3>
            <p className="ce-note">
              {t("voetbal.nl only shows team pages to people who are logged in. Any voetbal.nl account works; without one, the site's own is used. The password is stored encrypted and only used to read your team's pages; nobody can see it here again.")}
            </p>
            <LoginForm
              save={saveVoetbalLogin.bind(null, slug)}
              remove={removeVoetbalLogin.bind(null, slug)}
              email={email}
              siteAccount={siteAccount}
            />
          </section>
        </div>
      </div>
    </Page>
  );
}
