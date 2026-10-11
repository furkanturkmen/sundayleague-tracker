import { matches } from "@/data/matches";
import { players } from "@/data/players";
import type { Match, Player } from "@/lib/types";

export type Result = "W" | "D" | "L";

export interface PlayedMatch extends Match {
  gf: number;
  ga: number;
  result: Result;
  season: string;
}

/** Seasons run August to July. Keyed as "2025-26". */
export function seasonOf(date: string): string {
  const [y, mo] = date.split("-").map(Number);
  const start = mo >= 7 ? y : y - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

export function seasonLabel(season: string): string {
  return season === "all" ? "All time" : season.replace("-", "/");
}

const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date));

export const played: PlayedMatch[] = sorted
  .filter((m) => m.against !== null)
  .map((m) => {
    const gf = m.goals.length;
    const ga = m.against ?? 0;
    return { ...m, gf, ga, result: gf > ga ? "W" : gf < ga ? "L" : "D", season: seasonOf(m.date) };
  });

export const upcoming: Match[] = sorted.filter((m) => m.against === null);

export const seasons: string[] = [...new Set(played.map((m) => m.season))];
export const currentSeason = seasons[seasons.length - 1] ?? seasonOf(new Date().toISOString().slice(0, 10));

export function resolveSeason(param: string | string[] | undefined, fallback = "all"): string {
  const s = Array.isArray(param) ? param[0] : param;
  return s && (s === "all" || seasons.includes(s)) ? s : fallback;
}

export function inSeason(season: string): PlayedMatch[] {
  return season === "all" ? played : played.filter((m) => m.season === season);
}

const playerMap = new Map(players.map((p) => [p.id, p]));

export function getPlayer(id: string): Player | undefined {
  return playerMap.get(id);
}

export function playerName(id: string): string {
  if (id === "og") return "Own goal";
  return playerMap.get(id)?.name ?? id;
}

export function getMatch(id: string): Match | undefined {
  return sorted.find((m) => m.id === id);
}

export function getPlayed(id: string): PlayedMatch | undefined {
  return played.find((m) => m.id === id);
}

export function neighbours(id: string): { prev?: Match; next?: Match } {
  const i = sorted.findIndex((m) => m.id === id);
  return { prev: sorted[i - 1], next: sorted[i + 1] };
}

// ---------- team summary ----------

export interface Summary {
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  ppg: number;
  winPct: number;
  cleanSheets: number;
}

export function summarise(ms: PlayedMatch[]): Summary {
  const w = ms.filter((m) => m.result === "W").length;
  const d = ms.filter((m) => m.result === "D").length;
  const l = ms.length - w - d;
  const gf = sum(ms.map((m) => m.gf));
  const ga = sum(ms.map((m) => m.ga));
  const pts = w * 3 + d;
  return {
    p: ms.length,
    w,
    d,
    l,
    gf,
    ga,
    gd: gf - ga,
    pts,
    ppg: ms.length ? pts / ms.length : 0,
    winPct: ms.length ? (w / ms.length) * 100 : 0,
    cleanSheets: ms.filter((m) => m.ga === 0).length,
  };
}

// ---------- player stats ----------

export interface PlayerStats {
  player: Player;
  apps: number;
  goals: number;
  assists: number;
  pens: number;
  yellows: number;
  reds: number;
  motm: number;
  wins: number;
  draws: number;
  losses: number;
  cleanSheets: number;
  conceded: number;
  ownGoals: number;
  pensMissed: number;
  hatTricks: number;
  winPct: number;
  involvements: number;
}

export function statsFor(player: Player, ms: PlayedMatch[]): PlayerStats {
  const apps = ms.filter((m) => m.squad.includes(player.id));
  const scored = ms.flatMap((m) => m.goals.filter((g) => g.scorer === player.id));
  const goals = scored.length;
  const assists = ms.flatMap((m) => m.goals.filter((g) => g.assist === player.id)).length;
  const cards = ms.flatMap((m) => m.cards.filter((c) => c.player === player.id));
  const wins = apps.filter((m) => m.result === "W").length;
  const draws = apps.filter((m) => m.result === "D").length;
  const defensive = player.position === "GK" || player.position === "DEF";
  return {
    player,
    apps: apps.length,
    goals,
    assists,
    pens: scored.filter((g) => g.penalty).length,
    yellows: cards.filter((c) => c.type === "Y").length,
    reds: cards.filter((c) => c.type === "R").length,
    motm: ms.filter((m) => m.motm === player.id).length,
    wins,
    draws,
    losses: apps.length - wins - draws,
    cleanSheets: defensive ? apps.filter((m) => m.ga === 0).length : 0,
    conceded: sum(apps.map((m) => m.ga)),
    ownGoals: ms.flatMap((m) => m.ownGoals.filter((p) => p === player.id)).length,
    pensMissed: ms.flatMap((m) => m.penaltiesMissed.filter((p) => p === player.id)).length,
    hatTricks: ms.filter((m) => m.goals.filter((g) => g.scorer === player.id).length >= 3).length,
    winPct: apps.length ? (wins / apps.length) * 100 : 0,
    involvements: goals + assists,
  };
}

