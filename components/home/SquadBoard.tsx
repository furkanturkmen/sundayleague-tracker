"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Kit } from "@/components/Kit";
import type { PositionGroup } from "@/lib/types";

export interface SquadRow {
  id: string;
  href: string;
  name: string;
  nickname: string | null;
  number: number | null;
  position: string;
  positionName: string;
  group: PositionGroup;
  apps: number;
  goals: number;
  assists: number;
  motm: number;
  cleanSheets: number;
  winPct: number;
  yellows: number;
  reds: number;
}

const LINES: { group: PositionGroup; label: string; plural: string }[] = [
  { group: "GK", label: "GK", plural: "Goalkeepers" },
  { group: "DEF", label: "DEF", plural: "Defenders" },
  { group: "MID", label: "MID", plural: "Midfielders" },
  { group: "FWD", label: "FWD", plural: "Forwards" },
];

type SortKey = "apps" | "goals" | "assists" | "motm" | "cleanSheets" | "winPct" | "cards";
const COLUMNS: { key: SortKey; label: string; title: string; value: (r: SquadRow) => number; show?: (r: SquadRow) => string }[] = [
  { key: "apps", label: "Apps", title: "Appearances", value: (r) => r.apps },
  { key: "goals", label: "Goals", title: "Goals", value: (r) => r.goals },
  { key: "assists", label: "Assists", title: "Assists", value: (r) => r.assists },
  { key: "motm", label: "MOTM", title: "Man of the match", value: (r) => r.motm },
  { key: "cleanSheets", label: "Clean sheets", title: "Clean sheets (keepers and defenders)", value: (r) => r.cleanSheets },
  { key: "winPct", label: "Win %", title: "Win rate when playing", value: (r) => r.winPct, show: (r) => (r.apps ? `${Math.round(r.winPct)}%` : "–") },
  { key: "cards", label: "Cards", title: "Yellow and red cards", value: (r) => r.yellows + r.reds * 2, show: (r) => (r.yellows + r.reds ? `${r.yellows}Y ${r.reds}R` : "0") },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The squad two ways. Squad: a shirt per player, grouped by line, with a filter that slides the others away.
 * Stats: one sortable table (a list of rows on a phone) whose rows glide to their new places on every sort.
 */
export function SquadBoard({ rows, kit, initialSort }: { rows: SquadRow[]; kit: { main: string; trim: string; logo: string | null }; initialSort?: string }) {
  const reduce = useReducedMotion();
  const startSort = COLUMNS.find((c) => c.key === initialSort)?.key;
  const [view, setView] = useState<"squad" | "stats">(startSort ? "stats" : "squad");
  const [line, setLine] = useState<PositionGroup | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>(startSort ?? "apps");
  const visible = rows.filter((r) => line === "ALL" || r.group === line);
  const col = COLUMNS.find((c) => c.key === sort)!;
  const sorted = [...visible].sort((a, b) => col.value(b) - col.value(a) || b.apps - a.apps || a.name.localeCompare(b.name));
  const layout = reduce ? false : true;

  return (
    <div className="sq">
      <div className="sq-controls">
        <div className="sq-tabs" role="tablist" aria-label="View">
          {(["squad", "stats"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "on" : undefined} onClick={() => setView(v)}>
              {v === "squad" ? "Squad" : "Stats"}
            </button>
          ))}
        </div>
        <div className="sq-filter" role="group" aria-label="Line">
          {[{ group: "ALL" as const, label: "All" }, ...LINES].map((l) => {
            const n = l.group === "ALL" ? rows.length : rows.filter((r) => r.group === l.group).length;
            return (
              <button key={l.group} type="button" aria-pressed={line === l.group} className={line === l.group ? "on" : undefined} onClick={() => setLine(l.group)} disabled={n === 0}>
                {l.label}
                <span>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {view === "squad" ? (
        <LayoutGroup>
          {LINES.filter((l) => line === "ALL" || l.group === line).map((l) => {
            const players = visible.filter((r) => r.group === l.group);
            if (!players.length) return null;
            return (
              <motion.section key={l.group} layout={layout} className="sq-line" aria-label={l.plural} transition={{ duration: 0.5, ease: EASE }}>
                <h2>
                  {l.plural} <span>{players.length}</span>
                </h2>
                <ul>
                  <AnimatePresence initial={false}>
                    {players.map((r, i) => (
                      <motion.li
                        key={r.id}
                        layout={layout}
                        initial={reduce ? false : { opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.5, ease: EASE, delay: Math.min(i, 8) * 0.03 }}
                      >
                        <Link href={r.href} className={`sq-player${r.apps ? "" : " sq-unused"}`}>
                          <Kit main={kit.main} trim={kit.trim} number={r.number} logo={kit.logo} className="sq-kit" />
                          <span className="sq-name">{r.name}</span>
                          <span className="sq-pos" title={r.positionName}>
                            {r.position}
                            {r.nickname && <> · “{r.nickname}”</>}
                          </span>
                          <span className="sq-mini">
                            {r.apps ? (
                              <>
                                <span>
                                  <b>{r.apps}</b> {r.apps === 1 ? "app" : "apps"}
                                </span>
                                <span>
                                  <b>{r.goals}</b> {r.goals === 1 ? "goal" : "goals"}
                                </span>
                                <span>
                                  <b>{Math.round(r.winPct)}%</b> won
                                </span>
                              </>
                            ) : (
                              <span>Yet to play</span>
                            )}
                          </span>
                        </Link>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.section>
            );
          })}
        </LayoutGroup>
      ) : (
        <div className="sq-stats">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="num" title={c.title} aria-sort={sort === c.key ? "descending" : undefined}>
                    <button type="button" className={sort === c.key ? "on" : undefined} onClick={() => setSort(c.key)}>
                      {c.label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <motion.tr key={r.id} layout={reduce ? false : "position"} transition={{ type: "spring", stiffness: 300, damping: 32 }} className={r.apps ? undefined : "sq-unused"}>
                  <td>
                    <Link href={r.href} className="sq-who">
                      <span className="sq-num">{r.number ?? "–"}</span>
                      <span>
                        {r.name}
                        <small>{r.position}</small>
                      </span>
                    </Link>
                  </td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className={`num${sort === c.key ? " on" : ""}`}>
                      {c.show ? c.show(r) : c.value(r)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* On a phone: one row per player with the stat you sorted by, big, on the right. */}
          <div className="sq-sort-phone">
            <label>
              Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ol className="sq-list">
            {sorted.map((r, i) => (
              <motion.li key={r.id} layout={reduce ? false : "position"} transition={{ type: "spring", stiffness: 300, damping: 32 }} className={r.apps ? undefined : "sq-unused"}>
                <Link href={r.href}>
                  <span className="sq-rank">{i + 1}</span>
                  <span className="sq-list-who">
                    {r.name}
                    <small>
                      {r.position} · {r.apps} {r.apps === 1 ? "app" : "apps"}
                    </small>
                  </span>
                  <b>{col.show ? col.show(r) : col.value(r)}</b>
                </Link>
              </motion.li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
