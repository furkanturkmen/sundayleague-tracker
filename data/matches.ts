import type { Card, Goal, Match, Venue } from "@/lib/types";

/*
 * How to add a match:
 *   goals:  [scorer, assist | null, minute?, "p" for a penalty?]  - use "og" as scorer for an opponent own goal
 *   ga:     goals conceded (leave it out for a fixture that hasn't been played yet)
 *   out/in: changes to the usual squad below
 *   og:     DWS players who scored an own goal
 */

const SQUAD = ["dan", "lewis", "jamie", "kai", "tom", "ryan", "sam", "josh", "ollie", "marcus", "connor", "ben", "zak"];

type GoalInput = [scorer: string, assist: string | null, minute?: number, flag?: "p"];

interface MatchInput {
  date: string;
  opp: string;
  venue: Venue;
  comp?: string;
  ga?: number;
  goals?: GoalInput[];
  out?: string[];
  in?: string[];
  cards?: [string, Card["type"]][];
  motm?: string;
  og?: string[];
  penMiss?: string[];
  notes?: string;
}

function m(i: MatchInput): Match {
  const squad = SQUAD.filter((p) => !i.out?.includes(p)).concat(i.in ?? []);
  const goals: Goal[] = (i.goals ?? []).map(([scorer, assist, minute, flag]) => ({
    scorer,
    assist: assist ?? undefined,
    minute,
    penalty: flag === "p" || undefined,
  }));
  return {
    id: i.date,
    date: i.date,
    opponent: i.opp,
    venue: i.venue,
    competition: i.comp ?? "League",
    goals,
    against: i.ga ?? null,
    squad,
    cards: (i.cards ?? []).map(([player, type]) => ({ player, type })),
    motm: i.motm,
    ownGoals: i.og ?? [],
    penaltiesMissed: i.penMiss ?? [],
    notes: i.notes,
  };
}

