"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, hashPassword, hasSession, startSession, verifyPassword } from "@/lib/auth";
import { getClubAuth } from "@/lib/club";
import { db } from "@/lib/db";
import { FORMATIONS, formationSlots, MAX_BENCH } from "@/lib/lineup";
import { POSITIONS, type Position } from "@/lib/types";
import { linkLineup, previewTeam, syncClub, voetbalConfigured, type TeamPreview } from "@/lib/voetbal";
import { parseTeamId, sameName } from "@/lib/voetbal-parse";

export interface FormState {
  error?: string;
  ok?: string;
}

const RESERVED = new Set(["new", "api", "admin", "settings", "login", "c", "start", "logos"]);
const HEX = /^#[0-9a-f]{6}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (f: FormData, key: string, max = 200) => String(f.get(key) ?? "").trim().slice(0, max);

function optInt(v: unknown, min: number, max: number): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

async function requireAdmin(slug: string) {
  const auth = await getClubAuth(slug);
  if (!auth || !(await hasSession(auth.club.id, auth.passwordHash))) throw new Error("You need to sign in as a club admin to do that.");
  return auth.club;
}

/** Line-ups: the coach, or an admin. */
async function requireLineupAccess(slug: string) {
  const auth = await getClubAuth(slug);
  const ok =
    auth &&
    ((await hasSession(auth.club.id, auth.passwordHash)) ||
      (auth.coachPasswordHash !== null && (await hasSession(auth.club.id, auth.coachPasswordHash, "coach"))));
  if (!ok) throw new Error("You need to sign in as the coach or a club admin to do that.");
  return auth.club;
}

function refresh(slug: string) {
  revalidatePath(`/c/${slug}`, "layout");
  revalidatePath("/");
}

function clubFields(f: FormData): { error: string } | { name: string; shortName: string; tagline: string; accent: string; gold: string; founded: number | null } {
  const name = text(f, "name", 60);
  const shortName = text(f, "shortName", 5).toUpperCase();
  const accent = text(f, "accent", 7);
  const gold = text(f, "gold", 7);
  if (name.length < 2) return { error: "Give the club a name." };
  if (!shortName) return { error: "Add a short name (up to 5 letters) for the badge." };
  if (!HEX.test(accent) || !HEX.test(gold)) return { error: "Pick both club colours." };
  return { name, shortName, tagline: text(f, "tagline", 120), accent, gold, founded: optInt(f.get("founded"), 1850, 2100) };
}

const LOGO = /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/]+=*$/;
const LOGO_MAX = 400_000;

/** The form sends a shrunk data URL for a new logo, "remove" to clear it, or nothing to keep it. */
function logoField(f: FormData): { error: string } | { logo: string | null | undefined } {
  const v = String(f.get("logo") ?? "");
  if (!v) return { logo: undefined };
  if (v === "remove") return { logo: null };
  if (v.length > LOGO_MAX || !LOGO.test(v)) return { error: "That logo couldn't be used. Try a PNG, JPG or SVG under 5 MB." };
  return { logo: v };
}

// Photos are drawn into the graphics, which can't read WebP, so the browser always sends a PNG or JPEG.
const PHOTO = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/;
const PHOTO_MAX = 900_000;

/** Same contract as logoField: a data URL, "remove", or nothing to keep the current one. */
function photoField(f: FormData, key: string): { error: string } | { photo: string | null | undefined } {
  const v = String(f.get(key) ?? "");
  if (!v) return { photo: undefined };
  if (v === "remove") return { photo: null };
  if (v.length > PHOTO_MAX || !PHOTO.test(v)) return { error: "That photo couldn't be used. Try a PNG or JPG." };
  return { photo: v };
}

// ---------- clubs ----------

