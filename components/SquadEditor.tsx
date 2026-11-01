"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { ImageField, Notice, PHOTO_PX, PLAYER_PHOTO_HINT, Submit } from "@/components/forms";
import { useT } from "@/components/I18n";
import type { FormState } from "@/lib/actions";
import { graphicName } from "@/lib/lineup";
import { POSITION_LINES, POSITION_NAMES, positionGroup, type Player, type Position } from "@/lib/types";

type Action = (state: FormState, f: FormData) => Promise<FormState>;

// The squad in settings: players by line like the squad page, each row opening in place to edit, and the position
// picked by tapping it on a pitch instead of from a long dropdown.

/** Where each position stands on the picker's pitch, in percent, attacking upwards. */
const SPOTS: { pos: Position; x: number; y: number }[] = [
  { pos: "ST", x: 50, y: 9 },
  { pos: "LW", x: 14, y: 17 },
  { pos: "RW", x: 86, y: 17 },
  { pos: "CF", x: 50, y: 21 },
  { pos: "CAM", x: 50, y: 35 },
  { pos: "LM", x: 12, y: 45 },
  { pos: "CM", x: 50, y: 49 },
  { pos: "RM", x: 88, y: 45 },
  { pos: "LWB", x: 12, y: 62 },
  { pos: "CDM", x: 50, y: 63 },
  { pos: "RWB", x: 88, y: 62 },
  { pos: "LB", x: 18, y: 78 },
  { pos: "CB", x: 50, y: 80 },
  { pos: "RB", x: 82, y: 78 },
  { pos: "GK", x: 50, y: 93 },
];
const ANY: { pos: Position; label: string }[] = [
  { pos: "DEF", label: "Any defender" },
  { pos: "MID", label: "Any midfielder" },
  { pos: "FWD", label: "Any forward" },
];

const MARKINGS = (
  <svg viewBox="0 0 100 125" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="0.5">
      <rect x="1" y="1" width="98" height="123" rx="1" />
      <line x1="1" y1="62.5" x2="99" y2="62.5" />
      <circle cx="50" cy="62.5" r="11" />
      <rect x="22" y="1" width="56" height="17" />
      <rect x="36" y="1" width="28" height="6" />
      <rect x="22" y="107" width="56" height="17" />
      <rect x="36" y="118" width="28" height="6" />
    </g>
  </svg>
);

/**
 * The main position as radio buttons laid out on a pitch (lit through :has(:checked) in the CSS), and in the second
 * mode up to two more positions toggled on the same pitch. A third extra replaces the oldest.
 */
