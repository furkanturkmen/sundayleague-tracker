import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageHero, SeasonLinks } from "@/components/home/Page";
import { SquadBoard, type SquadRow } from "@/components/home/SquadBoard";
import { GetStarted } from "@/components/ui";
import { loadClub } from "@/lib/club";
import { seasonLabel } from "@/lib/stats";
import { POSITION_LINES, POSITION_NAMES, POSITIONS, positionGroup } from "@/lib/types";

export const metadata: Metadata = { title: "Players" };

type Props = { params: Promise<{ club: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

// The squad on the same cold night as the home screen: a short stadium hero, then every player as a shirt by line,
// or the numbers in one sortable table.

export default async function PlayersPage({ params, searchParams }: Props) {
  const { data, st, admin } = await loadClub((await params).club);
  const query = await searchParams;
  const season = st.resolveSeason(query.season, st.currentSeason);
  const sort = typeof query.sort === "string" ? query.sort : undefined;
  const { club } = data;

  // Back to front, then by shirt number. Players who have left only show if they played in this period.
  const rows: SquadRow[] = st
    .allStats(st.inSeason(season))
    .filter((s) => s.player.active || s.apps > 0)
    .sort(
      (a, b) =>
        POSITION_LINES.findIndex((l) => l.group === positionGroup(a.player.position)) -
          POSITION_LINES.findIndex((l) => l.group === positionGroup(b.player.position)) ||
        POSITIONS.indexOf(a.player.position) - POSITIONS.indexOf(b.player.position) ||
        (a.player.number ?? 999) - (b.player.number ?? 999),
    )
    .map((s) => ({
      id: s.player.id,
      href: `${st.base}/players/${s.player.id}`,
      name: s.player.name,
      nickname: s.player.nickname,
      number: s.player.number,
      position: s.player.position,
      positionName: POSITION_NAMES[s.player.position],
      group: positionGroup(s.player.position),
      apps: s.apps,
      goals: s.goals,
      assists: s.assists,
      motm: s.motm,
      cleanSheets: s.cleanSheets,
      winPct: s.winPct,
      yellows: s.yellows,
      reds: s.reds,
    }));

  return (
    <Page accent={club.accent}>
      <PageHero
        lead="The"
        accent="squad."
        meta={
          <>
            {rows.length} {rows.length === 1 ? "player" : "players"} · {seasonLabel(season)}
          </>
        }
      >
        <SeasonLinks href={(s) => `${st.base}/players?season=${s}`} seasons={st.seasons} active={season}>
          {admin && (
            <Link href={`${st.base}/settings#squad`} className="hx-manage">
              Manage squad
            </Link>
          )}
        </SeasonLinks>
      </PageHero>

      <div className="hx-wrap hx-body">
        {rows.length === 0 ? (
          <GetStarted st={st} admin={admin} what="players" />
        ) : (
          <SquadBoard rows={rows} kit={{ main: club.accent, trim: club.gold, logo: club.logo }} initialSort={sort} />
        )}
      </div>
    </Page>
  );
}
