export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  nickname?: string;
  bio?: string;
}

export type Venue = "H" | "A";

/** A goal scored by DWS. `scorer` is a player id, or "og" for an opponent own goal. */
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
  squad: string[];
  cards: Card[];
  motm?: string;
  /** DWS players who put it in their own net. */
  ownGoals: string[];
  penaltiesMissed: string[];
  notes?: string;
}

export interface Moment {
  title: string;
  story: string;
  player?: string;
  date?: string;
}
