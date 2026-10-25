import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { AddPlayerForm, ClubForm, ConfirmSubmit, DeleteClubForm, EditPlayerRow, MomentForm, PasswordForm } from "@/components/forms";
import { Empty, PageHeader } from "@/components/ui";
import { changePassword, deleteClub, deleteMoment, deletePlayer, saveMoment, savePlayer, updateClub } from "@/lib/actions";
import { loadClub } from "@/lib/club";
import { formatDate } from "@/lib/stats";

export const metadata: Metadata = { title: "Settings" };

type Props = { params: Promise<{ club: string }>; searchParams: Promise<{ welcome?: string }> };

export default async function SettingsPage({ params, searchParams }: Props) {
  const { club: slug } = await params;
  const { welcome } = await searchParams;
  const { data, st, admin } = await loadClub(slug);
  if (!admin) redirect(`${st.base}/login?next=${encodeURIComponent(`${st.base}/settings`)}`);

  const { club, players, moments } = data;
  const matchOptions = [...data.matches].reverse().map((m) => ({ id: m.id, label: `${formatDate(m.date)} vs ${m.opponent}` }));

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
        <a href="#moments">Fame & Shame</a>
        <a href="#club">Club details</a>
        <a href="#password">Password</a>
      </nav>

      <section id="squad" className="card section">
        <h2>
          Squad <span className="small muted">{players.filter((p) => p.active).length} active</span>
        </h2>
        <AddPlayerForm action={savePlayer.bind(null, slug)} />
        {players.length > 0 ? (
          <ul className="squad-list">
            {players.map((p) => (
              <EditPlayerRow key={p.id} player={p} save={savePlayer.bind(null, slug)} remove={deletePlayer.bind(null, slug)} />
            ))}
          </ul>
        ) : (
          <Empty>No players yet. Add the first one above.</Empty>
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

      <section className="card section danger-zone">
        <h2>Danger zone</h2>
        <DeleteClubForm action={deleteClub.bind(null, slug)} name={club.name} />
      </section>
    </div>
  );
}
