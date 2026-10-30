import type { Metadata } from "next";
import { AddLineupPlayer } from "@/components/forms";
import { Page, Section } from "@/components/home/Page";
import { SquadEditor } from "@/components/SquadEditor";
import { Empty } from "@/components/ui";
import { addLineupPlayer, deletePlayer, savePlayer } from "@/lib/actions";
import { sameName } from "@/lib/voetbal-parse";
import { loadSettings, SettingsHero } from "../shared";

export const metadata: Metadata = { title: "Squad · Settings" };

type Props = { params: Promise<{ club: string }> };

export default async function SquadSettingsPage({ params }: Props) {
  const { club: slug } = await params;
  const { data, st } = await loadSettings(slug, "squad");
  const { club, players } = data;

  // Names from voetbal.nl line-ups that aren't in the squad yet, most appearances first.
  const lineupCounts = new Map<string, number>();
  for (const m of data.matches)
    for (const n of m.lineup ?? []) if (!players.some((p) => sameName(p.name, n))) lineupCounts.set(n, (lineupCounts.get(n) ?? 0) + 1);
  const suggestions = [...lineupCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return (
    <Page accent={club.accent}>
      <SettingsHero base={st.base} active="squad" />
      <div className="hx-wrap hx-body hx-form-page">
        <div>
          <SquadEditor players={players} save={savePlayer.bind(null, slug)} remove={deletePlayer.bind(null, slug)} />
          {players.length === 0 && <Empty>No players yet. Add the first one above.</Empty>}
        </div>
        {suggestions.length > 0 && (
          <Section id="se-suggest" lead="Seen on" accent="voetbal.nl." note="In line-ups there, not in your squad yet. Players with a private profile aren't listed." small>
            <ul className="squad-list">
              {suggestions.map(([name, count]) => (
                <AddLineupPlayer key={name} action={addLineupPlayer.bind(null, slug)} name={name} matches={count} />
              ))}
            </ul>
          </Section>
        )}
      </div>
    </Page>
  );
}