export async function createClub(_: FormState, f: FormData): Promise<FormState> {
  const fields = clubFields(f);
  if ("error" in fields) return fields;
  const logo = logoField(f);
  if ("error" in logo) return logo;
  const slug = text(f, "slug", 40).toLowerCase();
  const password = String(f.get("password") ?? "");
  const slugError = checkSlug(slug);
  if (slugError) return { error: slugError };
  if (password.length < 6) return { error: "The admin password needs at least 6 characters." };
  if (password !== f.get("confirm")) return { error: "The passwords don't match." };
  const teamId = parseTeamId(text(f, "voetbalTeam", 40));

  const sql = await db();
  const hash = await hashPassword(password);
  const [row] = await sql<{ id: string }[]>`
    insert into clubs (slug, name, short_name, tagline, accent, gold, founded, logo, password_hash, voetbal_team_id)
    values (${slug}, ${fields.name}, ${fields.shortName}, ${fields.tagline}, ${fields.accent}, ${fields.gold}, ${fields.founded}, ${logo.logo ?? null}, ${hash}, ${teamId})
    on conflict (slug) do nothing
    returning id`;
  if (!row) return { error: "That web address is taken. Try another." };

  await startSession(row.id, hash);
  revalidatePath("/");
  redirect(`/start/${slug}`);
}

