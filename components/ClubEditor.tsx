"use client";

import { useActionState, useEffect, useState, type CSSProperties } from "react";
import { ImageField, Notice, PHOTO_HINT, PHOTO_PX, Submit } from "@/components/forms";
import { Crest } from "@/components/ui";
import type { FormState } from "@/lib/actions";
import { brighten, inkFor } from "@/lib/color";
import type { Club } from "@/lib/types";

type Action = (state: FormState, f: FormData) => Promise<FormState>;
/** A few players for the line-up strip in the preview: their name on the graphics and photo. */
export type PreviewPlayer = { id: string; name: string; photo: string | null };

const HEX = /^#[0-9a-f]{6}$/i;

/** A colour as a big swatch with its hex code, both editable, and which text colour reads on it. */
function ColourField({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="ce-colour">
      <label className="ce-swatch" style={{ background: value, color: inkFor(value) }}>
        <input type="color" name={name} value={value} onChange={(e) => onChange(e.target.value)} />
        <span>Aa</span>
      </label>
      <div className="ce-colour-text">
        <span className="ce-colour-label">{label}</span>
        <input
          aria-label={`${label}, hex code`}
          value={text}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            setText(v);
            if (HEX.test(v)) onChange(v.toLowerCase());
          }}
          onBlur={() => setText(value)}
        />
      </div>
    </div>
  );
}

/** The club header and a strip of the line-up graphic, drawn from what's in the form right now. */
function Preview({
  name,
  short,
  tagline,
  founded,
  accent,
  gold,
  logo,
  coach,
  coachPhoto,
  players,
}: {
  name: string;
  short: string;
  tagline: string;
  founded: string;
  accent: string;
  gold: string;
  logo: string | null;
  coach: string;
  coachPhoto: string | null;
  players: PreviewPlayer[];
}) {
  const bright = brighten(accent);
  const vars = { "--accent": accent, "--gold": gold, "--accent-ink": inkFor(accent), "--ce-bright": bright } as CSSProperties;
  return (
    <div className="ce-preview" style={vars} aria-label="Preview">
      <p className="ce-preview-label">Preview</p>
      <div className="ce-card ce-head">
        <Crest short={short || "?"} logo={logo} size={52} />
        <div>
          <strong>{name || "Your club"}</strong>
          {tagline && <p>{tagline}</p>}
          {founded && <small>Founded {founded}</small>}
        </div>
      </div>
      <div className="ce-card ce-graphic">
        <div className="ce-graphic-top">
          <span>{(name || "Your club").toUpperCase()} · MATCHDAY</span>
          <b>OPSTELLING</b>
        </div>
        <ul className="ce-graphic-players">
          {players.map((p) => (
            <li key={p.id}>
              <span className="ce-face">{p.photo ? <img src={p.photo} alt="" /> : p.name.charAt(0)}</span>
              {p.name}
            </li>
          ))}
        </ul>
        {coach.trim() ? (
          <div className="ce-graphic-coach">
            <div>
              <span>HOOFDTRAINER</span>
              <b>{coach.toUpperCase()}</b>
            </div>
            {coachPhoto && <img src={coachPhoto} alt="" />}
          </div>
        ) : (
          <p className="ce-graphic-none">No coach on the graphic.</p>
        )}
        <div className="ce-graphic-stripes" aria-hidden="true" />
      </div>
      <div className="ce-trim" aria-hidden="true">
        <span style={{ background: accent }} />
        <span style={{ background: gold }} />
      </div>
    </div>
  );
}

export function ClubEditor({ action, club, players }: { action: Action; club: Club; players: PreviewPlayer[] }) {
  const [state, formAction] = useActionState(action, {});
  const [name, setName] = useState(club.name);
  const [short, setShort] = useState(club.shortName);
  const [tagline, setTagline] = useState(club.tagline);
  const [founded, setFounded] = useState(club.founded ? String(club.founded) : "");
  const [accent, setAccent] = useState(club.accent);
  const [gold, setGold] = useState(club.gold);
  const [logo, setLogo] = useState(club.logo);
  const [coach, setCoach] = useState(club.coach.name ?? "");
  const [coachPhoto, setCoachPhoto] = useState(club.coach.photo);
  const [dirty, setDirty] = useState(false);

  // A save clears the bar; an error keeps the changes marked as unsaved.
  useEffect(() => {
    if (state.ok) setDirty(false);
  }, [state]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const changed = () => setDirty(true);

  return (
    <form action={formAction} className="form ce" onChange={changed}>
      <div className="ce-fields">
        <fieldset className="ce-group">
          <legend>Identity</legend>
          <label>
            Club name
            <input name="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="ce-pair">
            <label>
              Short name <span className="muted">(on the badge)</span>
              <input name="shortName" required maxLength={5} value={short} onChange={(e) => setShort(e.target.value.toUpperCase())} />
            </label>
            <label>
              Founded
              <input name="founded" type="number" min={1850} max={2100} value={founded} placeholder="2025" onChange={(e) => setFounded(e.target.value)} />
            </label>
          </div>
          <label>
            Tagline
            <input
              name="tagline"
              maxLength={120}
              value={tagline}
              placeholder="Sunday league. Every goal, every card, every excuse."
              onChange={(e) => setTagline(e.target.value)}
            />
          </label>
        </fieldset>

        <fieldset className="ce-group">
          <legend>Colours</legend>
          <p className="ce-note">The main colour lights up every page and the graphics. The trim edges the badge.</p>
          <div className="ce-colours">
            <ColourField name="accent" label="Main colour" value={accent} onChange={(v) => (setAccent(v), changed())} />
            <ColourField name="gold" label="Trim colour" value={gold} onChange={(v) => (setGold(v), changed())} />
          </div>
        </fieldset>

        <fieldset className="ce-group">
          <legend>Crest</legend>
          <ImageField
            name="logo"
            label={<>Logo <span className="muted">(PNG, JPG or SVG)</span></>}
            hint="Without one, the badge is a shield in your colours with the short name on it."
            initial={club.logo}
            maxPx={256}
            onChange={(v) => (setLogo(v), changed())}
          />
        </fieldset>

        <fieldset className="ce-group">
          <legend>Head coach</legend>
          <p className="ce-note">Shown on the line-up graphic. Leave the name empty to leave the coach off.</p>
          <label>
            Name
            <input name="coach" maxLength={40} value={coach} placeholder="e.g. Atakan" onChange={(e) => setCoach(e.target.value)} />
          </label>
          <ImageField
            name="coachPhoto"
            label="Photo"
            hint={PHOTO_HINT}
            initial={club.coach.photo}
            maxPx={PHOTO_PX}
            onChange={(v) => (setCoachPhoto(v), changed())}
          />
        </fieldset>
      </div>

      <Preview
        name={name}
        short={short}
        tagline={tagline}
        founded={founded}
        accent={accent}
        gold={gold}
        logo={logo}
        coach={coach}
        coachPhoto={coachPhoto}
        players={players}
      />

      <div className={`ce-save${dirty ? " dirty" : ""}`}>
        {dirty && !state.error ? <p>Unsaved changes</p> : <Notice state={state} />}
        <Submit className="hx-btn hx-btn-primary">Save club</Submit>
      </div>
    </form>
  );
}
