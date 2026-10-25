import { db } from "@/lib/db";
import { syncClub, voetbalConfigured } from "@/lib/voetbal";

// Called on a schedule (vercel.json, or curl from any always-on machine) to sync every club linked to voetbal.nl.
// Needs "Authorization: Bearer <CRON_SECRET>"; Vercel Cron sends that header by itself when CRON_SECRET is set.

/** Clubs synced more recently than this are skipped, so a second trigger close to the first does nothing. */
const MIN_GAP_MINUTES = 30;

export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  if (!voetbalConfigured()) return Response.json({ error: "VOETBALNL_EMAIL and VOETBALNL_PASSWORD aren't set." }, { status: 500 });

  const sql = await db();
  const clubs = await sql<{ id: string; slug: string }[]>`
    select id, slug from clubs
    where voetbal_team_id is not null and (voetbal_synced_at is null or voetbal_synced_at < now() - make_interval(mins => ${MIN_GAP_MINUTES}))`;

  // One club at a time, to keep the load on voetbal.nl low.
  const results: Record<string, unknown> = {};
  for (const c of clubs) {
    try {
      results[c.slug] = await syncClub(c.id);
    } catch (err) {
      results[c.slug] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  return Response.json({ synced: clubs.length, results });
}
