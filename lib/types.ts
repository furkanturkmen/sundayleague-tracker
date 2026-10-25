export type Position = "GK" | "DEF" | "MID" | "FWD";

export const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];

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
}

/** The club's link to a voetbal.nl team, set in Settings. */
export interface VoetbalLink {
  teamId: string;
  teamName: string | null;
  league: string | null;
  syncedAt: string | null;
  error: string | null;
}

/** A row of the league table, as voetbal.nl last showed it. */
export interface Standing {
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
  /** voetbal.nl club code of the opponent, for its crest. */
  opponentCode?: string;
  /** voetbal.nl match id, for matches that came from the sync. */
  externalId?: string;
  /** Names on our side of the voetbal.nl line-up. */
  lineup?: string[];
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
