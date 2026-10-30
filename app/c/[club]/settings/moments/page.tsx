import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { ConfirmSubmit, MomentForm } from "@/components/forms";
import { Page } from "@/components/home/Page";
import { deleteMoment, saveMoment } from "@/lib/actions";
import { formatDate } from "@/lib/stats";
import { loadSettings, SettingsHero } from "../shared";

export const metadata: Metadata = { title: "Moments · Settings" };

export default async function MomentsSettingsPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st } = await loadSettings(slug, "moments");
  const { club, players, moments } = data;
  const matchOptions = [...data.matches].reverse().map((m) => ({ id: m.id, label: `${formatDate(m.date)} vs ${m.opponent}` }));
  return (
    <Page accent={club.accent}>
      <SettingsHero base={st.base} active="moments" />
      <div className="hx-wrap hx-body hx-form-page">
        <section className="card section">
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
                      <ConfirmSubmit className="btn-link danger" message={`Delete "${m.title}"?`}>
                        Delete
                      </ConfirmSubmit>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  );
}
