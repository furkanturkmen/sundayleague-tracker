import "server-only";
import { db } from "@/lib/db";
import { parseLineups, parseSchedule, parseStandings, parseTeamHeader, sameName, type ScheduleRow } from "@/lib/voetbal-parse";

// Fixtures, results, line-ups and the league table come from voetbal.nl, which needs a login to show team pages.
// The login (VOETBALNL_EMAIL / VOETBALNL_PASSWORD) belongs to whoever runs this site: use a separate account,
// not a personal one. Scorers, cards and the halls stay manual; a sync never touches them.

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

// ---------- session ----------

// The session cookie lasts about two weeks, so it's kept between syncs instead of logging in every time.
const globalForVoetbal = globalThis as unknown as { voetbalCookies?: Map<string, string> };
const cookies = (globalForVoetbal.voetbalCookies ??= new Map());

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch with our cookie jar, following redirects by hand so cookies set along the way are kept. */
async function request(path: string, init: RequestInit = {}): Promise<{ url: string; status: number; text: string }> {
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

async function login(): Promise<void> {
  const email = process.env.VOETBALNL_EMAIL;
  const password = process.env.VOETBALNL_PASSWORD;
  if (!email || !password) throw new Error("The voetbal.nl login isn't set up on the server (VOETBALNL_EMAIL and VOETBALNL_PASSWORD).");
  cookies.clear();
  const page = await request("/inloggen");
  const buildId = page.text.match(/name="form_build_id"\s+value="([^"]+)"/)?.[1];
  if (!buildId) throw new Error("Couldn't find the voetbal.nl login form. The site may have changed.");
  await sleep(DELAY_MS);
  const res = await request("/inloggen", {
    method: "POST",
    body: new URLSearchParams({ email, password, form_build_id: buildId, form_id: "login_form", op: "Inloggen" }).toString(),
  });
  if (loggedOut(res) || res.text.includes('name="password"')) throw new Error("voetbal.nl didn't accept the login. Check the email and password on the server.");
}

/** A logged-in page. Logs in (again) when voetbal.nl sends us to the login page. */
async function page(path: string): Promise<string> {
  let res = await request(path);
  if (loggedOut(res)) {
    await login();
    await sleep(DELAY_MS);
    res = await request(path);
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
    const table = parseStandings(await page(`${base}/stand/competitie`));

    const summary: SyncSummary = { added: 0, updated: 0, results: 0, lineups: 0, table: table.length };
    const players = await sql<{ id: string; name: string }[]>`select id, name from players where club_id = ${clubId}`;

    await sql.begin(async (tx) => {
      for (const r of rows.values()) {
        const venue = r.us === "home" ? "H" : "A";
        const opponent = r.us === "home" ? r.away : r.home;
        const gf = r.score ? (r.us === "home" ? r.score.home : r.score.away) : null;
        const ga = r.score ? (r.us === "home" ? r.score.away : r.score.home) : null;

        // Called off or abandoned without a result: drop it if we only had it as an upcoming fixture.
        if (!r.score && r.status) {
          await tx`delete from matches where club_id = ${clubId} and external_id = ${r.id} and goals_against is null`;
          continue;
        }

        // Link to a match logged by hand on the same day before the club was connected, rather than adding a copy.
        const [existing] = await tx<{ id: string }[]>`
          select id from matches where club_id = ${clubId} and (external_id = ${r.id} or (external_id is null and date = ${r.date}))
          order by (external_id = ${r.id}) desc nulls last limit 1`;
        if (existing) {
          await tx`
            update matches set external_id = ${r.id}, date = ${r.date}, opponent = ${opponent}, venue = ${venue},
              kickoff = coalesce(${r.kickoff}, kickoff),
              goals_for = coalesce(${gf}, goals_for), goals_against = coalesce(${ga}, goals_against)
            where id = ${existing.id}`;
          summary.updated++;
        } else {
          await tx`
            insert into matches (club_id, external_id, date, opponent, venue, competition, kickoff, goals_for, goals_against)
            values (${clubId}, ${r.id}, ${r.date}, ${opponent}, ${venue}, ${r.cup ? "Cup" : "League"}, ${r.kickoff}, ${gf}, ${ga})`;
          summary.added++;
        }
        if (r.score) summary.results++;
      }

      await tx`delete from standings where club_id = ${clubId}`;
      if (table.length)
        await tx`insert into standings ${tx(
          table.map((t) => ({
            club_id: clubId,
            position: t.position,
            team: t.team,
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

    // Line-ups: one page per match, so only recent results and ones we haven't got yet.
    const since = new Date(Date.now() - LINEUP_DAYS * 86_400_000).toISOString().slice(0, 10);
    const needLineup = await sql<{ id: string; external_id: string; venue: "H" | "A" }[]>`
      select id, external_id, venue from matches
      where club_id = ${clubId} and external_id is not null and goals_against is not null and (lineup is null or date >= ${since})
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
