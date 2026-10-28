import type { ClubData, Player } from "@/lib/types";
import { seasonLabel, type PlayerStats, type Stats } from "@/lib/stats";

// Rankings: the coach's own lists, plus a few kept up to date from the stats. Both draw the same graphic.

export interface RankingRow {
  player: Player;
  /** Only the stat lists have a number to show. */
  value?: number;
}

export interface RankingView {
  id: string;
  title: string;
  accentText: string;
  /** Words for the graphic, which is in Dutch like the other posts. */
  graphic: { title: string; accent: string };
  rows: RankingRow[];
  auto: boolean;
  /** "2026/27 season" for the stat lists; when it last changed for the coach's own. */
  note: string;
}

const AUTO: { id: string; title: string; graphic: [string, string]; stat: (s: PlayerStats) => number }[] = [
  { id: "goals", title: "Top scorers", graphic: ["TOP", "SCORERS"], stat: (s) => s.goals },
  { id: "assists", title: "Most assists", graphic: ["MEESTE", "ASSISTS"], stat: (s) => s.assists },
  { id: "motm", title: "Man of the match", graphic: ["MAN OF", "THE MATCH"], stat: (s) => s.motm },
];

export const AUTO_RANKINGS = AUTO.map((a) => a.id);

/** Every ranking, the coach's own first (most recently changed first), then the stat lists for this season. */
export function allRankings(data: ClubData, st: Stats): RankingView[] {
  return [...data.rankings.map((r) => ownRanking(data, r.id)!), ...AUTO.map((a) => autoRanking(st, a.id)!)];
}

export function getRanking(data: ClubData, st: Stats, id: string): RankingView | undefined {
  return AUTO_RANKINGS.includes(id) ? autoRanking(st, id) : ownRanking(data, id);
}

function ownRanking(data: ClubData, id: string): RankingView | undefined {
  const r = data.rankings.find((x) => x.id === id);
  if (!r) return undefined;
  const byId = new Map(data.players.map((p) => [p.id, p]));
  return {
    id: r.id,
    title: r.title,
    accentText: r.accentText,
    graphic: { title: r.title.toUpperCase(), accent: r.accentText.toUpperCase() },
    rows: r.players.map((p) => ({ player: byId.get(p)! })),
    auto: false,
    note: `Updated ${new Date(r.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
  };
}

function autoRanking(st: Stats, id: string): RankingView | undefined {
  const a = AUTO.find((x) => x.id === id);
  if (!a) return undefined;
  const rows = st
    .allStats(st.inSeason(st.currentSeason))
    .map((s) => ({ player: s.player, value: a.stat(s) }))
    .filter((r) => r.value > 0)
    .sort((x, y) => y.value - x.value || (x.player.number ?? 999) - (y.player.number ?? 999));
  return {
    id: a.id,
    title: a.title,
    accentText: "",
    graphic: { title: a.graphic[0], accent: a.graphic[1] },
    rows,
    auto: true,
    note: seasonLabel(st.currentSeason),
  };
}

/** Where a player sits in each of the coach's lists, for the badges on their page. */
export function placesFor(data: ClubData, playerId: string): { id: string; title: string; place: number }[] {
  return data.rankings
    .map((r) => ({ id: r.id, title: [r.title, r.accentText].filter(Boolean).join(" "), place: r.players.indexOf(playerId) + 1 }))
    .filter((r) => r.place > 0)
    .sort((a, b) => a.place - b.place);
}
