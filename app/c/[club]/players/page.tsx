import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Reveal, ScrollFlag } from "@/components/home/Motion";
import { SquadBoard, type SquadRow } from "@/components/home/SquadBoard";
import { GetStarted } from "@/components/ui";
import { loadClub } from "@/lib/club";
import { brighten } from "@/lib/color";
import { seasonLabel } from "@/lib/stats";
import { POSITION_LINES, POSITION_NAMES, POSITIONS, positionGroup } from "@/lib/types";
import stadium from "@/public/images/stadium-floodlights.jpg";

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
        POSITION_LINES.findIndex((l) => l.group === positionGroup(a.player.position)) - POSITION_LINES.findIndex((l) => l.group === positionGroup(b.player.position)) ||
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
  const seasons = ["all", ...[...st.seasons].reverse()];

  return (
    <div className="hx" style={{ "--hx-bright": brighten(club.accent) } as CSSProperties}>
      <ScrollFlag />
      <section className="hx-hero hx-hero-short" aria-labelledby="sq-title">
        <div className="hx-hero-photo" aria-hidden="true">
          <Image src={stadium} alt="" fill sizes="100vw" placeholder="blur" priority className="hx-photo" />
        </div>
        <div className="hx-hero-inner">
          <Reveal>
            <h1 id="sq-title" className="hx-headline">
              The <em>squad.</em>
            </h1>
          </Reveal>
          <Reveal className="sq-meta" delay={0.1}>
            <p>
              {rows.length} {rows.length === 1 ? "player" : "players"} · {seasonLabel(season)}
            </p>
            <nav className="sq-seasons" aria-label="Season">
              {seasons.length > 1 &&
                seasons.map((s) => (
                  <Link key={s} href={`${st.base}/players?season=${s}`} className={s === season ? "on" : undefined} aria-current={s === season ? "true" : undefined}>
                    {seasonLabel(s)}
                  </Link>
                ))}
              {admin && (
                <Link href={`${st.base}/settings#squad`} className="sq-manage">
                  Manage squad
                </Link>
              )}
            </nav>
          </Reveal>
        </div>
      </section>

      <div className="hx-wrap sq-body">
        {rows.length === 0 ? (
          <GetStarted st={st} admin={admin} what="players" />
        ) : (
          <SquadBoard rows={rows} kit={{ main: club.accent, trim: club.gold, logo: club.logo }} initialSort={sort} />
        )}
      </div>
    </div>
  );
}
