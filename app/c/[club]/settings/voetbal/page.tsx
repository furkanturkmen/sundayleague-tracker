import type { Metadata } from "next";
import { Page } from "@/components/home/Page";
import { LoginForm, SyncNow, TeamLink } from "@/components/VoetbalEditor";
import { removeVoetbalLogin, saveVoetbalLink, saveVoetbalLogin, syncVoetbal } from "@/lib/actions";
import { hiddenPlayersNote, voetbalConfigured, voetbalLoginEmail } from "@/lib/voetbal";
import { loadSettings, SettingsHero } from "../shared";

export const metadata: Metadata = { title: "voetbal.nl · Settings" };

/** "today at 07:02", "yesterday at 20:31" or "12 Oct at 07:02", Amsterdam time. */
function syncedLabel(iso: string): string {
  const tz = "Europe/Amsterdam";
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: tz });
  const at = new Date(iso);
  const time = at.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const now = new Date();
  if (day(at) === day(now)) return `today at ${time}`;
  if (day(at) === day(new Date(now.getTime() - 86_400_000))) return `yesterday at ${time}`;
  return `${at.toLocaleDateString("en-GB", { timeZone: tz, day: "numeric", month: "short" })} at ${time}`;
}

export default async function VoetbalSettingsPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st } = await loadSettings(slug, "voetbal");
  const { club } = data;
  const vnl = club.voetbal;
  const email = await voetbalLoginEmail(club.id);
  const siteAccount = voetbalConfigured();
  const canSync = Boolean(email) || siteAccount;
  const hidden = hiddenPlayersNote(Math.max(0, ...data.matches.map((m) => m.lineupHidden ?? 0)));

  return (
    <Page accent={club.accent}>
      <SettingsHero base={st.base} active="voetbal" />
      <div className="hx-wrap hx-body hx-form-page">
        <div className="ve">
          <section className="ve-status" aria-labelledby="ve-status-title">
            {vnl ? (
              <>
                <p className="ve-kicker">Connected team</p>
                <h2 id="ve-status-title">{vnl.teamName ?? vnl.teamId}</h2>
                {vnl.league && <p className="ve-league">{vnl.league}</p>}
                <dl className="ve-facts">
                  <div>
                    <dt>Last synced</dt>
                    <dd>{vnl.syncedAt ? syncedLabel(vnl.syncedAt) : "Not yet"}</dd>
                  </div>
                  <div>
                    <dt>Account</dt>
                    <dd>{email ? "Your own login" : siteAccount ? "Site's shared account" : "None"}</dd>
                  </div>
                  <div>
                    <dt>Syncs by itself</dt>
                    <dd>Every morning, and Sunday evening</dd>
                  </div>
                </dl>
                {vnl.error && <p className="notice notice-error">Last sync failed: {vnl.error}</p>}
                {hidden && <p className="notice notice-warn">{hidden}</p>}
                {canSync && <SyncNow sync={syncVoetbal.bind(null, slug)} />}
              </>
            ) : (
              <>
                <p className="ve-kicker">Not connected</p>
                <h2 id="ve-status-title">Pull your season from voetbal.nl.</h2>
                <p className="ve-league">
                  Fixtures, results, line-ups and the league table come in by themselves. Scorers, assists and cards aren&apos;t on voetbal.nl, so you
                  still add those to each match.
                </p>
              </>
            )}
          </section>

          <section className="ce-group" aria-labelledby="ve-team">
            <h3 id="ve-team" className="ve-h">Team</h3>
            <TeamLink save={saveVoetbalLink.bind(null, slug)} teamId={vnl?.teamId ?? null} />
          </section>

          <section className="ce-group" aria-labelledby="ve-login">
            <h3 id="ve-login" className="ve-h">voetbal.nl login</h3>
            <p className="ce-note">
              voetbal.nl only shows team pages to people who are logged in. Any voetbal.nl account works; without one, the site&apos;s own is used.
              The password is stored encrypted and only used to read your team&apos;s pages; nobody can see it here again.
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
