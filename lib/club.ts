import "server-only";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { hasSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyse, type Stats } from "@/lib/stats";
import type { Card, Club, ClubData, Goal, Match, Moment, Player, Position, Venue } from "@/lib/types";

interface ClubRow {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  tagline: string;
  accent: string;
  gold: string;
  founded: number | null;
  password_hash: string;
}

function toClub(r: ClubRow): Club {
  return { id: r.id, slug: r.slug, name: r.name, shortName: r.short_name, tagline: r.tagline, accent: r.accent, gold: r.gold, founded: r.founded };
}

export interface ClubSummary {
  slug: string;
  name: string;
  shortName: string;
  accent: string;
  gold: string;
  players: number;
  matches: number;
}

export async function listClubs(): Promise<ClubSummary[]> {
  await connection();
  const sql = await db();
  const rows = await sql<{ slug: string; name: string; short_name: string; accent: string; gold: string; players: number; matches: number }[]>`
    select c.slug, c.name, c.short_name, c.accent, c.gold,
      (select count(*)::int from players p where p.club_id = c.id) as players,
      (select count(*)::int from matches m where m.club_id = c.id and m.goals_against is not null) as matches
    from clubs c
    order by lower(c.name)
  `;
  return rows.map((r) => ({ slug: r.slug, name: r.name, shortName: r.short_name, accent: r.accent, gold: r.gold, players: r.players, matches: r.matches }));
}

const clubRow = cache(async (slug: string): Promise<ClubRow | undefined> => {
  await connection();
  const sql = await db();
  const [row] = await sql<ClubRow[]>`select * from clubs where slug = ${slug}`;
  return row;
});

export async function getClubAuth(slug: string): Promise<{ club: Club; passwordHash: string } | undefined> {
  const row = await clubRow(slug);
  return row && { club: toClub(row), passwordHash: row.password_hash };
}

/** Whether the current visitor is signed in as an admin of this club. */
export const isAdmin = cache(async (slug: string): Promise<boolean> => {
  const row = await clubRow(slug);
  return row ? hasSession(row.id, row.password_hash) : false;
});

const isoDate = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));

export const loadClubData = cache(async (slug: string): Promise<ClubData | undefined> => {
  const row = await clubRow(slug);
  if (!row) return undefined;
  const sql = await db();
  const id = row.id;

  const [playerRows, matchRows, squadRows, goalRows, eventRows, momentRows] = await Promise.all([
    sql<{ id: string; name: string; number: number | null; position: Position; nickname: string | null; bio: string | null; active: boolean }[]>`
      select id, name, number, position, nickname, bio, active from players where club_id = ${id} order by number nulls last, name`,
    sql<{ id: string; date: Date; opponent: string; venue: Venue; competition: string; goals_against: number | null; motm: string | null; notes: string | null }[]>`
      select id, date, opponent, venue, competition, goals_against, motm, notes from matches where club_id = ${id} order by date, created_at`,
    sql<{ match_id: string; player_id: string }[]>`
      select mp.match_id, mp.player_id from match_players mp join matches m on m.id = mp.match_id where m.club_id = ${id}`,
    sql<{ match_id: string; scorer_id: string | null; assist_id: string | null; minute: number | null; penalty: boolean }[]>`
      select g.match_id, g.scorer_id, g.assist_id, g.minute, g.penalty from goals g join matches m on m.id = g.match_id
      where m.club_id = ${id} order by g.minute nulls last, g.ord`,
    sql<{ match_id: string; player_id: string; kind: "Y" | "R" | "OG" | "PM" }[]>`
      select e.match_id, e.player_id, e.kind from match_events e join matches m on m.id = e.match_id where m.club_id = ${id} order by e.ord`,
    sql<{ id: string; kind: "fame" | "shame"; title: string; story: string; player_id: string | null; match_id: string | null }[]>`
      select id, kind, title, story, player_id, match_id from moments where club_id = ${id} order by created_at`,
  ]);

  const byMatch = <T extends { match_id: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const r of rows) map.set(r.match_id, [...(map.get(r.match_id) ?? []), r]);
    return map;
  };
  const squads = byMatch(squadRows);
  const goals = byMatch(goalRows);
  const events = byMatch(eventRows);

  const players: Player[] = playerRows.map((p) => ({ ...p }));
  const matches: Match[] = matchRows.map((m) => {
    const ev = events.get(m.id) ?? [];
    return {
      id: m.id,
      date: isoDate(m.date),
      opponent: m.opponent,
      venue: m.venue,
      competition: m.competition,
      against: m.goals_against,
      squad: (squads.get(m.id) ?? []).map((s) => s.player_id),
      goals: (goals.get(m.id) ?? []).map(
        (g): Goal => ({ scorer: g.scorer_id ?? "og", assist: g.assist_id ?? undefined, minute: g.minute ?? undefined, penalty: g.penalty || undefined }),
      ),
      cards: ev.filter((e) => e.kind === "Y" || e.kind === "R").map((e): Card => ({ player: e.player_id, type: e.kind as Card["type"] })),
      ownGoals: ev.filter((e) => e.kind === "OG").map((e) => e.player_id),
      penaltiesMissed: ev.filter((e) => e.kind === "PM").map((e) => e.player_id),
      motm: m.motm ?? undefined,
      notes: m.notes ?? undefined,
    };
  });
  const moments: Moment[] = momentRows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    story: r.story,
    player: r.player_id ?? undefined,
    matchId: r.match_id ?? undefined,
  }));

  return { club: toClub(row), players, matches, moments };
});

/** Everything a club page needs. 404s when the club doesn't exist. */
export const loadClub = cache(async (slug: string): Promise<{ data: ClubData; st: Stats; admin: boolean }> => {
  const data = await loadClubData(slug);
  if (!data) notFound();
  return { data, st: analyse(data), admin: await isAdmin(slug) };
});
