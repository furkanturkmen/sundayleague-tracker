import type { Metadata } from "next";
import { VoetbalForm } from "@/components/forms";
import { Page } from "@/components/home/Page";
import { saveVoetbalLink, syncVoetbal } from "@/lib/actions";
import { voetbalConfigured } from "@/lib/voetbal";
import { loadSettings, SettingsHero } from "../shared";

export const metadata: Metadata = { title: "voetbal.nl · Settings" };

export default async function VoetbalSettingsPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st } = await loadSettings(slug, "voetbal");
  const { club } = data;
  const vnl = club.voetbal;
  return (
    <Page accent={club.accent}>
      <SettingsHero base={st.base} active="voetbal" />
      <div className="hx-wrap hx-body hx-form-page">
        <section className="card section">
          <h2>voetbal.nl</h2>
          <p className="small muted">
            Connect your team to pull fixtures, results, line-ups and the league table from voetbal.nl. It syncs by itself every day. Scorers, assists and cards
            aren&apos;t on voetbal.nl, so you still add those to each match.
          </p>
          {vnl && (
            <dl className="sync-status">
              {vnl.teamName && (
                <div>
                  <dt>Team</dt>
                  <dd>
                    {vnl.teamName}
                    {vnl.league && <span className="muted"> · {vnl.league}</span>}
                  </dd>
                </div>
              )}
              <div>
                <dt>Last synced</dt>
                <dd>
                  {vnl.syncedAt
                    ? new Date(vnl.syncedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" })
                    : "Not yet"}
                </dd>
              </div>
            </dl>
          )}
          {vnl?.error && <p className="notice notice-error">Last sync failed: {vnl.error}</p>}
          {!voetbalConfigured() && (
            <p className="notice notice-error">
              The voetbal.nl login isn&apos;t set up on this server yet. Add VOETBALNL_EMAIL and VOETBALNL_PASSWORD to its environment variables.
            </p>
          )}
          <VoetbalForm save={saveVoetbalLink.bind(null, slug)} sync={syncVoetbal.bind(null, slug)} teamId={vnl?.teamId ?? null} configured={voetbalConfigured()} />
        </section>
      </div>
    </Page>
  );
}