export function allStats(ms: PlayedMatch[]): PlayerStats[] {
  return players.map((p) => statsFor(p, ms));
}

// ---------- streaks ----------

export interface Run {
  length: number;
  from?: PlayedMatch;
  to?: PlayedMatch;
}

export function longestRun(ms: PlayedMatch[], pred: (m: PlayedMatch) => boolean): Run {
  let best: Run = { length: 0 };
  let start = 0;
  let len = 0;
  ms.forEach((m, i) => {
    if (pred(m)) {
      if (len === 0) start = i;
      len++;
      if (len > best.length) best = { length: len, from: ms[start], to: m };
    } else {
      len = 0;
    }
  });
  return best;
}

export function currentRun(ms: PlayedMatch[]): { result: Result; length: number } | null {
  const last = ms[ms.length - 1];
  if (!last) return null;
  let length = 0;
  for (let i = ms.length - 1; i >= 0 && ms[i].result === last.result; i--) length++;
  return { result: last.result, length };
}

// ---------- records ----------

export function maxBy<T>(items: T[], score: (t: T) => number): T | undefined {
  return items.reduce<T | undefined>((best, t) => (best === undefined || score(t) > score(best) ? t : best), undefined);
}

export interface PlayerMatchRecord {
  player: Player;
  match: PlayedMatch;
  value: number;
}

export function bestInMatch(ms: PlayedMatch[], count: (m: PlayedMatch, id: string) => number): PlayerMatchRecord | undefined {
  const rows = ms.flatMap((match) =>
    players.map((player) => ({ player, match, value: count(match, player.id) })),
  );
  const best = maxBy(rows, (r) => r.value);
  return best && best.value > 0 ? best : undefined;
}

export function goalsInMatch(m: PlayedMatch, id: string): number {
  return m.goals.filter((g) => g.scorer === id).length;
}

export function assistsInMatch(m: PlayedMatch, id: string): number {
  return m.goals.filter((g) => g.assist === id).length;
}

// ---------- analysis ----------

export function byMonth(ms: PlayedMatch[]) {
  const map = new Map<string, PlayedMatch[]>();
  for (const m of ms) {
    const key = m.date.slice(0, 7);
    map.set(key, [...(map.get(key) ?? []), m]);
  }
  return [...map.entries()].map(([month, list]) => ({ month, ...summarise(list) }));
}

export const MINUTE_BUCKETS = ["0-15", "16-30", "31-45", "46-60", "61-75", "76-90+"];

export function goalsByMinute(ms: PlayedMatch[]): number[] {
  const counts = MINUTE_BUCKETS.map(() => 0);
  for (const g of ms.flatMap((m) => m.goals)) {
    if (g.minute === undefined) continue;
    counts[Math.min(5, Math.max(0, Math.ceil(g.minute / 15) - 1))]++;
  }
  return counts;
}

export function groupSummary(ms: PlayedMatch[], key: (m: PlayedMatch) => string) {
  const map = new Map<string, PlayedMatch[]>();
  for (const m of ms) map.set(key(m), [...(map.get(key(m)) ?? []), m]);
  return [...map.entries()].map(([name, list]) => ({ name, ...summarise(list) }));
}

