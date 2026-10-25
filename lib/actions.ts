"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, hashPassword, hasSession, startSession, verifyPassword } from "@/lib/auth";
import { getClubAuth } from "@/lib/club";
import { db } from "@/lib/db";
import { POSITIONS, type Position } from "@/lib/types";

export interface FormState {
  error?: string;
  ok?: string;
}

const RESERVED = new Set(["new", "api", "admin", "settings", "login", "c"]);
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

// ---------- clubs ----------

export async function createClub(_: FormState, f: FormData): Promise<FormState> {
  const fields = clubFields(f);
  if ("error" in fields) return fields;
  const logo = logoField(f);
  if ("error" in logo) return logo;
  const slug = text(f, "slug", 40).toLowerCase();
  const password = String(f.get("password") ?? "");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 2) return { error: "The web address can only use lowercase letters, numbers and dashes." };
  if (RESERVED.has(slug)) return { error: "That web address is taken. Try another." };
  if (password.length < 6) return { error: "The admin password needs at least 6 characters." };
  if (password !== f.get("confirm")) return { error: "The passwords don't match." };

  const sql = await db();
  const hash = await hashPassword(password);
  const [row] = await sql<{ id: string }[]>`
    insert into clubs (slug, name, short_name, tagline, accent, gold, founded, logo, password_hash)
    values (${slug}, ${fields.name}, ${fields.shortName}, ${fields.tagline}, ${fields.accent}, ${fields.gold}, ${fields.founded}, ${logo.logo ?? null}, ${hash})
    on conflict (slug) do nothing
    returning id`;
  if (!row) return { error: "That web address is taken. Try another." };

  await startSession(row.id, hash);
  revalidatePath("/");
  redirect(`/c/${slug}/settings?welcome=1`);
}

export async function updateClub(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const club = await requireAdmin(slug);
  const fields = clubFields(f);
  if ("error" in fields) return fields;
  const logo = logoField(f);
  if ("error" in logo) return logo;
  const sql = await db();
  await sql`
    update clubs set name = ${fields.name}, short_name = ${fields.shortName}, tagline = ${fields.tagline},
      accent = ${fields.accent}, gold = ${fields.gold}, founded = ${fields.founded}
    where id = ${club.id}`;
  if (logo.logo !== undefined) await sql`update clubs set logo = ${logo.logo}, logo_version = logo_version + 1 where id = ${club.id}`;
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

export async function deleteClub(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const club = await requireAdmin(slug);
  if (text(f, "confirm", 60) !== club.name) return { error: `Type "${club.name}" exactly to confirm.` };
  const sql = await db();
  await sql`delete from clubs where id = ${club.id}`;
  await endSession(club.id);
  revalidatePath("/");
  redirect("/");
}

export async function login(slug: string, _: FormState, f: FormData): Promise<FormState> {
  const auth = await getClubAuth(slug);
  if (!auth) return { error: "Club not found." };
  if (!(await verifyPassword(String(f.get("password") ?? ""), auth.passwordHash))) return { error: "Wrong password." };
  await startSession(auth.club.id, auth.passwordHash);
  refresh(slug);
  const next = text(f, "next", 200);
  redirect(next.startsWith(`/c/${slug}`) ? next : `/c/${slug}`);
}

export async function logout(slug: string): Promise<void> {
  const auth = await getClubAuth(slug);
  if (auth) await endSession(auth.club.id);
  refresh(slug);
  redirect(`/c/${slug}`);
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
  const active = id ? f.get("active") === "on" : true;

  const sql = await db();
  if (id) {
    if (!UUID.test(id)) return { error: "Unknown player." };
    await sql`
      update players set name = ${name}, number = ${number}, position = ${position}, nickname = ${nickname}, bio = ${bio}, active = ${active}
      where id = ${id} and club_id = ${club.id}`;
  } else {
    await sql`insert into players (club_id, name, number, position, nickname, bio) values (${club.id}, ${name}, ${number}, ${position}, ${nickname}, ${bio})`;
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
