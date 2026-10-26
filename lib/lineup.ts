// Formations and helpers for the line-up graphic. Pure, so the editor and the image route share it.
import { positionGroup, type Match, type Player, type Position } from "@/lib/types";

/** A spot in a formation. x runs left to right and y from the opponent's goal (0) to ours (100), both in %. */
export interface Slot {
  pos: Position;
  x: number;
  y: number;
}

const GK: Slot = { pos: "GK", x: 50, y: 92 };
const BACK_FOUR: Slot[] = [
  { pos: "LB", x: 12, y: 70 },
  { pos: "CB", x: 37, y: 73 },
  { pos: "CB", x: 63, y: 73 },
  { pos: "RB", x: 88, y: 70 },
];
const BACK_THREE: Slot[] = [
  { pos: "CB", x: 22, y: 72 },
  { pos: "CB", x: 50, y: 74 },
  { pos: "CB", x: 78, y: 72 },
];
const TWO_UP: Slot[] = [
  { pos: "ST", x: 33, y: 11 },
  { pos: "ST", x: 67, y: 11 },
];
const FRONT_THREE: Slot[] = [
  { pos: "LW", x: 15, y: 19 },
  { pos: "ST", x: 50, y: 10 },
  { pos: "RW", x: 85, y: 19 },
];

/** Slots run from the keeper forwards, left to right within a line. Starters are stored in this order. */
export const FORMATIONS: Record<string, Slot[]> = {
  "4-2-3-1": [
    GK,
    ...BACK_FOUR,
    { pos: "CDM", x: 31, y: 51 },
    { pos: "CDM", x: 69, y: 51 },
    { pos: "LW", x: 15, y: 30 },
    { pos: "CAM", x: 50, y: 30 },
    { pos: "RW", x: 85, y: 30 },
    { pos: "ST", x: 50, y: 9 },
  ],
  "4-3-3": [GK, ...BACK_FOUR, { pos: "CM", x: 22, y: 45 }, { pos: "CDM", x: 50, y: 52 }, { pos: "CM", x: 78, y: 45 }, ...FRONT_THREE],
  "4-4-2": [
    GK,
    ...BACK_FOUR,
    { pos: "LM", x: 12, y: 43 },
    { pos: "CM", x: 37, y: 47 },
    { pos: "CM", x: 63, y: 47 },
    { pos: "RM", x: 88, y: 43 },
    ...TWO_UP,
  ],
  "4-1-4-1": [
    GK,
    ...BACK_FOUR,
    { pos: "CDM", x: 50, y: 53 },
    { pos: "LM", x: 12, y: 33 },
    { pos: "CM", x: 37, y: 35 },
    { pos: "CM", x: 63, y: 35 },
    { pos: "RM", x: 88, y: 33 },
    { pos: "ST", x: 50, y: 9 },
  ],
  "3-5-2": [
    GK,
    ...BACK_THREE,
    { pos: "LWB", x: 10, y: 42 },
    { pos: "CM", x: 31, y: 44 },
    { pos: "CDM", x: 50, y: 53 },
    { pos: "CM", x: 69, y: 44 },
    { pos: "RWB", x: 90, y: 42 },
    ...TWO_UP,
  ],
  "3-4-3": [
    GK,
    ...BACK_THREE,
    { pos: "LM", x: 12, y: 46 },
    { pos: "CM", x: 37, y: 49 },
    { pos: "CM", x: 63, y: 49 },
    { pos: "RM", x: 88, y: 46 },
    ...FRONT_THREE,
  ],
  "5-3-2": [
    GK,
    { pos: "LWB", x: 9, y: 60 },
    { pos: "CB", x: 30, y: 72 },
    { pos: "CB", x: 50, y: 74 },
    { pos: "CB", x: 70, y: 72 },
    { pos: "RWB", x: 91, y: 60 },
    { pos: "CM", x: 22, y: 41 },
    { pos: "CM", x: 50, y: 45 },
    { pos: "CM", x: 78, y: 41 },
    ...TWO_UP,
  ],
};

export const DEFAULT_FORMATION = "4-2-3-1";
export const MAX_BENCH = 7;

