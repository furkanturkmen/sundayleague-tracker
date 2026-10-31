import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { serverSecret } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseLineups, parseSchedule, parseStandings, parseTeamHeader, sameName, type ScheduleRow, type StandingRow } from "@/lib/voetbal-parse";

// Fixtures, results, line-ups and the league table come from voetbal.nl, which needs a login to show team pages.
// Each club can connect its own voetbal.nl login in Settings; the password is stored encrypted. Clubs without one
// use the site's account (VOETBALNL_EMAIL / VOETBALNL_PASSWORD), which also reads teams for the sign-up screen.
// Scorers, cards and the halls stay manual; a sync never touches them.

const BASE = "https://www.voetbal.nl";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0 Safari/537.36";
/** Pause between requests, so a sync reads like someone clicking through a few pages. */
const DELAY_MS = 800;
/** Line-ups are fetched for results from the last two weeks, plus any older result still missing one. */
const LINEUP_DAYS = 14;
const MAX_LINEUPS = 12;

export function voetbalConfigured(): boolean {
  return Boolean(process.env.VOETBALNL_EMAIL && process.env.VOETBALNL_PASSWORD);
}

// ---------- accounts ----------

type Account = { key: string; email: string; password: string };

function siteAccount(): Account | null {
  const email = process.env.VOETBALNL_EMAIL;
  const password = process.env.VOETBALNL_PASSWORD;
  return email && password ? { key: "site", email, password } : null;
}

// AES-256-GCM with a key derived from the session secret: "v1.<iv>.<tag>.<ciphertext>", each part base64url.
const sealKey = () => createHash("sha256").update(`voetbal-login:${serverSecret()}`).digest();

function seal(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sealKey(), iv);
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return ["v1", ...[iv, cipher.getAuthTag(), body].map((b) => b.toString("base64url"))].join(".");
}

function unseal(sealed: string): string {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !body) throw new Error("Unknown format.");
  const decipher = createDecipheriv("aes-256-gcm", sealKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}

/** The club's own login, or the site's when it has none. Null when neither exists. */
async function clubAccount(clubId: string): Promise<Account | null> {
  const sql = await db();
  const [row] = await sql<{ email: string | null; password: string | null }[]>`
    select voetbal_email as email, voetbal_password as password from clubs where id = ${clubId}`;
  if (!row?.email || !row.password) return siteAccount();
  try {
    return { key: `club:${clubId}`, email: row.email, password: unseal(row.password) };
  } catch {
    throw new Error("The saved voetbal.nl password can't be read any more. Enter it again in Settings.");
  }
}

/** Whether a sync can run for this club: it has its own login, or the site has one. */
export async function canSync(clubId: string): Promise<boolean> {
  return Boolean(await voetbalLoginEmail(clubId)) || voetbalConfigured();
}

/** The email of the club's own voetbal.nl login, for its settings page only. */
export async function voetbalLoginEmail(clubId: string): Promise<string | null> {
  const sql = await db();
  const [row] = await sql<{ email: string | null }[]>`select voetbal_email as email from clubs where id = ${clubId}`;
  return row?.email ?? null;
}

/** Logs in with the given details and saves them for the club once voetbal.nl accepts them. */
export async function connectLogin(clubId: string, email: string, password: string): Promise<void> {
  const account = { key: `check:${clubId}`, email, password };
  try {
    await login(account);
    // Keep the fresh session, so the next sync doesn't log in again.
    jars.set(`club:${clubId}`, jarFor(account));
  } finally {
    jars.delete(account.key);
  }
  const sql = await db();
  await sql`update clubs set voetbal_email = ${email}, voetbal_password = ${seal(password)}, voetbal_error = null where id = ${clubId}`;
}

export async function removeLogin(clubId: string): Promise<void> {
  jars.delete(`club:${clubId}`);
  const sql = await db();
  await sql`update clubs set voetbal_email = null, voetbal_password = null where id = ${clubId}`;
}

// ---------- session ----------

// One cookie jar per account. The session cookie lasts about two weeks, so it's kept between syncs instead of
// logging in every time.
const globalForVoetbal = globalThis as unknown as { voetbalJars?: Map<string, Map<string, string>> };
const jars = (globalForVoetbal.voetbalJars ??= new Map());

