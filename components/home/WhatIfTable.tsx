"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";

export interface TableRow {
  team: string;
  logo: ReactNode;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  penaltyPoints: number;
  isUs: boolean;
  /** The side we meet next, which takes the other half of the result. */
  isNext: boolean;
}

type Outcome = "now" | "W" | "D" | "L";

/**
 * The league table, with Sunday played in advance: pick a result and the rows slide to where it would leave
 * everyone. The what-if result is 1–0, 1–1 or 0–1; ties go on points, goal difference, then goals scored.
 */
export function WhatIfTable({ rows, opponent }: { rows: TableRow[]; opponent: string | null }) {
  const [pick, setPick] = useState<Outcome>("now");
  const reduce = useReducedMotion();
  const table = played(rows, pick);
  // Today's order is voetbal.nl's own; only the what-ifs are re-ranked here.
  const before = rows.findIndex((r) => r.isUs) + 1;
  const after = table.findIndex((r) => r.isUs) + 1;
  const options: { key: Outcome; label: string }[] = [
    { key: "now", label: "As it stands" },
    { key: "W", label: "Win" },
    { key: "D", label: "Draw" },
    { key: "L", label: "Loss" },
  ];

  return (
    <div className="hx-whatif">
      {opponent && (
        <div className="hx-whatif-bar">
          <p>
            If we play <strong>{opponent}</strong> and
          </p>
          <div className="hx-seg" role="radiogroup" aria-label="Result of the next match">
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={pick === o.key}
                className={`hx-seg-btn${pick === o.key ? " on" : ""}${o.key !== "now" ? ` hx-seg-${o.key}` : ""}`}
                onClick={() => setPick(o.key)}
              >
                <span>{o.label}</span>
              </button>
            ))}
          </div>
          <p className="hx-whatif-result" aria-live="polite">
            {pick === "now" ? `${ordinal(before)} today` : after === before ? `Still ${ordinal(after)}` : `${ordinal(before)} → ${ordinal(after)}`}
          </p>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th className="num">#</th>
            <th>Team</th>
            <th className="num">P</th>
            <th className="num">GD</th>
            <th className="num">Pts</th>
          </tr>
        </thead>
        <LayoutGroup>
          <tbody>
            {table.map((r, i) => (
              <motion.tr
                key={r.team}
                layout={reduce ? false : "position"}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className={[r.isUs && "is-us", r.isNext && "is-next"].filter(Boolean).join(" ") || undefined}
              >
                <td className="num">{i + 1}</td>
                <td>
                  <span className="hx-team-cell">
                    {r.logo}
                    <span>{r.team}</span>
                  </span>
                </td>
                <td className="num">{r.played}</td>
                <td className="num">{signed(r.goalsFor - r.goalsAgainst)}</td>
                <td className="num">
                  {r.points}
                  {r.penaltyPoints > 0 && <small title={`${r.penaltyPoints} points deducted`}> −{r.penaltyPoints}</small>}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </LayoutGroup>
      </table>
    </div>
  );
}

function played(rows: TableRow[], pick: Outcome): TableRow[] {
  if (pick === "now") return rows;
  const [us, them] = pick === "W" ? [1, 0] : pick === "D" ? [1, 1] : [0, 1];
  const points = (f: number, a: number) => (f > a ? 3 : f === a ? 1 : 0);
  return rank(
    rows.map((r) =>
      r.isUs
        ? { ...r, played: r.played + 1, goalsFor: r.goalsFor + us, goalsAgainst: r.goalsAgainst + them, points: r.points + points(us, them) }
        : r.isNext
          ? { ...r, played: r.played + 1, goalsFor: r.goalsFor + them, goalsAgainst: r.goalsAgainst + us, points: r.points + points(them, us) }
          : r,
    ),
  );
}

function rank(rows: TableRow[]): TableRow[] {
  return [...rows].sort(
    (a, b) => b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor,
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

function ordinal(n: number) {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}
