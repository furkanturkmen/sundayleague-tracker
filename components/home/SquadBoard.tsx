"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/I18n";
import { Kit } from "@/components/Kit";
import type { T } from "@/lib/i18n";
import type { PositionGroup } from "@/lib/types";

export interface SquadRow {
  id: string;
  href: string;
  name: string;
  nickname: string | null;
  number: number | null;
  photo: string | null;
  photoCutout: boolean;
  head: string | null;
  position: string;
  positionName: string;
  group: PositionGroup;
  /** Other lines the player can also play in, from their extra positions. */
  also: PositionGroup[];
  apps: number;
  goals: number;
  assists: number;
  motm: number;
  captain: number;
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

type SortKey = "apps" | "goals" | "assists" | "motm" | "captain" | "cleanSheets" | "winPct" | "cards";
// Labels and titles are English keys, translated where they're shown.
const COLUMNS: { key: SortKey; label: string; title: string; value: (r: SquadRow) => number; show?: (r: SquadRow, t: T) => string }[] = [
  { key: "apps", label: "Apps", title: "Appearances", value: (r) => r.apps },
  { key: "goals", label: "Goals", title: "Goals", value: (r) => r.goals },
  { key: "assists", label: "Assists", title: "Assists", value: (r) => r.assists },
  { key: "motm", label: "MOTM", title: "Man of the match", value: (r) => r.motm },
  { key: "captain", label: "Captain", title: "Matches as captain", value: (r) => r.captain },
  { key: "cleanSheets", label: "Clean sheets", title: "Clean sheets (keepers and defenders)", value: (r) => r.cleanSheets },
  { key: "winPct", label: "Win %", title: "Win rate when playing", value: (r) => r.winPct, show: (r) => (r.apps ? `${Math.round(r.winPct)}%` : "–") },
  { key: "cards", label: "Cards", title: "Yellow and red cards", value: (r) => r.yellows + r.reds * 2, show: (r, t) => (r.yellows + r.reds ? t("{y}Y {r}R", { y: r.yellows, r: r.reds }) : "0") },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The squad two ways. Squad: a shirt per player, grouped by line, with a filter that slides the others away.
 * Stats: one sortable table (a list of rows on a phone) whose rows glide to their new places on every sort.
 */
export function SquadBoard({ rows, kit, initialSort }: { rows: SquadRow[]; kit: { main: string; trim: string; logo: string | null }; initialSort?: string }) {
  const reduce = useReducedMotion();
  const t = useT();
  const startSort = COLUMNS.find((c) => c.key === initialSort)?.key;
  const [view, setView] = useState<"squad" | "stats">(startSort ? "stats" : "squad");
  const [line, setLine] = useState<PositionGroup | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>(startSort ?? "apps");
  // A line's filter also shows the players who can cover it, marked as such.
  const inLine = (r: SquadRow, g: PositionGroup) => r.group === g || r.also.includes(g);
  const visible = rows.filter((r) => line === "ALL" || inLine(r, line));
  const col = COLUMNS.find((c) => c.key === sort)!;
  const sorted = [...visible].sort((a, b) => col.value(b) - col.value(a) || b.apps - a.apps || a.name.localeCompare(b.name));
  const layout = reduce ? false : true;

  return (
    <div className="sq">
      <div className="sq-controls">
        <div className="sq-tabs" role="tablist" aria-label={t("View")}>
          {(["squad", "stats"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "on" : undefined} onClick={() => setView(v)}>
              {v === "squad" ? t("Squad") : t("Stats")}
            </button>
          ))}
        </div>
        <div className="sq-filter" role="group" aria-label={t("Line")}>
          {[{ group: "ALL" as const, label: t("All") }, ...LINES].map((l) => {
            const n = l.group === "ALL" ? rows.length : rows.filter((r) => inLine(r, l.group)).length;
            return (
              <button key={l.group} type="button" aria-pressed={line === l.group} className={line === l.group ? "on" : undefined} onClick={() => setLine(l.group)} disabled={n === 0}>
                {t(l.label)}
                <span>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {view === "squad" ? (
        <LayoutGroup>
          {LINES.filter((l) => line === "ALL" || l.group === line).map((l) => {
            const players = visible.filter((r) => r.group === l.group || line === l.group);
            if (!players.length) return null;
            return (
              <motion.section key={l.group} layout={layout} className="sq-line" aria-label={t(l.plural)} transition={{ duration: 0.5, ease: EASE }}>
                <h2>
                  {t(l.plural)} <span>{players.length}</span>
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
                          {r.head ? (
                            <Kit main={kit.main} trim={kit.trim} number={r.number} logo={kit.logo} head={r.head} className="sq-kit" t={t} />
                          ) : r.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.photo} alt="" loading="lazy" className={r.photoCutout ? "sq-kit sq-cutout" : "sq-kit sq-portrait"} />
                          ) : (
                            <Kit main={kit.main} trim={kit.trim} number={r.number} logo={kit.logo} className="sq-kit" t={t} />
                          )}
                          <span className="sq-name">{r.name}</span>
                          <span className="sq-pos" title={r.positionName}>
                            {r.position}
                            {r.group !== l.group && <> · {t("also {line}", { line: t(l.label) })}</>}
                            {r.nickname && <> · “{r.nickname}”</>}
                          </span>
                          <span className="sq-mini">
                            {r.apps ? (
                              <>
                                <span>
                                  <b>{r.apps}</b> {r.apps === 1 ? t("app") : t("apps")}
                                </span>
                                <span>
                                  <b>{r.goals}</b> {r.goals === 1 ? t("goal") : t("goals")}
                                </span>
                                <span>
                                  <b>{Math.round(r.winPct)}%</b> {t("won")}
                                </span>
                              </>
                            ) : (
                              <span>{t("Yet to play")}</span>
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
                <th>{t("Player")}</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="num" title={t(c.title)} aria-sort={sort === c.key ? "descending" : undefined}>
                    <button type="button" className={sort === c.key ? "on" : undefined} onClick={() => setSort(c.key)}>
                      {t(c.label)}
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
                      {c.show ? c.show(r, t) : c.value(r)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* On a phone: one row per player with the stat you sorted by, big, on the right. */}
          <div className="sq-sort-phone">
            <label>
              {t("Sort by")}
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {t(c.title)}
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
                      {r.position} · {r.apps} {r.apps === 1 ? t("app") : t("apps")}
                    </small>
                  </span>
                  <b>{col.show ? col.show(r, t) : col.value(r)}</b>
                </Link>
              </motion.li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