export function PositionPicker({ defaultValue, defaultExtra = [] }: { defaultValue: Position; defaultExtra?: Position[] }) {
  const t = useT();
  const [pos, setPos] = useState<Position>(defaultValue);
  const [extra, setExtra] = useState<Position[]>(defaultExtra);
  const [mode, setMode] = useState<"main" | "extra">("main");
  const pickMain = (p: Position) => {
    setPos(p);
    setExtra((x) => x.filter((e) => e !== p));
  };
  const toggleExtra = (p: Position) => setExtra((x) => (x.includes(p) ? x.filter((e) => e !== p) : [...x, p].slice(-2)));
  const radio = (p: Position) => <input type="radio" name="position" value={p} checked={p === pos} onChange={() => pickMain(p)} className="sr-only" />;

  return (
    <fieldset className={`pp pp-${mode}`}>
      <legend>{t("Position")}</legend>
      <div className="pp-mode" role="group" aria-label={t("What to pick")}>
        <button type="button" aria-pressed={mode === "main"} onClick={() => setMode("main")}>
          {t("Main position")}
        </button>
        <button type="button" aria-pressed={mode === "extra"} onClick={() => setMode("extra")}>
          {t("Also plays")} <span>{extra.length}/2</span>
        </button>
      </div>
      {mode === "extra" && <input type="hidden" name="position" value={pos} />}
      {extra.map((e) => (
        <input key={e} type="hidden" name="extra" value={e} />
      ))}
      {mode === "main" && (
        <div className="pp-any">
          {ANY.map((a) => (
            <label key={a.pos} className="pp-chip">
              {radio(a.pos)}
              {t(a.label)}
            </label>
          ))}
        </div>
      )}
      <div className="pp-pitch">
        {MARKINGS}
        {SPOTS.map((s) => {
          const style = { left: `${s.x}%`, top: `${s.y}%` };
          const cls = `pp-spot${s.pos === pos ? " main" : ""}${extra.includes(s.pos) ? " extra" : ""}`;
          const label = (
            <>
              <span aria-hidden="true">{s.pos}</span>
              <span className="sr-only">{t(POSITION_NAMES[s.pos])}</span>
            </>
          );
          return mode === "main" ? (
            <label key={s.pos} className={cls} style={style} title={t(POSITION_NAMES[s.pos])}>
              {radio(s.pos)}
              {label}
            </label>
          ) : (
            <button
              key={s.pos}
              type="button"
              className={cls}
              style={style}
              title={s.pos === pos ? t("Main position") : t(POSITION_NAMES[s.pos])}
              aria-pressed={extra.includes(s.pos)}
              disabled={s.pos === pos}
              onClick={() => toggleExtra(s.pos)}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="pp-now" aria-live="polite">
        <b>{pos}</b> {t(POSITION_NAMES[pos])}
        {extra.length > 0 && <span> · {t("also {positions}", { positions: extra.join(", ") })}</span>}
        {mode === "extra" && extra.length === 0 && <span> · {t("tap up to two more")}</span>}
      </p>
    </fieldset>
  );
}

/** Add or edit one player. Without a player it's the short add form: name, number, nickname and position. */
function PlayerForm({
  player,
  squad,
  save,
  onSaved,
  onCancel,
}: {
  player?: Player;
  squad: Player[];
  save: Action;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [state, formAction] = useActionState(save, {});
  const ids = useId();
  useEffect(() => {
    if (state.ok) onSaved(state.ok);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="form se-form">
      {player && <input type="hidden" name="id" value={player.id} />}
      <div className="se-fields">
        <div className="se-pair">
          <label>
            {t("Name")}
            <input name="name" required maxLength={60} defaultValue={player?.name} autoFocus={!player} />
          </label>
          <label>
            {t("No.")}
            <input name="number" type="number" min={0} max={999} defaultValue={player?.number ?? ""} />
          </label>
        </div>
        <label>
          {t("Nickname")} <span className="muted">{t("(optional)")}</span>
          <input name="nickname" maxLength={40} defaultValue={player?.nickname ?? ""} />
        </label>
        {player && (
          <>
            <label>
              {t("Name on graphics")} <span className="muted">{t("(optional)")}</span>
              <input
                name="displayName"
                maxLength={16}
                defaultValue={player.displayName ?? ""}
                placeholder={graphicName(player, squad)}
                style={{ textTransform: "uppercase" }}
              />
            </label>
            <label>
              {t("Bio")} <span className="muted">{t("(optional)")}</span>
              <textarea name="bio" maxLength={300} rows={3} defaultValue={player.bio ?? ""} />
            </label>
            <ImageField name="photo" label={t("Photo")} hint={t(PLAYER_PHOTO_HINT)} initial={player.photo} maxPx={PHOTO_PX} cutout />
            <label className="check se-active" htmlFor={`${ids}-active`}>
              <input id={`${ids}-active`} type="checkbox" name="active" defaultChecked={player.active} />
              <span>
                {t("Active")}
                <small>{t("Inactive players keep their stats but don't show up when you log a match.")}</small>
              </span>
            </label>
          </>
        )}
      </div>
      <PositionPicker defaultValue={player?.position ?? "MID"} defaultExtra={player?.extraPositions} />
      <div className="se-actions">
        <Notice state={state.error ? state : {}} />
        <Submit className="btn btn-primary">{player ? t("Save") : t("Add to squad")}</Submit>
        <button type="button" className="btn-link" onClick={onCancel}>
          {t("Cancel")}
        </button>
      </div>
    </form>
  );
}

function RemovePlayer({ player, remove }: { player: Player; remove: Action }) {
  const t = useT();
  const [state, formAction] = useActionState(remove, {});
  return (
    <form action={formAction} className="se-remove">
      <input type="hidden" name="id" value={player.id} />
      <Submit className="btn-link danger" pending={t("Removing…")}>
        {t("Remove {name} from the club", { name: player.name })}
      </Submit>
      <Notice state={state} />
    </form>
  );
}

function SquadRow({ player, squad, save, remove }: { player: Player; squad: Player[]; save: Action; remove: Action }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState("");
  const panel = useId();
  return (
    <li className={`se-row${open ? " open" : ""}${player.active ? "" : " off"}`}>
      <button
        type="button"
        className="se-head"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => {
          setOpen(!open);
          setSaved("");
        }}
      >
        <span className="se-no">{player.number ?? "–"}</span>
        <span className="se-name">
          {player.name}
          {player.nickname && <small>{player.nickname}</small>}
        </span>
        <span className="se-pos">
          <b>{player.position}</b>
          {player.extraPositions.map((x) => (
            <i key={x}>{x}</i>
          ))}
          <span>{t(POSITION_NAMES[player.position])}</span>
        </span>
        <span className="se-edit">{saved ? <em role="status">{t("Saved")}</em> : open ? t("Close") : t("Edit")}</span>
      </button>
      {open && (
        <div className="se-panel" id={panel}>
          <PlayerForm
            player={player}
            squad={squad}
            save={save}
            onSaved={() => {
              setOpen(false);
              setSaved("Saved");
            }}
            onCancel={() => setOpen(false)}
          />
          <RemovePlayer player={player} remove={remove} />
        </div>
      )}
    </li>
  );
}

function AddPlayer({ squad, save }: { squad: Player[]; save: Action }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  const [added, setAdded] = useState("");
  return (
    <div className="se-add">
      <div className="se-bar">
        <p>
          {t("{n} active", { n: squad.filter((p) => p.active).length })}
          {squad.some((p) => !p.active) && <span> · {t("{n} not active", { n: squad.filter((p) => !p.active).length })}</span>}
        </p>
        {added && !open && (
          <p className="se-added" role="status">
            {added}
          </p>
        )}
        {!open && (
          <button type="button" className="hx-btn hx-btn-primary" onClick={() => setOpen(true)}>
            {t("Add a player")}
          </button>
        )}
      </div>
      {open && (
        <div className="se-panel se-panel-new">
          {added && (
            <p className="notice notice-ok" role="status">
              {added} {t("Add the next one, or close.")}
            </p>
          )}
          {/* A fresh form after each add, so the fields and the pitch start empty again. */}
          <PlayerForm
            key={round}
            squad={squad}
            save={save}
            onSaved={(m) => {
              setAdded(m);
              setRound(round + 1);
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export function SquadEditor({ players, save, remove }: { players: Player[]; save: Action; remove: Action }) {
  const t = useT();
  const byNumber = (a: Player, b: Player) => (a.number ?? 1000) - (b.number ?? 1000) || a.name.localeCompare(b.name);
  const active = players.filter((p) => p.active);
  const inactive = players.filter((p) => !p.active).sort(byNumber);
  const row = (p: Player) => <SquadRow key={p.id} player={p} squad={players} save={save} remove={remove} />;

  return (
    <div className="se">
      <AddPlayer squad={players} save={save} />
      {POSITION_LINES.map((line) => {
        const list = active.filter((p) => positionGroup(p.position) === line.group).sort(byNumber);
        if (!list.length) return null;
        return (
          <section key={line.group} className="se-line" aria-labelledby={`se-${line.group}`}>
            <h3 id={`se-${line.group}`}>
              {line.group === "GK" ? t("Goalkeepers") : t(line.label)} <span>{list.length}</span>
            </h3>
            <ul className="se-list">{list.map(row)}</ul>
          </section>
        );
      })}
      {inactive.length > 0 && (
        <details className="se-line se-inactive">
          <summary>
            <h3>
              {t("Not active")} <span>{inactive.length}</span>
            </h3>
            <p>{t("They keep their stats but don't show up when you log a match.")}</p>
          </summary>
          <ul className="se-list">{inactive.map(row)}</ul>
        </details>
      )}
    </div>
  );
}