export const formationSlots = (key: string | undefined): Slot[] => FORMATIONS[key ?? ""] ?? FORMATIONS[DEFAULT_FORMATION];

// Positions close enough that a player in one fills the other without anyone minding.
const NEAR: [Position, Position][] = [
  ["LB", "LWB"], ["RB", "RWB"], ["CDM", "CM"], ["CAM", "CM"], ["LW", "LM"], ["RW", "RM"], ["ST", "CF"], ["CDM", "CB"],
];

function fit(player: Position, slot: Position): number {
  if (player === slot) return 4;
  if (NEAR.some(([a, b]) => (a === player && b === slot) || (b === player && a === slot))) return 3;
  // A player listed as just DEF, MID or FWD fits any spot in that line.
  if (positionGroup(player) === positionGroup(slot)) return player === positionGroup(player) ? 3 : 2;
  return slot === "GK" || player === "GK" ? -1 : 0;
}

/** A first guess at the line-up: best-fitting players in each slot, the rest on the bench. */
export function suggestLineup(formation: string, players: Pick<Player, "id" | "position">[]): { starters: (string | null)[]; bench: string[] } {
  const slots = formationSlots(formation);
  const pairs = slots.flatMap((s, i) => players.map((p, order) => ({ slot: i, id: p.id, score: fit(p.position, s.pos), order })));
  // Best fit first; between equals, whoever comes first in the list (the match squad's order).
  pairs.sort((a, b) => b.score - a.score || a.order - b.order || a.slot - b.slot);
  const starters: (string | null)[] = slots.map(() => null);
  const used = new Set<string>();
  for (const p of pairs) {
    if (p.score < 0 || starters[p.slot] || used.has(p.id)) continue;
    starters[p.slot] = p.id;
    used.add(p.id);
  }
  return { starters, bench: players.filter((p) => !used.has(p.id)).map((p) => p.id).slice(0, MAX_BENCH) };
}

/** The saved line-up, or until someone sets one, a guess from the match squad (the active squad for a fixture). */
export function matchLineup(
  match: Pick<Match, "formation" | "starters" | "bench" | "squad">,
  players: Player[],
): { formation: string; starters: (string | null)[]; bench: string[] } {
  const formation = match.formation && FORMATIONS[match.formation] ? match.formation : DEFAULT_FORMATION;
  if (match.starters) {
    // The id arrays have no foreign key, so a player deleted since saving leaves an id behind: show an empty spot.
    const known = new Set(players.map((p) => p.id));
    const starters = formationSlots(formation).map((_, i) => match.starters![i] ?? null).map((id) => (id && known.has(id) ? id : null));
    return { formation, starters, bench: (match.bench ?? []).filter((id) => known.has(id)) };
  }
  const pool = match.squad.length ? players.filter((p) => match.squad.includes(p.id)) : players.filter((p) => p.active);
  return { formation, ...suggestLineup(formation, pool) };
}

/** "BURAK C": the first name, plus the surname's initial when someone else in the squad shares it. */
export function graphicName(player: Pick<Player, "id" | "name" | "displayName">, squad: Pick<Player, "id" | "name">[]): string {
  if (player.displayName) return player.displayName.toUpperCase();
  const [first, ...rest] = player.name.trim().split(/\s+/);
  const clash = squad.some((p) => p.id !== player.id && p.name.trim().split(/\s+/)[0].toLowerCase() === first.toLowerCase());
  const last = rest.filter((w) => !/^(van|de|der|den|el|al|bin|ibn)$/i.test(w)).pop();
  return (clash && last ? `${first} ${last[0]}` : first).toUpperCase();
}

/** "Sloterdijk avv. 2" → "Sloterdijk 2": drops the club-type abbreviations voetbal.nl adds to team names. */
export function shortTeamName(name: string): string {
  const out = name
    .split(/\s+/)
    .filter((w) => !/^(a\.?v\.?v\.?|s\.?v\.?|v\.?v\.?|r\.?k\.?\w*|a\.?f\.?c\.?|s\.?c\.?|f\.?c\.?|v\.?v\.?v\.?|rksv|rkav|rkvv|svv|avv|asv|vv|sv)$/i.test(w))
    .join(" ");
  return out || name;
}
