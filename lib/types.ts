/** The broad line a position belongs to. Stats that depend on position (clean sheets, The Sieve) go by this. */
export type PositionGroup = "GK" | "DEF" | "MID" | "FWD";

/** A specific position, or just the line (DEF, MID, FWD) when a player doesn't have a fixed spot. */
export type Position =
  | PositionGroup
  | "LB" | "CB" | "RB" | "LWB" | "RWB"
  | "CDM" | "CM" | "CAM" | "LM" | "RM"
  | "LW" | "RW" | "CF" | "ST";

/** Every position by line, in pitch order from the back. Also the order the squad is listed in. */
export const POSITION_LINES: { group: PositionGroup; label: string; positions: Position[] }[] = [
  { group: "GK", label: "Goalkeeper", positions: ["GK"] },
  { group: "DEF", label: "Defence", positions: ["DEF", "LB", "CB", "RB", "LWB", "RWB"] },
  { group: "MID", label: "Midfield", positions: ["MID", "CDM", "CM", "CAM", "LM", "RM"] },
  { group: "FWD", label: "Attack", positions: ["FWD", "LW", "RW", "CF", "ST"] },
];

export const POSITIONS: Position[] = POSITION_LINES.flatMap((l) => l.positions);

export const POSITION_NAMES: Record<Position, string> = {
  GK: "Goalkeeper",
  DEF: "Defender",
  LB: "Left back",
  CB: "Centre back",
  RB: "Right back",
  LWB: "Left wing-back",
  RWB: "Right wing-back",
  MID: "Midfielder",
  CDM: "Defensive midfielder",
  CM: "Central midfielder",
  CAM: "Attacking midfielder",
  LM: "Left midfielder",
  RM: "Right midfielder",
  FWD: "Forward",
  LW: "Left winger",
  RW: "Right winger",
  CF: "Centre forward",
  ST: "Striker",
};

export function positionGroup(p: Position): PositionGroup {
  return POSITION_LINES.find((l) => l.positions.includes(p))?.group ?? "MID";
}

export interface Club {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  accent: string;
  gold: string;
  founded: number | null;
  /** URL of the uploaded crest, or null to draw the shield. */
  logo: string | null;
  voetbal: VoetbalLink | null;
  coach: { name: string | null; photo: string | null };
}

/** The club's link to a voetbal.nl team, set in Settings. */
export interface VoetbalLink {
  teamId: string;
  teamName: string | null;
  league: string | null;
  syncedAt: string | null;
  error: string | null;
}

export type MatchStatus = "abandoned" | "called-off";

/** A row of the league or cup group table, as voetbal.nl last showed it. */
export interface Standing {
  competition: "league" | "cup";
  position: number;
  team: string;
  clubCode: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  penaltyPoints: number;
  isUs: boolean;
}

export interface Player {
  id: string;
  name: string;
  number: number | null;
  position: Position;
  nickname: string | null;
  bio: string | null;
  active: boolean;
  /** Name on the graphics, e.g. "BURAK C". Null means work one out from the name. */
  displayName: string | null;
  /** URL of the uploaded photo, or null. */
  photo: string | null;
}

export type Venue = "H" | "A";

/** A goal scored by the club. `scorer` is a player id, or "og" for an opponent own goal. */
export interface Goal {
  scorer: string;
  assist?: string;
  minute?: number;
  penalty?: boolean;
}

export interface Card {
  player: string;
  type: "Y" | "R";
}

export interface Match {
  id: string;
  date: string;
  opponent: string;
  venue: Venue;
  competition: string;
  goals: Goal[];
  /** Goals conceded. `null` means the fixture hasn't been played yet. */
  against: number | null;
  /** Official goals scored from voetbal.nl. Unset for matches logged by hand, where the goals list is the score. */
  goalsFor?: number;
  /** Kick-off time as voetbal.nl shows it, e.g. "13:00". */
  kickoff?: string;
  /** No result because voetbal.nl lists it as abandoned or called off. Left out of every stat. */
  status?: MatchStatus;
  /** voetbal.nl club code of the opponent, for its crest. */
  opponentCode?: string;
  /** voetbal.nl match id, for matches that came from the sync. */
  externalId?: string;
  /** Names on our side of the voetbal.nl line-up. */
  lineup?: string[];
  /** Set on the line-up page for the graphic: a formation key from lib/formations, starters per slot, bench. */
  formation?: string;
  starters?: (string | null)[];
  bench?: string[];
  squad: string[];
  cards: Card[];
  motm?: string;
  /** Our players who put it in their own net. */
  ownGoals: string[];
  penaltiesMissed: string[];
  notes?: string;
}

export interface Moment {
  id: string;
  kind: "fame" | "shame";
  title: string;
  story: string;
  player?: string;
  matchId?: string;
}

export interface ClubData {
  club: Club;
  players: Player[];
  matches: Match[];
  moments: Moment[];
  standings: Standing[];
}

/** Icons the UI draws, mapped to Font Awesome in components/Icon.tsx. */
export type IconName =
  | "ball" | "target" | "calendar" | "star" | "wall" | "hat" | "clover" | "ice" | "card" | "bath"
  | "wrong-way" | "bottle" | "cat" | "ghost" | "sieve" | "trophy" | "thumbs-down" | "miss";