// Placeholder results - replace with the real fixtures.
export const matches: Match[] = [
  // 2025/26
  m({ date: "2025-09-07", opp: "Red Lion FC", venue: "H", ga: 1, goals: [["connor", "marcus", 8], ["josh", "ollie", 34], ["marcus", "connor", 71]], cards: [["ryan", "Y"]], motm: "connor", notes: "First ever game. First ever win." }),
  m({ date: "2025-09-14", opp: "Kings Arms", venue: "A", ga: 2, goals: [["connor", null, 55]], cards: [["kai", "Y"], ["tom", "Y"]], og: ["tom"], motm: "dan" }),
  m({ date: "2025-09-21", opp: "Albion Rovers", venue: "H", ga: 2, goals: [["marcus", "sam", 20], ["josh", null, 88, "p"]], motm: "josh" }),
  m({ date: "2025-09-28", opp: "Northside United", venue: "A", comp: "Cup", ga: 0, goals: [["connor", "josh", 5], ["connor", "ollie", 40], ["connor", "marcus", 62], ["ben", "zak", 85]], motm: "connor" }),
  m({ date: "2025-10-05", opp: "St. Mary's Old Boys", venue: "H", ga: 3, cards: [["lewis", "R"]], penMiss: ["josh"], motm: "dan" }),
  m({ date: "2025-10-12", opp: "Railway Athletic", venue: "A", ga: 1, goals: [["ollie", "sam", 15], ["marcus", null, 90]], out: ["lewis"], in: ["liam"], motm: "ollie" }),
  m({ date: "2025-10-26", opp: "Kings Arms", venue: "H", ga: 0, goals: [["kai", "josh", 67]], motm: "kai" }),
  m({ date: "2025-11-02", opp: "Hollybush FC", venue: "A", ga: 5, goals: [["connor", "marcus", 30]], out: ["dan"], in: ["harry"], cards: [["ryan", "Y"], ["sam", "Y"]], og: ["jamie"], motm: "harry", notes: "Played without a recognised keeper until Harry turned up at half time." }),
  m({ date: "2025-11-09", opp: "Red Lion FC", venue: "A", ga: 1, goals: [["sam", "ollie", 52]], motm: "sam" }),
  m({ date: "2025-11-23", opp: "Eastfield Sports", venue: "H", comp: "Cup", ga: 1, goals: [["marcus", "connor", 44], ["connor", "ben", 79]], motm: "marcus" }),
  m({ date: "2025-12-07", opp: "Albion Rovers", venue: "A", ga: 0, goals: [["josh", "ollie", 11], ["ollie", "josh", 38], ["connor", null, 60]], motm: "josh" }),
  m({ date: "2025-12-14", opp: "Hollybush FC", venue: "H", ga: 2, cards: [["tom", "Y"], ["ryan", "R"]], motm: "dan" }),
  m({ date: "2026-01-11", opp: "Railway Athletic", venue: "H", ga: 2, goals: [["connor", "josh", 3], ["connor", "marcus", 27], ["marcus", "ollie", 48], ["ben", "connor", 70], ["og", null, 81]], out: ["ryan"], in: ["liam"], motm: "connor" }),
  m({ date: "2026-01-25", opp: "Northside United", venue: "H", ga: 0, goals: [["liam", "josh", 33], ["josh", null, 75, "p"]], out: ["jamie"], in: ["liam"], motm: "liam" }),
  m({ date: "2026-02-08", opp: "St. Mary's Old Boys", venue: "A", comp: "Cup", ga: 2, goals: [["marcus", "sam", 66]], penMiss: ["connor"], motm: "marcus", notes: "Cup quarter-final. Connor's penalty is still going." }),
  m({ date: "2026-02-22", opp: "Eastfield Sports", venue: "A", ga: 0, motm: "dan" }),
  m({ date: "2026-03-08", opp: "Kings Arms", venue: "H", ga: 2, goals: [["zak", "ben", 9], ["connor", "zak", 58], ["ollie", null, 89]], motm: "zak" }),
  m({ date: "2026-03-22", opp: "Hollybush FC", venue: "A", ga: 2, goals: [["connor", "marcus", 40], ["josh", "ollie", 61]], cards: [["lewis", "Y"]], motm: "josh" }),
  m({ date: "2026-04-05", opp: "Red Lion FC", venue: "H", ga: 1, goals: [["marcus", "josh", 2], ["marcus", "connor", 19], ["sam", "ryan", 55], ["connor", "marcus", 80]], motm: "marcus" }),
  m({ date: "2026-04-19", opp: "St. Mary's Old Boys", venue: "H", ga: 4, goals: [["ben", null, 77]], cards: [["jamie", "Y"], ["kai", "Y"]], og: ["kai"] }),

  // 2026/27
  m({ date: "2026-09-06", opp: "Ferryhill Town", venue: "H", ga: 0, goals: [["connor", "josh", 23], ["ollie", "marcus", 64]], motm: "connor" }),
  m({ date: "2026-09-13", opp: "Albion Rovers", venue: "A", ga: 1, cards: [["ryan", "Y"]], motm: "tom" }),
  m({ date: "2026-09-20", opp: "Railway Athletic", venue: "A", comp: "Cup", ga: 2, goals: [["josh", "ollie", 14], ["marcus", "zak", 50], ["connor", "josh", 88]], motm: "josh" }),
  m({ date: "2026-09-27", opp: "Kings Arms", venue: "H", ga: 1, goals: [["kai", "ryan", 71]], motm: "kai" }),
  m({ date: "2026-10-04", opp: "Hollybush FC", venue: "H", ga: 1, goals: [["marcus", "connor", 35], ["connor", "marcus", 82]], motm: "connor" }),

  // Upcoming
  m({ date: "2026-10-18", opp: "Northside United", venue: "A" }),
  m({ date: "2026-10-25", opp: "Eastfield Sports", venue: "H" }),
];