function jarFor(account: Account): Map<string, string> {
  let jar = jars.get(account.key);
  if (!jar) jars.set(account.key, (jar = new Map()));
  return jar;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch with our cookie jar, following redirects by hand so cookies set along the way are kept. */
async function request(cookies: Map<string, string>, path: string, init: RequestInit = {}): Promise<{ url: string; status: number; text: string }> {
  let url = new URL(path, BASE).toString();
  let method = init.method ?? "GET";
  let body = init.body;
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(url, {
      method,
      body,
      redirect: "manual",
      headers: {
        "User-Agent": UA,
        "Accept-Language": "nl-NL,nl;q=0.9",
        Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
        ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      signal: AbortSignal.timeout(20_000),
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const value = pair.slice(i + 1);
      if (/deleted|^$/.test(value)) cookies.delete(pair.slice(0, i));
      else cookies.set(pair.slice(0, i), value);
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url).toString();
      method = "GET";
      body = undefined;
      continue;
    }
    return { url, status: res.status, text: await res.text() };
  }
  throw new Error("voetbal.nl kept redirecting.");
}

const loggedOut = (r: { url: string }) => new URL(r.url).pathname.startsWith("/inloggen");

async function login(account: Account): Promise<void> {
  const { email, password } = account;
  const cookies = jarFor(account);
  cookies.clear();
  const page = await request(cookies, "/inloggen");
  const buildId = page.text.match(/name="form_build_id"\s+value="([^"]+)"/)?.[1];
  if (!buildId) throw new Error("Couldn't find the voetbal.nl login form. The site may have changed.");
  await sleep(DELAY_MS);
  const res = await request(cookies, "/inloggen", {
    method: "POST",
    body: new URLSearchParams({ email, password, form_build_id: buildId, form_id: "login_form", op: "Inloggen" }).toString(),
  });
  if (loggedOut(res) || res.text.includes('name="password"'))
    throw new Error(
      account.key === "site"
        ? "voetbal.nl didn't accept the site's login. Check VOETBALNL_EMAIL and VOETBALNL_PASSWORD on the server."
        : "voetbal.nl didn't accept that email and password.",
    );
}

/** A logged-in page. Logs in (again) when voetbal.nl sends us to the login page. */
async function readPage(account: Account, path: string): Promise<string> {
  const cookies = jarFor(account);
  let res = await request(cookies, path);
  if (loggedOut(res)) {
    await login(account);
    await sleep(DELAY_MS);
    res = await request(cookies, path);
    if (loggedOut(res)) throw new Error("Still logged out of voetbal.nl after logging in.");
  }
  if (res.status === 404) throw new Error(`voetbal.nl has no page at ${path}. Check the team link.`);
  if (res.status >= 400) throw new Error(`voetbal.nl answered ${res.status} for ${path}.`);
  await sleep(DELAY_MS);
  return res.text;
}

// ---------- sync ----------

export interface SyncSummary {
  added: number;
  updated: number;
  results: number;
  lineups: number;
  table: number;
}

const running = new Set<string>();

