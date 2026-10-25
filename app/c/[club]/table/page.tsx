import type { Metadata } from "next";
import Link from "next/link";
import { Empty, LeagueTable, PageHeader } from "@/components/ui";
import { loadClub } from "@/lib/club";

export const metadata: Metadata = { title: "Table" };

type Props = { params: Promise<{ club: string }>; searchParams: Promise<{ competition?: string }> };

export default async function TablePage({ params, searchParams }: Props) {
  const { data, st, admin } = await loadClub((await params).club);
  const league = data.standings.filter((r) => r.competition === "league");
  const cup = data.standings.filter((r) => r.competition === "cup");
  const showCup = (await searchParams).competition === "cup" && cup.length > 0;
  const rows = showCup ? cup : league;
  const vnl = data.club.voetbal;

  return (
    <>
      <PageHeader title="Table" kicker={showCup ? "Cup group" : (vnl?.league ?? "League")}>
        {cup.length > 0 && (
          <div className="tabs" aria-label="Competition">
            <Link href={`${st.base}/table`} className={!showCup ? "active" : undefined} aria-current={!showCup ? "true" : undefined}>
              League
            </Link>
            <Link href={`${st.base}/table?competition=cup`} className={showCup ? "active" : undefined} aria-current={showCup ? "true" : undefined}>
              Cup
            </Link>
          </div>
        )}
      </PageHeader>
      {rows.length > 0 ? (
        <LeagueTable rows={rows} title={showCup ? "Cup group" : "League table"} subtitle={showCup ? null : vnl?.league} />
      ) : (
        <Empty>
          No table yet.{" "}
          {admin ? (
            <>
              Connect your team to voetbal.nl in <Link href={`${st.base}/settings#voetbal`}>Settings</Link> to pull it in.
            </>
          ) : (
            "It shows up once the club admin connects the team to voetbal.nl."
          )}
        </Empty>
      )}
      {vnl?.syncedAt && (
        <p className="small muted">
          From voetbal.nl, updated {new Date(vnl.syncedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" })}.
        </p>
      )}
    </>
  );
}