export function partnerships(ms: PlayedMatch[]) {
  const map = new Map<string, number>();
  for (const g of ms.flatMap((m) => m.goals)) {
    if (!g.assist || g.scorer === "og") continue;
    const key = `${g.assist}>${g.scorer}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => {
      const [assist, scorer] = key.split(">");
      return { assist, scorer, count };
    })
    .sort((a, b) => b.count - a.count);
}

export function withWithout(ms: PlayedMatch[], minApps = 3) {
  return players
    .map((player) => {
      const withP = ms.filter((m) => m.squad.includes(player.id));
      const without = ms.filter((m) => !m.squad.includes(player.id));
      const a = summarise(withP);
      const b = summarise(without);
      return { player, with: a, without: b, diff: a.ppg - b.ppg };
    })
    .filter((r) => r.with.p >= minApps && r.without.p >= 1)
    .sort((x, y) => y.diff - x.diff);
}

// ---------- halls ----------

export interface AwardLeader {
  player: Player;
  value: number;
  display: string;
}

export interface Award {
  title: string;
  blurb: string;
  icon: string;
  leaders: AwardLeader[];
}

interface AwardSpec {
  title: string;
  blurb: string;
  icon: string;
  value: (s: PlayerStats) => number;
  display?: (s: PlayerStats) => string;
  eligible?: (s: PlayerStats) => boolean;
  /** Lowest wins instead of highest. */
  ascending?: boolean;
  /** Keep players on zero (only makes sense for ascending awards). */
  allowZero?: boolean;
}

function award(stats: PlayerStats[], spec: AwardSpec): Award {
  const leaders = stats
    .filter((s) => s.apps > 0 && (spec.eligible?.(s) ?? true))
    .filter((s) => spec.allowZero || spec.value(s) > 0)
    .sort((a, b) => (spec.ascending ? spec.value(a) - spec.value(b) : spec.value(b) - spec.value(a)))
    .slice(0, 3)
    .map((s) => ({ player: s.player, value: spec.value(s), display: spec.display?.(s) ?? String(spec.value(s)) }));
  return { title: spec.title, blurb: spec.blurb, icon: spec.icon, leaders };
}

const pct = (n: number) => `${Math.round(n)}%`;
const perGame = (n: number, apps: number) => (apps ? n / apps : 0);
const MIN_APPS = 5;

export function hallOfFame(ms: PlayedMatch[]): Award[] {
  const stats = allStats(ms);
  return [
    award(stats, { title: "Golden Boot", icon: "⚽", blurb: "Most goals", value: (s) => s.goals }),
    award(stats, { title: "Playmaker", icon: "🎯", blurb: "Most assists", value: (s) => s.assists }),
    award(stats, { title: "Mr Reliable", icon: "📅", blurb: "Most appearances", value: (s) => s.apps }),
    award(stats, { title: "Main Character", icon: "⭐", blurb: "Most Man of the Match awards", value: (s) => s.motm }),
    award(stats, { title: "The Wall", icon: "🧱", blurb: "Most clean sheets (keepers and defenders)", value: (s) => s.cleanSheets }),
    award(stats, { title: "Hat-trick Hero", icon: "🎩", blurb: "Most hat-tricks", value: (s) => s.hatTricks }),
    award(stats, {
      title: "Lucky Charm",
      icon: "🍀",
      blurb: `Best win rate (${MIN_APPS}+ apps)`,
      value: (s) => s.winPct,
      display: (s) => `${pct(s.winPct)} of ${s.apps}`,
      eligible: (s) => s.apps >= MIN_APPS,
    }),
    award(stats, { title: "Ice Cold", icon: "🧊", blurb: "Most penalties scored", value: (s) => s.pens }),
  ];
}

export function hallOfShame(ms: PlayedMatch[]): Award[] {
  const stats = allStats(ms);
  return [
    award(stats, {
      title: "Card Collector",
      icon: "🟨",
      blurb: "Most bookings (red counts as three)",
      value: (s) => s.yellows + s.reds * 3,
      display: (s) => `${s.yellows}Y ${s.reds}R`,
    }),
    award(stats, { title: "Early Bath", icon: "🟥", blurb: "Most red cards", value: (s) => s.reds }),
    award(stats, { title: "Wrong End", icon: "🙃", blurb: "Most own goals", value: (s) => s.ownGoals }),
    award(stats, { title: "Bottle Job", icon: "🍾", blurb: "Most penalties missed", value: (s) => s.pensMissed }),
    award(stats, {
      title: "The Jinx",
      icon: "🐈‍⬛",
      blurb: `Worst win rate (${MIN_APPS}+ apps)`,
      value: (s) => s.winPct,
      display: (s) => `${pct(s.winPct)} of ${s.apps}`,
      eligible: (s) => s.apps >= MIN_APPS,
      ascending: true,
      allowZero: true,
    }),
    award(stats, {
      title: "Ghost Mode",
      icon: "👻",
      blurb: `Fewest goal involvements per game, outfield (${MIN_APPS}+ apps)`,
      value: (s) => perGame(s.involvements, s.apps),
      display: (s) => `${s.involvements} G+A in ${s.apps}`,
      eligible: (s) => s.apps >= MIN_APPS && s.player.position !== "GK",
      ascending: true,
      allowZero: true,
    }),
    award(stats, {
      title: "The Sieve",
      icon: "🥅",
      blurb: "Most conceded per game in goal",
      value: (s) => perGame(s.conceded, s.apps),
      display: (s) => `${perGame(s.conceded, s.apps).toFixed(1)} per game`,
      eligible: (s) => s.player.position === "GK",
    }),
  ];
}

// ---------- formatting ----------

export function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
}

export function formatMonth(month: string): string {
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", month: "short", year: "2-digit" });
}

export function score(m: PlayedMatch): string {
  return m.venue === "H" ? `${m.gf}–${m.ga}` : `${m.ga}–${m.gf}`;
}

/** Score from our point of view, DWS first. */
export function ourScore(m: PlayedMatch): string {
  return `${m.gf}–${m.ga}`;
}

export function fixtureTitle(m: Match): string {
  return m.venue === "H" ? `DWS vs ${m.opponent}` : `${m.opponent} vs DWS`;
}