/** Pulls fixtures, results, line-ups and the league table for one club and writes them to the database. */
export async function syncClub(clubId: string): Promise<SyncSummary> {
  if (running.has(clubId)) throw new Error("A sync is already running for this club.");
  running.add(clubId);
  const sql = await db();
  try {
    const [club] = await sql<{ voetbal_team_id: string | null }[]>`select voetbal_team_id from clubs where id = ${clubId}`;
    const teamId = club?.voetbal_team_id;
    if (!teamId) throw new Error("Add the voetbal.nl team link first.");
    const account = await clubAccount(clubId);
    if (!account) throw new Error("Connect a voetbal.nl login in Settings first.");
    const page = (path: string) => readPage(account, path);
    const base = `/team/${teamId}`;

    // Competition first, then the cup. Results come after fixtures so a played match ends up with its score.
    const sources: { path: string; cup: boolean }[] = [
      { path: `${base}/programma/competitie`, cup: false },
      { path: `${base}/uitslagen/competitie`, cup: false },
      { path: `${base}/programma/beker`, cup: true },
      { path: `${base}/uitslagen/beker`, cup: true },
    ];
    const rows = new Map<string, ScheduleRow & { cup: boolean }>();
    let header: { name: string | null; league: string | null } = { name: null, league: null };
    for (const s of sources) {
      let html: string;
      try {
        html = await page(s.path);
      } catch (err) {
        // A team without cup matches has nothing there; the competition pages must work.
        if (s.cup) continue;
        throw err;
      }
      if (!header.name) header = parseTeamHeader(html);
      for (const r of parseSchedule(html)) {
        const ours = r.us ?? (header.name && (sameName(r.home, header.name) ? "home" : sameName(r.away, header.name) ? "away" : null));
        if (ours) rows.set(r.id, { ...r, us: ours, cup: s.cup });
      }
    }
    const table: (StandingRow & { competition: "league" | "cup" })[] = parseStandings(await page(`${base}/stand/competitie`)).map((t) => ({
      ...t,
      competition: "league",
    }));
    // The cup group table, when the team plays in the cup.
    try {
      table.push(...parseStandings(await page(`${base}/stand/beker`)).map((t) => ({ ...t, competition: "cup" as const })));
    } catch {
      // no cup this season
    }

    const summary: SyncSummary = { added: 0, updated: 0, results: 0, lineups: 0, table: table.length };
    const players = await sql<{ id: string; name: string }[]>`select id, name from players where club_id = ${clubId}`;

    await sql.begin(async (tx) => {
      for (const r of rows.values()) {
        const venue = r.us === "home" ? "H" : "A";
        const opponent = r.us === "home" ? r.away : r.home;
        const opponentCode = r.us === "home" ? r.awayCode : r.homeCode;
        const gf = r.score ? (r.us === "home" ? r.score.home : r.score.away) : null;
        const ga = r.score ? (r.us === "home" ? r.score.away : r.score.home) : null;

        // Abandoned (GST) or called off (AFG) without a result: kept, marked, and left out of the stats.
        const status = r.score ? null : r.status === "GST" ? "abandoned" : r.status === "AFG" ? "called-off" : null;

        // Link to a match logged by hand on the same day before the club was connected, rather than adding a copy.
        const [existing] = await tx<{ id: string }[]>`
          select id from matches where club_id = ${clubId} and (external_id = ${r.id} or (external_id is null and date = ${r.date}))
          order by (external_id = ${r.id}) desc nulls last limit 1`;
        if (existing) {
          await tx`
            update matches set external_id = ${r.id}, date = ${r.date}, opponent = ${opponent}, venue = ${venue},
              kickoff = coalesce(${r.kickoff}, kickoff), opponent_code = coalesce(${opponentCode}, opponent_code), status = ${status},
              goals_for = coalesce(${gf}, goals_for), goals_against = coalesce(${ga}, goals_against)
            where id = ${existing.id}`;
          summary.updated++;
        } else {
          await tx`
            insert into matches (club_id, external_id, date, opponent, opponent_code, venue, competition, kickoff, goals_for, goals_against, status)
            values (${clubId}, ${r.id}, ${r.date}, ${opponent}, ${opponentCode}, ${venue}, ${r.cup ? "Cup" : "League"}, ${r.kickoff}, ${gf}, ${ga}, ${status})`;
          summary.added++;
        }
        if (r.score) summary.results++;
      }

      await tx`delete from standings where club_id = ${clubId}`;
      if (table.length)
        await tx`insert into standings ${tx(
          table.map((t) => ({
            club_id: clubId,
            competition: t.competition,
            position: t.position,
            team: t.team,
            club_code: t.clubCode,
            played: t.played,
            won: t.won,
            drawn: t.drawn,
            lost: t.lost,
            points: t.points,
            goals_for: t.goalsFor,
            goals_against: t.goalsAgainst,
            penalty_points: t.penaltyPoints,
            is_us: t.isUs || (header.name ? sameName(t.team, header.name) : false),
          })),
        )}`;
    });

    // Line-ups: one page per match, so only recent results and ones we haven't got yet. Abandoned matches have
    // a line-up too: who played still goes into each player's record, even though the match counts for nothing.
    const since = new Date(Date.now() - LINEUP_DAYS * 86_400_000).toISOString().slice(0, 10);
    const needLineup = await sql<{ id: string; external_id: string; venue: "H" | "A" }[]>`
      select id, external_id, venue from matches
      where club_id = ${clubId} and external_id is not null and (goals_against is not null or status = 'abandoned')
        and (lineup is null or date >= ${since})
      order by date desc limit ${MAX_LINEUPS}`;
    for (const m of needLineup) {
      const [home, away] = parseLineups(await page(`/wedstrijd/${m.external_id}/uitslag`));
      const lineup = m.venue === "H" ? home : away;
      if (!lineup.length) continue;
      await sql`update matches set lineup = ${lineup} where id = ${m.id}`;
      await linkLineup(m.id, lineup, players);
      summary.lineups++;
    }

    await sql`
      update clubs set voetbal_team_name = ${header.name}, voetbal_league = ${header.league}, voetbal_synced_at = now(), voetbal_error = null
      where id = ${clubId}`;
    return summary;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sql`update clubs set voetbal_error = ${message} where id = ${clubId}`;
    throw new Error(message);
  } finally {
    running.delete(clubId);
  }
}