function checkSlug(slug: string): string | null {
  if (slug.length < 2 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return "Use at least 2 characters: lowercase letters, numbers and dashes.";
  if (RESERVED.has(slug)) return "That web address is taken. Try another.";
  return null;
}

/** For the sign-up form, as you type: null when the address is free, otherwise why not. */
export async function slugProblem(slug: string): Promise<string | null> {
  const problem = checkSlug(slug);
  if (problem) return problem;
  const sql = await db();
  const [taken] = await sql`select 1 from clubs where slug = ${slug}`;
  return taken ? "That web address is taken. Try another." : null;
}

// Anyone can call this before they have a club, and each call reads voetbal.nl with the site's account,
// so lookups are spaced out across the whole server.
let lastLookup = 0;

/** Sign-up step one: the team behind a voetbal.nl link, so the club can confirm it before anything is saved. */
export async function findVoetbalTeam(link: string): Promise<{ error: string } | { team: TeamPreview }> {
  const teamId = parseTeamId(link.slice(0, 300));
  if (!teamId) return { error: "That isn't a voetbal.nl team link. It should contain something like T1628317720." };
  if (!voetbalConfigured()) return { error: "This site can't read voetbal.nl right now. Skip this step and fill in the club yourself." };
  const wait = lastLookup + 3000 - Date.now();
  lastLookup = Math.max(Date.now(), lastLookup + 3000);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  try {
    return { team: await previewTeam(teamId) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't reach voetbal.nl. Try again in a minute." };
  }
}

export async function updateClub(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const club = await requireAdmin(slug);
  const fields = clubFields(f);
  if ("error" in fields) return fields;
  const logo = logoField(f);
  if ("error" in logo) return logo;
  const coachPhoto = photoField(f, "coachPhoto");
  if ("error" in coachPhoto) return coachPhoto;
  const sql = await db();
  await sql`
    update clubs set name = ${fields.name}, short_name = ${fields.shortName}, tagline = ${fields.tagline},
      accent = ${fields.accent}, gold = ${fields.gold}, founded = ${fields.founded}, coach_name = ${text(f, "coach", 40) || null}
    where id = ${club.id}`;
  if (logo.logo !== undefined) await sql`update clubs set logo = ${logo.logo}, logo_version = logo_version + 1 where id = ${club.id}`;
  if (coachPhoto.photo !== undefined)
    await sql`update clubs set coach_photo = ${coachPhoto.photo}, coach_photo_version = coach_photo_version + 1 where id = ${club.id}`;
  refresh(slug);
  return { ok: "Club settings saved." };
}

export async function changePassword(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const auth = await getClubAuth(slug);
  if (!auth) return { error: "Club not found." };
  const current = String(f.get("current") ?? "");
  const next = String(f.get("password") ?? "");
  if (!(await verifyPassword(current, auth.passwordHash))) return { error: "Current password is wrong." };
  if (next.length < 6) return { error: "The new password needs at least 6 characters." };
  if (next !== f.get("confirm")) return { error: "The new passwords don't match." };
  const hash = await hashPassword(next);
  const sql = await db();
  await sql`update clubs set password_hash = ${hash} where id = ${auth.club.id}`;
  await startSession(auth.club.id, hash);
  return { ok: "Password changed. Everyone else has been signed out." };
}

/** Sets or replaces the coach password, or removes it with remove=1 (which also signs the coach out). */
export async function setCoachPassword(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const club = await requireAdmin(slug);
  const sql = await db();
  if (f.get("remove")) {
    await sql`update clubs set coach_password_hash = null where id = ${club.id}`;
    refresh(slug);
    return { ok: "Coach login removed." };
  }
  const password = String(f.get("password") ?? "");
  if (password.length < 6) return { error: "The coach password needs at least 6 characters." };
  if (password !== f.get("confirm")) return { error: "The passwords don't match." };
  const auth = await getClubAuth(slug);
  if (auth && (await verifyPassword(password, auth.passwordHash))) return { error: "Use a different password from the admin one." };
  await sql`update clubs set coach_password_hash = ${await hashPassword(password)} where id = ${club.id}`;
  refresh(slug);
  return { ok: "Coach password saved. The coach signs in with it at the bottom of any club page." };
}

export async function deleteClub(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const club = await requireAdmin(slug);
  if (text(f, "confirm", 60) !== club.name) return { error: `Type "${club.name}" exactly to confirm.` };
  const sql = await db();
  await sql`delete from clubs where id = ${club.id}`;
  await endSession(club.id);
  revalidatePath("/");
  redirect("/");
}

/** One sign-in form for both passwords: the admin one first, then the coach one. */
export async function login(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const auth = await getClubAuth(slug);
  if (!auth) return { error: "Club not found." };
  const password = String(f.get("password") ?? "");
  if (await verifyPassword(password, auth.passwordHash)) await startSession(auth.club.id, auth.passwordHash);
  else if (auth.coachPasswordHash && (await verifyPassword(password, auth.coachPasswordHash)))
    await startSession(auth.club.id, auth.coachPasswordHash, "coach");
  else return { error: "Wrong password." };
  refresh(slug);
  const next = text(f, "next", 200);
  redirect(next.startsWith(`/c/${slug}`) ? next : `/c/${slug}`);
}

export async function logout(slug: string): Promise<void> {
  const auth = await getClubAuth(slug);
  if (auth) {
    await endSession(auth.club.id);
    await endSession(auth.club.id, "coach");
  }
  refresh(slug);
  redirect(`/c/${slug}`);
}

// ---------- voetbal.nl ----------

export async function saveVoetbalLink(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const club = await requireAdmin(slug);
  const raw = text(f, "team", 300);
  const teamId = raw ? parseTeamId(raw) : null;
  if (raw && !teamId) return { error: "That isn't a voetbal.nl team link. Open your team on voetbal.nl and copy the address, it contains something like T1628317720." };
  const sql = await db();
  if (!teamId) {
    await sql`update clubs set voetbal_team_id = null, voetbal_team_name = null, voetbal_league = null, voetbal_synced_at = null, voetbal_error = null where id = ${club.id}`;
    await sql`delete from standings where club_id = ${club.id}`;
    refresh(slug);
    return { ok: "Disconnected from voetbal.nl. Matches already synced stay." };
  }
  await sql`update clubs set voetbal_team_id = ${teamId}, voetbal_error = null where id = ${club.id}`;
  if (!voetbalConfigured()) {
    refresh(slug);
    return { ok: "Team saved. Syncing needs the voetbal.nl login on the server first." };
  }
  return syncVoetbal(slug);
}

export async function syncVoetbal(slug: string): Promise<FormState> {
  const club = await requireAdmin(slug);
  try {
    const s = await syncClub(club.id);
    refresh(slug);
    const parts = [
      s.added && `${s.added} new ${s.added === 1 ? "match" : "matches"}`,
      s.updated && `${s.updated} updated`,
      s.lineups && `${s.lineups} ${s.lineups === 1 ? "line-up" : "line-ups"}`,
      s.table && "league table",
    ].filter(Boolean);
    return { ok: `Synced from voetbal.nl: ${parts.join(", ") || "nothing new"}.` };
  } catch (err) {
    refresh(slug);
    return { error: err instanceof Error ? err.message : "The sync failed." };
  }
}

/** Adds someone from a voetbal.nl line-up to the squad and puts them in every synced match they played. */
export async function addLineupPlayer(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const club = await requireAdmin(slug);
  const name = text(f, "name", 60);
  if (name.length < 2) return { error: "Unknown player." };
  const sql = await db();
  const existing = await sql<{ id: string; name: string }[]>`select id, name from players where club_id = ${club.id}`;
  if (existing.some((p) => sameName(p.name, name))) return { error: `${name} is already in the squad.` };
  const [player] = await sql<{ id: string; name: string }[]>`insert into players (club_id, name) values (${club.id}, ${name}) returning id, name`;
  const played = await sql<{ id: string; lineup: string[] }[]>`select id, lineup from matches where club_id = ${club.id} and lineup is not null`;
  for (const m of played) if (m.lineup.some((n) => sameName(n, name))) await linkLineup(m.id, m.lineup, [player]);
  refresh(slug);
  return { ok: `${name} added to the squad. Set their number and position below.` };
}

/** The welcome screen's squad step: several players at once, each put into the synced matches they played. */
export async function addPlayers(slug: string, names: string[]): Promise<FormState> {
  const club = await requireAdmin(slug);
  const sql = await db();
  const existing = await sql<{ id: string; name: string }[]>`select id, name from players where club_id = ${club.id}`;
  const fresh: string[] = [];
  for (const raw of names.slice(0, 60)) {
    const name = raw.replace(/\s+/g, " ").trim().slice(0, 60);
    if (name.length >= 2 && ![...existing.map((p) => p.name), ...fresh].some((n) => sameName(n, name))) fresh.push(name);
  }
  if (!fresh.length) return { error: "Nobody new to add." };
  const added = await sql<{ id: string; name: string }[]>`insert into players ${sql(fresh.map((name) => ({ club_id: club.id, name })))} returning id, name`;
  const played = await sql<{ id: string; lineup: string[] }[]>`select id, lineup from matches where club_id = ${club.id} and lineup is not null`;
  for (const m of played) await linkLineup(m.id, m.lineup, added);
  refresh(slug);
  return { ok: `${added.length} ${added.length === 1 ? "player" : "players"} added.` };
}

// ---------- players ----------

export async function savePlayer(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const club = await requireAdmin(slug);
  const id = text(f, "id", 36);
  const name = text(f, "name", 60);
  const position = text(f, "position", 3) as Position;
  if (name.length < 2) return { error: "Enter the player's name." };
  if (!POSITIONS.includes(position)) return { error: "Pick a position." };
  const number = optInt(f.get("number"), 0, 999);
  const nickname = text(f, "nickname", 40) || null;
  const bio = text(f, "bio", 300) || null;
  const displayName = text(f, "displayName", 16).toUpperCase() || null;
  const active = id ? f.get("active") === "on" : true;
  const photo = photoField(f, "photo");
  if ("error" in photo) return photo;

  const sql = await db();
  if (id) {
    if (!UUID.test(id)) return { error: "Unknown player." };
    await sql`
      update players set name = ${name}, number = ${number}, position = ${position}, nickname = ${nickname}, bio = ${bio}, active = ${active},
        display_name = ${displayName}
      where id = ${id} and club_id = ${club.id}`;
    if (photo.photo !== undefined)
      await sql`update players set photo = ${photo.photo}, photo_version = photo_version + 1 where id = ${id} and club_id = ${club.id}`;
  } else {
    await sql`
      insert into players (club_id, name, number, position, nickname, bio, display_name, photo)
      values (${club.id}, ${name}, ${number}, ${position}, ${nickname}, ${bio}, ${displayName}, ${photo.photo ?? null})`;
  }
  refresh(slug);
  return { ok: id ? `${name} updated.` : `${name} added to the squad.` };
}

export async function deletePlayer(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const club = await requireAdmin(slug);
  const id = text(f, "id", 36);
  if (!UUID.test(id)) return { error: "Unknown player." };
  const sql = await db();
  const [{ used }] = await sql<{ used: boolean }[]>`
    select exists (select 1 from match_players where player_id = ${id})
        or exists (select 1 from goals where scorer_id = ${id} or assist_id = ${id})
        or exists (select 1 from match_events where player_id = ${id}) as used`;
  if (used) return { error: "This player has match history, so deleting would wipe their stats. Untick 'Active' instead to hide them from new matches." };
  await sql`delete from players where id = ${id} and club_id = ${club.id}`;
  refresh(slug);
  return { ok: "Player removed." };
}

// ---------- matches ----------

export interface MatchPayload {
  id?: string;
  date: string;
  opponent: string;
  venue: "H" | "A";
  competition: string;
  played: boolean;
  against: number | null;
  squad: string[];
  goals: { scorer: string; assist: string; minute: string; penalty: boolean }[];
  cards: { player: string; type: "Y" | "R" }[];
  ownGoals: string[];
  penaltiesMissed: string[];
  motm: string;
  notes: string;
}

export async function saveMatch(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const club = await requireAdmin(slug);
  let p: MatchPayload;
  try {
    p = JSON.parse(String(f.get("payload") ?? ""));
  } catch {
    return { error: "Couldn't read the form. Try again." };
  }

  const date = String(p.date ?? "");
  const opponent = String(p.opponent ?? "").trim().slice(0, 80);
  const competition = String(p.competition ?? "").trim().slice(0, 40) || "League";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { error: "Pick a date." };
  if (!opponent) return { error: "Enter the opponent." };
  if (p.venue !== "H" && p.venue !== "A") return { error: "Pick home or away." };
  const against = p.played ? optInt(p.against, 0, 99) : null;
  if (p.played && against === null) return { error: "Enter how many goals we conceded." };

  const sql = await db();
  const owned = new Set((await sql<{ id: string }[]>`select id from players where club_id = ${club.id}`).map((r) => r.id));
  const valid = (id: unknown): id is string => typeof id === "string" && owned.has(id);

  const squad = p.played ? [...new Set((p.squad ?? []).filter(valid))] : [];
  const goals = p.played
    ? (p.goals ?? [])
        .filter((g) => g.scorer === "og" || valid(g.scorer))
        .map((g) => ({
          scorer: g.scorer === "og" ? null : g.scorer,
          assist: valid(g.assist) && g.assist !== g.scorer ? g.assist : null,
          minute: optInt(g.minute, 0, 130),
          penalty: Boolean(g.penalty) && g.scorer !== "og",
        }))
    : [];
  const events = p.played
    ? [
        ...(p.cards ?? []).filter((c) => valid(c.player) && (c.type === "Y" || c.type === "R")).map((c) => ({ player: c.player, kind: c.type })),
        ...(p.ownGoals ?? []).filter(valid).map((player) => ({ player, kind: "OG" as const })),
        ...(p.penaltiesMissed ?? []).filter(valid).map((player) => ({ player, kind: "PM" as const })),
      ]
    : [];
  const motm = p.played && valid(p.motm) ? p.motm : null;
  const notes = String(p.notes ?? "").trim().slice(0, 1000) || null;

  // Anyone who scored, assisted or got carded obviously played.
  for (const g of goals) {
    if (g.scorer) squad.includes(g.scorer) || squad.push(g.scorer);
    if (g.assist) squad.includes(g.assist) || squad.push(g.assist);
  }
  for (const e of events) squad.includes(e.player) || squad.push(e.player);
  if (motm && !squad.includes(motm)) squad.push(motm);

  let matchId = p.id && UUID.test(p.id) ? p.id : undefined;
  await sql.begin(async (tx) => {
    if (matchId) {
      const [row] = await tx<{ id: string }[]>`
        update matches set date = ${date}, opponent = ${opponent}, venue = ${p.venue}, competition = ${competition},
          goals_against = ${against}, motm = ${motm}, notes = ${notes}
        where id = ${matchId} and club_id = ${club.id} returning id`;
      if (!row) throw new Error("Match not found.");
      await tx`delete from match_players where match_id = ${matchId}`;
      await tx`delete from goals where match_id = ${matchId}`;
      await tx`delete from match_events where match_id = ${matchId}`;
    } else {
      const [row] = await tx<{ id: string }[]>`
        insert into matches (club_id, date, opponent, venue, competition, goals_against, motm, notes)
        values (${club.id}, ${date}, ${opponent}, ${p.venue}, ${competition}, ${against}, ${motm}, ${notes}) returning id`;
      matchId = row.id;
    }
    const id = matchId!;
    if (squad.length) await tx`insert into match_players ${tx(squad.map((player_id) => ({ match_id: id, player_id })))}`;
    if (goals.length)
      await tx`insert into goals ${tx(goals.map((g, ord) => ({ match_id: id, scorer_id: g.scorer, assist_id: g.assist, minute: g.minute, penalty: g.penalty, ord })))}`;
    if (events.length) await tx`insert into match_events ${tx(events.map((e, ord) => ({ match_id: id, player_id: e.player, kind: e.kind, ord })))}`;
  });

  refresh(slug);
  redirect(`/c/${slug}/matches/${matchId}`);
}

/** Formation, starters and bench for the line-up graphic. Doesn't touch the match squad or stats. */
export async function saveLineup(slug: string, matchId: string, _: FormState, f: FormData): Promise<FormState> {
  const club = await requireLineupAccess(slug);
  if (!UUID.test(matchId)) return { error: "Unknown match." };
  const formation = text(f, "formation", 10);
  if (!FORMATIONS[formation]) return { error: "Pick a formation." };
  const sql = await db();
  const owned = new Set((await sql<{ id: string }[]>`select id from players where club_id = ${club.id}`).map((r) => r.id));
  const starters = formationSlots(formation).map((_, i) => {
    const id = text(f, `slot${i}`, 36);
    return owned.has(id) ? id : null;
  });
  const dupe = starters.find((id, i) => id && starters.indexOf(id) !== i);
  if (dupe) return { error: "Someone is in the line-up twice. Each player can only take one spot." };
  const bench = [...new Set(f.getAll("bench").map(String))].filter((id) => owned.has(id) && !starters.includes(id)).slice(0, MAX_BENCH);
  // As Postgres array literals: ids are checked uuids, so nothing needs quoting, and an empty slot is NULL.
  const array = (ids: (string | null)[]) => `{${ids.map((id) => id ?? "NULL").join(",")}}`;
  const [row] = await sql<{ id: string }[]>`
    update matches set formation = ${formation}, starters = ${array(starters)}::uuid[], bench = ${array(bench)}::uuid[]
    where id = ${matchId} and club_id = ${club.id} returning id`;
  if (!row) return { error: "Match not found." };
  refresh(slug);
  return { ok: "Line-up saved." };
}

export async function deleteMatch(slug: string, f: FormData): Promise<void> {
  const club = await requireAdmin(slug);
  const id = text(f, "id", 36);
  if (UUID.test(id)) {
    const sql = await db();
    await sql`delete from matches where id = ${id} and club_id = ${club.id}`;
  }
  refresh(slug);
  redirect(`/c/${slug}/matches`);
}

// ---------- moments ----------

export async function saveMoment(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const club = await requireAdmin(slug);
  const kind = text(f, "kind", 5);
  const title = text(f, "title", 80);
  const story = text(f, "story", 600);
  const player = text(f, "player", 36);
  const match = text(f, "match", 36);
  if (kind !== "fame" && kind !== "shame") return { error: "Pick Hall of Fame or Hall of Shame." };
  if (!title) return { error: "Give the moment a title." };
  if ((player && !UUID.test(player)) || (match && !UUID.test(match))) return { error: "Unknown player or match." };
  const sql = await db();
  const [ok] = await sql<{ p: boolean; m: boolean }[]>`
    select (${player || null}::uuid is null or exists (select 1 from players where id = ${player || null}::uuid and club_id = ${club.id})) as p,
           (${match || null}::uuid is null or exists (select 1 from matches where id = ${match || null}::uuid and club_id = ${club.id})) as m`;
  if (!ok.p || !ok.m) return { error: "Unknown player or match." };
  await sql`
    insert into moments (club_id, kind, title, story, player_id, match_id)
    values (${club.id}, ${kind}, ${title}, ${story}, ${player || null}, ${match || null})`;
  refresh(slug);
  return { ok: "Moment added." };
}

export async function deleteMoment(slug: string, f: FormData): Promise<void> {
  const club = await requireAdmin(slug);
  const id = text(f, "id", 36);
  if (UUID.test(id)) {
    const sql = await db();
    await sql`delete from moments where id = ${id} and club_id = ${club.id}`;
  }
  refresh(slug);
}
