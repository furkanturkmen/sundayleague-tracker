import "server-only";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { hasSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyse, type Stats } from "@/lib/stats";
import { sameName } from "@/lib/voetbal-parse";
import type { Card, Club, ClubData, Goal, Match, MatchStatus, Moment, Player, Position, Ranking, Standing, Venue } from "@/lib/types";

interface ClubRow {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  tagline: string;
  accent: string;
  gold: string;
  founded: number | null;
  has_logo: boolean;
  logo_version: number;
  voetbal_team_id: string | null;
  voetbal_team_name: string | null;
  voetbal_league: string | null;
  voetbal_synced_at: Date | null;
  voetbal_error: string | null;
  coach_name: string | null;
  has_coach_photo: boolean;
  coach_photo_version: number;
  password_hash: string;
  coach_password_hash: string | null;
  private: boolean;
  squad_password_hash: string | null;
}

const logoUrl = (slug: string, hasLogo: boolean, version: number) => (hasLogo ? `/c/${slug}/logo?v=${version}` : null);
/** Player photos by id, and the coach's as "coach". */
const photoUrl = (slug: string, who: string, has: boolean, version: number) => (has ? `/c/${slug}/photos/${who}?v=${version}` : null);

function toClub(r: ClubRow): Club {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortName: r.short_name,
    tagline: r.tagline,
    accent: r.accent,
    gold: r.gold,
    founded: r.founded,
    logo: logoUrl(r.slug, r.has_logo, r.logo_version),
    voetbal: r.voetbal_team_id
      ? {
          teamId: r.voetbal_team_id,
          teamName: r.voetbal_team_name,
          league: r.voetbal_league,
          syncedAt: r.voetbal_synced_at?.toISOString() ?? null,
          error: r.voetbal_error,
        }
      : null,
    coach: { name: r.coach_name, photo: photoUrl(r.slug, "coach", r.has_coach_photo, r.coach_photo_version) },
    private: r.private,
  };
}

// The logo itself stays out of page loads; /c/<club>/logo serves it.
const clubRow = cache(async (slug: string): Promise<ClubRow | undefined> => {
  await connection();
  const sql = await db();
  const [row] = await sql<ClubRow[]>`
    select id, slug, name, short_name, tagline, accent, gold, founded, logo is not null as has_logo, logo_version,
      voetbal_team_id, voetbal_team_name, voetbal_league, voetbal_synced_at, voetbal_error,
      coach_name, coach_photo is not null as has_coach_photo, coach_photo_version, password_hash, coach_password_hash,
      private, squad_password_hash
    from clubs where slug = ${slug}`;
  return row;
});

export const decodeDataUrl = (url: string | null | undefined): { type: string; body: Buffer } | undefined => {
  const m = url?.match(/^data:(image\/(?:png|webp|jpeg));base64,(.+)$/);
  return m ? { type: m[1], body: Buffer.from(m[2], "base64") } : undefined;
};

/** The stored crest image, decoded for the logo route. */
export async function getClubLogo(slug: string): Promise<{ type: string; body: Buffer } | undefined> {
  const sql = await db();
  const [row] = await sql<{ logo: string | null }[]>`select logo from clubs where slug = ${slug}`;
  return decodeDataUrl(row?.logo);
}

/** A player's photo, or the coach's for "coach", decoded for the photos route. */
export async function getPhoto(slug: string, who: string): Promise<{ type: string; body: Buffer } | undefined> {
  const sql = await db();
  if (who === "coach") {
    const [row] = await sql<{ photo: string | null }[]>`select coach_photo as photo from clubs where slug = ${slug}`;
    return decodeDataUrl(row?.photo);
  }
  if (!/^[0-9a-f-]{36}$/i.test(who)) return undefined;
  const [row] = await sql<{ photo: string | null }[]>`
    select p.photo from players p join clubs c on c.id = p.club_id where c.slug = ${slug} and p.id = ${who}`;
  return decodeDataUrl(row?.photo);
}

/** The images themselves (data URLs), for drawing graphics on the server. */
export async function getGraphicImages(slug: string): Promise<{ logo: string | null; coach: string | null; players: Map<string, string> }> {
  const sql = await db();
  const [club] = await sql<{ id: string; logo: string | null; coach_photo: string | null }[]>`select id, logo, coach_photo from clubs where slug = ${slug}`;
  if (!club) return { logo: null, coach: null, players: new Map() };
  const rows = await sql<{ id: string; photo: string }[]>`select id, photo from players where club_id = ${club.id} and photo is not null`;
  return { logo: club.logo, coach: club.coach_photo, players: new Map(rows.map((r) => [r.id, r.photo])) };
}