/** Puts squad players named in a voetbal.nl line-up into that match's squad. Never removes anyone. */
export async function linkLineup(matchId: string, lineup: string[], players: { id: string; name: string }[]): Promise<void> {
  const ids = players.filter((p) => lineup.some((n) => sameName(n, p.name))).map((p) => p.id);
  if (!ids.length) return;
  const sql = await db();
  await sql`insert into match_players ${sql(ids.map((player_id) => ({ match_id: matchId, player_id })))} on conflict do nothing`;
}

export interface TeamPreview {
  teamId: string;
  name: string;
  league: string | null;
  /** The team's row in the league table, when it has one yet. */
  standing: { position: number; teams: number; played: number; points: number } | null;
  clubCode: string | null;
  /** The crest as a PNG data URL, ready to store as the club logo. */
  logo: string | null;
  next: { date: string; opponent: string; home: boolean; kickoff: string | null } | null;
}

/** What a team link points at, for the "is this you?" step when a club signs up. Reads two pages; writes nothing. */
export async function previewTeam(teamId: string): Promise<TeamPreview> {
  const account = siteAccount();
  if (!account) throw new Error("This site can't read voetbal.nl right now.");
  const page = (path: string) => readPage(account, path);
  const base = `/team/${teamId}`;
  const tableHtml = await page(`${base}/stand/competitie`);
  const header = parseTeamHeader(tableHtml);
  if (!header.name) throw new Error("voetbal.nl has no team at that link. Check that it opens your team's page.");
  const table = parseStandings(tableHtml);
  const ours = table.find((t) => sameName(t.team, header.name!));

  let next: TeamPreview["next"] = null;
  let code = ours?.clubCode ?? null;
  let league = header.league;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const fixturesHtml = await page(`${base}/programma/competitie`);
    // The fixtures page names the whole league ("Mannen Zondag - 3e klasse 2"); the table page only the first part.
    league = parseTeamHeader(fixturesHtml).league ?? league;
    const fixtures = parseSchedule(fixturesHtml);
    for (const r of fixtures) {
      const home = r.us ? r.us === "home" : sameName(r.home, header.name);
      if (!r.us && !home && !sameName(r.away, header.name)) continue;
      code ??= home ? r.homeCode : r.awayCode;
      if (!next && r.date >= today && !r.score) next = { date: r.date, opponent: home ? r.away : r.home, home, kickoff: r.kickoff };
    }
  } catch {
    // No fixtures out yet; the table is enough to recognise the team.
  }

  let logo: string | null = null;
  if (code) {
    try {
      const res = await fetch(`https://logoapi.voetbal.nl/logo.php?clubcode=${code}`, { signal: AbortSignal.timeout(10_000) });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && /^image\/(png|jpeg)/.test(type)) logo = `data:${type.split(";")[0]};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    } catch {
      // The badge falls back to initials.
    }
  }

  return {
    teamId,
    name: header.name,
    league,
    standing: ours ? { position: ours.position, teams: table.length, played: ours.played, points: ours.points } : null,
    clubCode: code,
    logo,
    next,
  };
}
