"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Notice, Submit } from "@/components/forms";
import { useLang, useT } from "@/components/I18n";
import { homeVenue } from "@/lib/i18n/nl-matches";
import type { FormState, MatchPayload } from "@/lib/actions";
import type { Match, Player } from "@/lib/types";

type Action = (state: FormState, f: FormData) => Promise<FormState>;

interface Props {
  action: Action;
  players: Player[];
  match?: Match;
  opponents: string[];
  competitions: string[];
}

function PlayerSelect({ options, value, onChange, extra, label }: { options: Player[]; value: string; onChange: (v: string) => void; extra?: ReactNode; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{label}</option>
      {extra}
      {options.map((pl) => (
        <option key={pl.id} value={pl.id}>{pl.name}</option>
      ))}
    </select>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

function fromMatch(m?: Match): MatchPayload {
  return {
    id: m?.id,
    date: m?.date ?? today(),
    opponent: m?.opponent ?? "",
    venue: m?.venue ?? "H",
    competition: m?.competition ?? "League",
    played: m ? m.against !== null : true,
    against: m?.against ?? 0,
    squad: m?.squad ?? [],
    goals: (m?.goals ?? []).map((g) => ({ scorer: g.scorer, assist: g.assist ?? "", minute: g.minute?.toString() ?? "", penalty: Boolean(g.penalty) })),
    cards: m?.cards ?? [],
    ownGoals: m?.ownGoals ?? [],
    penaltiesMissed: m?.penaltiesMissed ?? [],
    motm: m?.motm ?? "",
    notes: m?.notes ?? "",
  };
}

export function MatchForm({ action, players, match, opponents, competitions }: Props) {
  const [state, formAction] = useActionState(action, {});
  const [p, setP] = useState<MatchPayload>(() => fromMatch(match));
  const t = useT();
  const lang = useLang();
  const set = <K extends keyof MatchPayload>(key: K, value: MatchPayload[K]) => setP((prev) => ({ ...prev, [key]: value }));

  // Inactive players stay selectable if they're already in this match.
  const pickable = players.filter((pl) => pl.active || p.squad.includes(pl.id));
  const inSquad = pickable.filter((pl) => p.squad.includes(pl.id));
  const options = inSquad.length ? inSquad : pickable;

  const toggle = (id: string) => set("squad", p.squad.includes(id) ? p.squad.filter((x) => x !== id) : [...p.squad, id]);


  const listEditor = (key: "ownGoals" | "penaltiesMissed", label: string) => (
    <div className="repeat">
      {p[key].map((id, i) => (
        <div className="repeat-row" key={i}>
          <PlayerSelect options={options} label={t("Player")} value={id} onChange={(v) => set(key, p[key].map((x, j) => (j === i ? v : x)))} />
          <button type="button" className="btn-link danger" onClick={() => set(key, p[key].filter((_, j) => j !== i))}>{t("Remove")}</button>
        </div>
      ))}
      <button type="button" className="btn-link" onClick={() => set(key, [...p[key], ""])}>+ {label}</button>
    </div>
  );

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="payload" value={JSON.stringify(p)} />

      <div className="card form">
        <div className="form-row">
          <label>
            {t("Date")}
            <input type="date" required value={p.date} onChange={(e) => set("date", e.target.value)} />
          </label>
          <label>
            {t("Opponent")}
            <input required maxLength={80} list="opponents" value={p.opponent} onChange={(e) => set("opponent", e.target.value)} />
            <datalist id="opponents">{opponents.map((o) => <option key={o} value={o} />)}</datalist>
          </label>
        </div>
        <div className="form-row">
          <label>
            {t("Venue")}
            <select value={p.venue} onChange={(e) => set("venue", e.target.value as "H" | "A")}>
              <option value="H">{homeVenue(lang)}</option>
              <option value="A">{t("Away")}</option>
            </select>
          </label>
          <label>
            {t("Competition")}
            <input maxLength={40} list="competitions" value={p.competition} onChange={(e) => set("competition", e.target.value)} />
            <datalist id="competitions">{["League", "Cup", "Friendly", ...competitions].filter((c, i, a) => a.indexOf(c) === i).map((c) => <option key={c} value={c} />)}</datalist>
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={p.played} onChange={(e) => set("played", e.target.checked)} /> {t("Played (untick for an upcoming fixture)")}
        </label>
      </div>

      {p.played && (
        <>
          <div className="card form">
            <h2>{t("Score")}</h2>
            <div className="score-entry">
              <div>
                {match?.goalsFor !== undefined ? (
                  <>
                    <div className="score-num">{match.goalsFor}</div>
                    <div className="small muted">
                      {t("Scored, from voetbal.nl. {n} of {total} have a scorer.", { n: Math.min(p.goals.length, match.goalsFor), total: match.goalsFor })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="score-num">{p.goals.length}</div>
                    <div className="small muted">{t("Scored (from the goals below)")}</div>
                  </>
                )}
              </div>
              <span className="score-dash">–</span>
              <label>
                <input type="number" min={0} max={99} required value={p.against ?? 0} onChange={(e) => set("against", e.target.value === "" ? null : Number(e.target.value))} className="score-input" />
                <span className="small muted">{t("Conceded")}</span>
              </label>
            </div>
          </div>

          <div className="card form">
            <h2>
              {t("Squad")} <span className="small muted">{t("{n} picked", { n: p.squad.length })}</span>
            </h2>
            {pickable.length === 0 ? (
              <p className="muted">{t("Add players in Settings first.")}</p>
            ) : (
              <div className="squad-picker">
                {pickable.map((pl) => (
                  <label key={pl.id} className={`pick${p.squad.includes(pl.id) ? " on" : ""}`}>
                    <input type="checkbox" checked={p.squad.includes(pl.id)} onChange={() => toggle(pl.id)} />
                    <span className="muted small">{pl.number ?? ""}</span> {pl.name}
                  </label>
                ))}
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn-link" onClick={() => set("squad", pickable.filter((pl) => pl.active).map((pl) => pl.id))}>{t("Select all active")}</button>
              <button type="button" className="btn-link" onClick={() => set("squad", [])}>{t("Clear")}</button>
            </div>
          </div>

          <div className="card form">
            <h2>{t("Goals")}</h2>
            <div className="repeat">
              {p.goals.map((g, i) => {
                const update = (patch: Partial<MatchPayload["goals"][number]>) => set("goals", p.goals.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div className="repeat-row" key={i}>
                    <PlayerSelect options={options} label={t("Scorer")} value={g.scorer} onChange={(v) => update({ scorer: v })} extra={<option value="og">{t("Opponent own goal")}</option>} />
                    <PlayerSelect options={options} label={t("Assist (none)")} value={g.assist} onChange={(v) => update({ assist: v })} />
                    <input type="number" min={0} max={130} placeholder={t("Min")} aria-label={t("Minute")} value={g.minute} onChange={(e) => update({ minute: e.target.value })} className="minute-input" />
                    <label className="check">
                      <input type="checkbox" checked={g.penalty} onChange={(e) => update({ penalty: e.target.checked })} /> {t("Pen")}
                    </label>
                    <button type="button" className="btn-link danger" onClick={() => set("goals", p.goals.filter((_, j) => j !== i))}>{t("Remove")}</button>
                  </div>
                );
              })}
              <button type="button" className="btn-link" onClick={() => set("goals", [...p.goals, { scorer: "", assist: "", minute: "", penalty: false }])}>+ {t("Add goal")}</button>
            </div>
          </div>

          <div className="card form">
            <h2>{t("Cards")}</h2>
            <div className="repeat">
              {p.cards.map((c, i) => (
                <div className="repeat-row" key={i}>
                  <PlayerSelect options={options} label={t("Player")} value={c.player} onChange={(v) => set("cards", p.cards.map((x, j) => (j === i ? { ...x, player: v } : x)))} />
                  <select value={c.type} onChange={(e) => set("cards", p.cards.map((x, j) => (j === i ? { ...x, type: e.target.value as "Y" | "R" } : x)))} aria-label={t("Card")}>
                    <option value="Y">{t("Yellow")}</option>
                    <option value="R">{t("Red")}</option>
                  </select>
                  <button type="button" className="btn-link danger" onClick={() => set("cards", p.cards.filter((_, j) => j !== i))}>{t("Remove")}</button>
                </div>
              ))}
              <button type="button" className="btn-link" onClick={() => set("cards", [...p.cards, { player: "", type: "Y" }])}>+ {t("Add card")}</button>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card form">
              <h2>{t("Own goals")}</h2>
              <p className="small muted">{t("Ours, into our own net. These count towards goals conceded.")}</p>
              {listEditor("ownGoals", t("Add own goal"))}
            </div>
            <div className="card form">
              <h2>{t("Missed penalties")}</h2>
              {listEditor("penaltiesMissed", t("Add missed penalty"))}
            </div>
          </div>

          <div className="card form">
            <label>
              {t("Man of the Match")}
              <PlayerSelect options={options} label={t("None")} value={p.motm} onChange={(v) => set("motm", v)} />
            </label>
          </div>
        </>
      )}

      <div className="card form">
        <label>
          {t("Notes")}
          <textarea rows={3} maxLength={1000} value={p.notes} onChange={(e) => set("notes", e.target.value)} placeholder={t("Anything worth remembering")} />
        </label>
      </div>

      <Notice state={state} />
      <div className="form-actions">
        <Submit>{match ? t("Save match") : t("Add match")}</Submit>
      </div>
    </form>
  );
}