export async function getClubAuth(
  slug: string,
): Promise<{ club: Club; passwordHash: string; coachPasswordHash: string | null; squadPasswordHash: string | null } | undefined> {
  const row = await clubRow(slug);
  return (
    row && { club: toClub(row), passwordHash: row.password_hash, coachPasswordHash: row.coach_password_hash, squadPasswordHash: row.squad_password_hash }
  );
}

/** Whether the current visitor is signed in as an admin of this club. */
export const isAdmin = cache(async (slug: string): Promise<boolean> => {
  const row = await clubRow(slug);
  return row ? hasSession(row.id, row.password_hash) : false;
});

/** Whether the current visitor is signed in with the coach password. Removing that password signs the coach out. */
export const isCoach = cache(async (slug: string): Promise<boolean> => {
  const row = await clubRow(slug);
  return row?.coach_password_hash ? hasSession(row.id, row.coach_password_hash, "coach") : false;
});

/** Whether this club has a coach password set, for Settings. */
export async function hasCoachLogin(slug: string): Promise<boolean> {
  return Boolean((await clubRow(slug))?.coach_password_hash);
}

/** Whether the current visitor is signed in with the squad password, which only opens a private club. */
export const isSquad = cache(async (slug: string): Promise<boolean> => {
  const row = await clubRow(slug);
  return row?.squad_password_hash ? hasSession(row.id, row.squad_password_hash, "squad") : false;
});

/** Whether this club has a squad password set, for Settings. */
export async function hasSquadLogin(slug: string): Promise<boolean> {
  return Boolean((await clubRow(slug))?.squad_password_hash);
}

/** For the image routes: whether the current visitor may see this club, and whether it's private. */
export async function viewAccess(slug: string): Promise<{ ok: boolean; private: boolean }> {
  const row = await clubRow(slug);
  if (!row) return { ok: false, private: false };
  if (!row.private) return { ok: true, private: false };
  const [admin, coach, squad] = await Promise.all([isAdmin(slug), isCoach(slug), isSquad(slug)]);
  return { ok: admin || coach || squad, private: true };
}

const isoDate = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));

