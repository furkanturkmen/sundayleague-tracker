import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, SeasonTabs } from "@/components/ui";
import { allStats, inSeason, resolveSeason, seasonLabel, seasons, type PlayerStats } from "@/lib/stats";

export const metadata: Metadata = { title: "Players" };

const POS_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

const columns: { key: string; label: string; title: string; value: (s: PlayerStats) => number; show?: (s: PlayerStats) => string }[] = [
  { key: "apps", label: "Apps", title: "Appearances", value: (s) => s.apps },
  { key: "goals", label: "G", title: "Goals", value: (s) => s.goals },
  { key: "assists", label: "A", title: "Assists", value: (s) => s.assists },
  { key: "ga", label: "G+A", title: "Goals + assists", value: (s) => s.involvements },
  { key: "motm", label: "MOTM", title: "Man of the Match", value: (s) => s.motm },
  { key: "cs", label: "CS", title: "Clean sheets (GK/DEF)", value: (s) => s.cleanSheets },
  { key: "win", label: "Win %", title: "Win rate when playing", value: (s) => s.winPct, show: (s) => (s.apps ? `${Math.round(s.winPct)}%` : "–") },
  { key: "yc", label: "YC", title: "Yellow cards", value: (s) => s.yellows },
  { key: "rc", label: "RC", title: "Red cards", value: (s) => s.reds },
];

export default async function PlayersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const season = resolveSeason(params.season);
  const sortKey = typeof params.sort === "string" ? params.sort : "";
  const col = columns.find((c) => c.key === sortKey);

  const rows = allStats(inSeason(season)).sort((a, b) =>
    col
      ? col.value(b) - col.value(a) || b.apps - a.apps
      : POS_ORDER[a.player.position] - POS_ORDER[b.player.position] || a.player.number - b.player.number,
  );

  const href = (sort?: string) => `/players?season=${season}${sort ? `&sort=${sort}` : ""}`;

  return (
    <>
      <PageHeader title="Players" kicker={seasonLabel(season)}>
        <SeasonTabs base="/players" seasons={seasons} active={season} extra={sortKey ? `&sort=${sortKey}` : ""} />
      </PageHeader>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <Link href={href()} className={!col ? "active" : undefined}>#</Link>
                </th>
                <th>Player</th>
                <th>Pos</th>
                {columns.map((c) => (
                  <th key={c.key} className="num" title={c.title}>
                    <Link href={href(c.key)} className={col?.key === c.key ? "active" : undefined}>
                      {c.label}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.player.id} style={s.apps ? undefined : { opacity: 0.55 }}>
                  <td className="muted">{s.player.number}</td>
                  <td className="strong">
                    <Link href={`/players/${s.player.id}`}>{s.player.name}</Link>
                    {s.player.nickname && <span className="muted small"> “{s.player.nickname}”</span>}
                  </td>
                  <td>
                    <span className="chip">{s.player.position}</span>
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className={`num${col?.key === c.key ? " strong" : ""}`}>
                      {c.show ? c.show(s) : c.value(s)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="small muted">Click a column to sort. Clean sheets only count for keepers and defenders.</p>
    </>
  );
}
