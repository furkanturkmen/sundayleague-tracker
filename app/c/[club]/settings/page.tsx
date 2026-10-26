import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { AddLineupPlayer, AddPlayerForm, ClubForm, CoachPasswordForm, ConfirmSubmit, DeleteClubForm, EditPlayerRow, MomentForm, PasswordForm, VoetbalForm } from "@/components/forms";
import { Empty, PageHeader } from "@/components/ui";
import {
  addLineupPlayer,
  changePassword,
  deleteClub,
  deleteMoment,
  deletePlayer,
  saveMoment,
  savePlayer,
  saveVoetbalLink,
  setCoachPassword,
  syncVoetbal,
  updateClub,
} from "@/lib/actions";
import { hasCoachLogin, loadClub } from "@/lib/club";
import { formatDate } from "@/lib/stats";
import { voetbalConfigured } from "@/lib/voetbal";
import { sameName } from "@/lib/voetbal-parse";

export const metadata: Metadata = { title: "Settings" };

type Props = { params: Promise<{ club: string }>; searchParams: Promise<{ welcome?: string }> };

export default async function SettingsPage({ params, searchParams }: Props) {
  const { club: slug } = await params;
  const { welcome } = await searchParams;
  const { data, st, admin } = await loadClub(slug);
  if (!admin) redirect(`${st.base}/login?next=${encodeURIComponent(`${st.base}/settings`)}`);

  const { club, players, moments } = data;
  const matchOptions = [...data.matches].reverse().map((m) => ({ id: m.id, label: `${formatDate(m.date)} vs ${m.opponent}` }));

  // Names from voetbal.nl line-ups that aren't in the squad yet, most appearances first.
  const lineupCounts = new Map<string, number>();
  for (const m of data.matches) for (const n of m.lineup ?? []) if (!players.some((p) => sameName(p.name, n))) lineupCounts.set(n, (lineupCounts.get(n) ?? 0) + 1);
  const suggestions = [...lineupCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const vnl = club.voetbal;

  return (
    <div className="narrow-wide">
      <PageHeader title="Settings" kicker={club.name} />

      {welcome && (
        <div className="card welcome">
          <h2>Your club is live</h2>
          <p>
            Next: add the squad below, then <Link href={`${st.base}/matches/new`}>log your first match</Link>. Anyone with the link can view the club at{" "}
            <Link href={st.base}>{st.base}</Link>. Only people with the admin password can edit it.
          </p>
        </div>
      )}

      <nav className="tabs settings-nav" aria-label="Settings sections">
        <a href="#squad">Squad</a>
        <a href="#voetbal">voetbal.nl</a>
        <a href="#moments">Fame & Shame</a>
        <a href="#club">Club details</a>
        <a href="#password">Passwords</a>
      </nav>

      <section id="squad" className="card section">
        <h2>
          Squad <span className="small muted">{players.filter((p) => p.active).length} active</span>
        </h2>
        <AddPlayerForm action={savePlayer.bind(null, slug)} />
        {players.length > 0 ? (
          <ul className="squad-list">
            {players.map((p) => (
              <EditPlayerRow key={p.id} player={p} squad={data.players} save={savePlayer.bind(null, slug)} remove={deletePlayer.bind(null, slug)} />
            ))}
          </ul>
        ) : (
          <Empty>No players yet. Add the first one above.</Empty>
        )}
      </section>

      <section id="voetbal" className="card section">
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
              <dd>{vnl.syncedAt ? new Date(vnl.syncedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" }) : "Not yet"}</dd>
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
        {suggestions.length > 0 && (
          <>
            <h3 className="section-sub">In voetbal.nl line-ups, not in your squad</h3>
            <p className="small muted">Add who should show up in the stats. Players who keep their voetbal.nl profile private aren&apos;t listed.</p>
            <ul className="squad-list">
              {suggestions.map(([name, count]) => (
                <AddLineupPlayer key={name} action={addLineupPlayer.bind(null, slug)} name={name} matches={count} />
              ))}
            </ul>
          </>
        )}
      </section>

      <section id="moments" className="card section">
        <h2>Fame & Shame moments</h2>
        <p className="small muted">The stories behind the stats. Awards like Golden Boot and Card Collector are worked out automatically from the results.</p>
        <MomentForm action={saveMoment.bind(null, slug)} players={players} matches={matchOptions} />
        {moments.length > 0 && (
          <ul className="squad-list">
            {moments.map((m) => (
              <li key={m.id} className="squad-row">
                <div className="squad-row-head">
                  <Icon name={m.kind === "fame" ? "trophy" : "thumbs-down"} className={m.kind === "fame" ? "fame-ink" : "shame-ink"} />
                  <strong>{m.title}</strong>
                  {m.player && <span className="muted small">{st.playerName(m.player)}</span>}
                  <form action={deleteMoment.bind(null, slug)} style={{ marginLeft: "auto" }}>
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmSubmit className="btn-link danger" message={`Delete "${m.title}"?`}>Delete</ConfirmSubmit>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="club" className="card section">
        <h2>Club details</h2>
        <ClubForm action={updateClub.bind(null, slug)} club={club} />
      </section>

      <section id="password" className="card section">
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
  );
}