export const loadClubData = cache(async (slug: string): Promise<ClubData | undefined> => {
  const row = await clubRow(slug);
  if (!row) return undefined;
  const sql = await db();
  const id = row.id;

  const [playerRows, matchRows, squadRows, goalRows, eventRows, momentRows, standingRows, rankingRows] = await Promise.all([
    sql<{ id: string; name: string; number: number | null; position: Position; nickname: string | null; bio: string | null; active: boolean; display_name: string | null; extra_positions: Position[]; has_photo: boolean; photo_version: number }[]>`
      select id, name, number, position, nickname, bio, active, display_name, extra_positions, photo is not null as has_photo, photo_version
      from players where club_id = ${id} order by number nulls last, name`,
    sql<{
      id: string;
      date: Date;
      opponent: string;
      venue: Venue;
      competition: string;
      goals_for: number | null;
      goals_against: number | null;
      kickoff: string | null;
      external_id: string | null;
      opponent_code: string | null;
      status: MatchStatus | null;
      lineup: string[] | null;
      lineup_hidden: number;
      formation: string | null;
      starters: (string | null)[] | null;
      bench: string[] | null;
      motm: string | null;
      motm_name: string | null;
      captain: string | null;
      notes: string | null;
    }[]>`
      select id, date, opponent, venue, competition, goals_for, goals_against, kickoff, external_id, opponent_code, status, lineup, lineup_hidden,
        formation, starters, bench, motm, motm_name, captain, notes
      from matches where club_id = ${id} order by date, created_at`,
    sql<{ match_id: string; player_id: string }[]>`
      select mp.match_id, mp.player_id from match_players mp join matches m on m.id = mp.match_id where m.club_id = ${id}`,
    sql<{ match_id: string; scorer_id: string | null; assist_id: string | null; minute: number | null; penalty: boolean }[]>`
      select g.match_id, g.scorer_id, g.assist_id, g.minute, g.penalty from goals g join matches m on m.id = g.match_id
      where m.club_id = ${id} order by g.minute nulls last, g.ord`,
    sql<{ match_id: string; player_id: string; kind: "Y" | "R" | "OG" | "PM" }[]>`
      select e.match_id, e.player_id, e.kind from match_events e join matches m on m.id = e.match_id where m.club_id = ${id} order by e.ord`,
    sql<{ id: string; kind: "fame" | "shame"; title: string; story: string; player_id: string | null; match_id: string | null }[]>`
      select id, kind, title, story, player_id, match_id from moments where club_id = ${id} order by created_at`,
    sql<{ competition: "league" | "cup"; position: number; team: string; club_code: string | null; played: number; won: number; drawn: number; lost: number; points: number; goals_for: number; goals_against: number; penalty_points: number; is_us: boolean }[]>`
      select * from standings where club_id = ${id} order by competition, position`,
    sql<{ id: string; title: string; accent_text: string; players: string[]; updated_at: Date }[]>`
      select id, title, accent_text, players, updated_at from rankings where club_id = ${id} order by updated_at desc`,
  ]);

  const byMatch = <T extends { match_id: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const r of rows) map.set(r.match_id, [...(map.get(r.match_id) ?? []), r]);
    return map;
  };
  const squads = byMatch(squadRows);
  const goals = byMatch(goalRows);
  const events = byMatch(eventRows);

  const players: Player[] = playerRows.map(({ display_name, extra_positions, has_photo, photo_version, ...p }) => ({
    ...p,
    displayName: display_name,
    extraPositions: extra_positions ?? [],
    photo: photoUrl(row.slug, p.id, has_photo, photo_version),
  }));
  const playerNamed = (name: string | null) => (name ? players.find((p) => sameName(p.name, name))?.id : undefined);
  const matches: Match[] = matchRows.map((m) => {
    const ev = events.get(m.id) ?? [];
    return {
      id: m.id,
      date: isoDate(m.date),
      opponent: m.opponent,
      venue: m.venue,
      competition: m.competition,
      against: m.goals_against,
      goalsFor: m.goals_for ?? undefined,
      kickoff: m.kickoff ?? undefined,
      externalId: m.external_id ?? undefined,
      opponentCode: m.opponent_code ?? undefined,
      status: m.status ?? undefined,
      lineup: m.lineup ?? undefined,
      lineupHidden: m.lineup_hidden,
      formation: m.formation ?? undefined,
      starters: m.starters ?? undefined,
      bench: m.bench ?? undefined,
      squad: (squads.get(m.id) ?? []).map((s) => s.player_id),
      goals: (goals.get(m.id) ?? []).map(
        (g): Goal => ({ scorer: g.scorer_id ?? "og", assist: g.assist_id ?? undefined, minute: g.minute ?? undefined, penalty: g.penalty || undefined }),
      ),
      cards: ev.filter((e) => e.kind === "Y" || e.kind === "R").map((e): Card => ({ player: e.player_id, type: e.kind as Card["type"] })),
      ownGoals: ev.filter((e) => e.kind === "OG").map((e) => e.player_id),
      penaltiesMissed: ev.filter((e) => e.kind === "PM").map((e) => e.player_id),
      // A man of the match picked by hand wins over the voetbal.nl vote.
      motm: m.motm ?? playerNamed(m.motm_name),
      captain: playerNamed(m.captain),
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

  const standings: Standing[] = standingRows.map((r) => ({
    competition: r.competition,
    position: r.position,
    team: r.team,
    clubCode: r.club_code,
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    points: r.points,
    goalsFor: r.goals_for,
    goalsAgainst: r.goals_against,
    penaltyPoints: r.penalty_points,
    isUs: r.is_us,
  }));

  // Players deleted since drop out of the lists.
  const known = new Set(players.map((p) => p.id));
  const rankings: Ranking[] = rankingRows.map((r) => ({
    id: r.id,
    title: r.title,
    accentText: r.accent_text,
    players: r.players.filter((p) => known.has(p)),
    updatedAt: r.updated_at.toISOString(),
  }));

  return { club: toClub(row), players, matches, moments, standings, rankings };
});

/** Everything a club page needs. 404s when the club doesn't exist. */
type ClubContext = { data: ClubData; st: Stats; admin: boolean; coach: boolean; squad: boolean; canView: boolean };

/**
 * The club and who's looking, without the private-club gate: only for the layout and the sign-in page, which must
 * show something to a visitor who isn't let in yet.
 */
export const loadClubOpen = cache(async (slug: string): Promise<ClubContext> => {
  const data = await loadClubData(slug);
  if (!data) notFound();
  const [admin, coach, squad] = await Promise.all([isAdmin(slug), isCoach(slug), isSquad(slug)]);
  return { data, st: analyse(data), admin, coach, squad, canView: !data.club.private || admin || coach || squad };
});

/** The club for a page. A private club sends visitors without one of its passwords to sign in. */
export const loadClub = cache(async (slug: string): Promise<ClubContext> => {
  const ctx = await loadClubOpen(slug);
  if (!ctx.canView) redirect(`/c/${slug}/login`);
  return ctx;
});
