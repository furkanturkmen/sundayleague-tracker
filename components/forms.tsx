"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Crest } from "@/components/ui";
import type { FormState } from "@/lib/actions";
import { inkFor } from "@/lib/color";
import { POSITIONS, type Club, type Player } from "@/lib/types";

type Action = (state: FormState, f: FormData) => Promise<FormState>;

export function Submit({ children, className = "btn", pending: pendingLabel }: { children: ReactNode; className?: string; pending?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}

export function Notice({ state }: { state: FormState }) {
  if (state.error) return <p className="notice notice-error" role="alert">{state.error}</p>;
  if (state.ok) return <p className="notice notice-ok" role="status">{state.ok}</p>;
  return null;
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

const LOGO_PX = 256;

/** Draws the picked image onto a canvas no bigger than LOGO_PX, so uploads stay small whatever the source. */
async function shrinkLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // SVGs without width/height decode at 0×0; give them a square to fill.
    const w = img.naturalWidth || LOGO_PX;
    const h = img.naturalHeight || LOGO_PX;
    const scale = Math.min(1, LOGO_PX / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL("image/webp", 0.9);
    // Safari can't encode WebP and quietly hands back a PNG instead.
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function LogoField({ initial, onChange }: { initial: string | null; onChange: (preview: string | null) => void }) {
  const [value, setValue] = useState("");
  const [has, setHas] = useState(Boolean(initial));
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="logo-field">
      <span className="logo-field-label">
        Logo <span className="muted">(optional, PNG, JPG or SVG)</span>
      </span>
      <input type="hidden" name="logo" value={value} />
      <div className="logo-field-actions">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError("");
            if (file.size > 5_000_000) {
              setError("That file is over 5 MB. Pick a smaller one.");
              return;
            }
            try {
              const data = await shrinkLogo(file);
              setValue(data);
              setHas(true);
              onChange(data);
            } catch {
              setError("Couldn't read that image. Try a PNG or JPG.");
            }
          }}
        />
        {has && (
          <button
            type="button"
            className="btn-link danger"
            onClick={() => {
              setValue(initial ? "remove" : "");
              setHas(false);
              onChange(null);
              if (input.current) input.current.value = "";
            }}
          >
            Remove logo
          </button>
        )}
      </div>
      {error ? (
        <p className="notice notice-error" role="alert">{error}</p>
      ) : (
        <p className="small muted">Without one, the badge is a shield in your colours with the short name on it.</p>
      )}
    </div>
  );
}

function initials(name: string) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((w) => (/^\d+$/.test(w) ? w : w[0])).join("") : (words[0] ?? "")).slice(0, 4).toUpperCase();
}

// ---------- club ----------

export function ClubForm({ action, club }: { action: Action; club?: Club }) {
  const [state, formAction] = useActionState(action, {});
  const [name, setName] = useState(club?.name ?? "");
  const [short, setShort] = useState(club?.shortName ?? "");
  const [shortTouched, setShortTouched] = useState(Boolean(club));
  const [slug, setSlug] = useState(club?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(club));
  const [accent, setAccent] = useState(club?.accent ?? "#17663f");
  const [gold, setGold] = useState(club?.gold ?? "#b07d0c");
  const [logo, setLogo] = useState(club?.logo ?? null);
  const creating = !club;

  return (
    <form action={formAction} className="form">
      <div className="club-preview" style={{ ["--accent" as string]: accent, ["--gold" as string]: gold, ["--accent-ink" as string]: inkFor(accent) }}>
        <Crest short={short || "?"} logo={logo} size={56} />
        <div>
          <strong>{name || "Your club"}</strong>
          {creating && <div className="small muted">/c/{slug || "your-club"}</div>}
        </div>
      </div>

      <label>
        Club name
        <input
          name="name"
          required
          maxLength={60}
          value={name}
          placeholder="e.g. Sunday Rovers"
          onChange={(e) => {
            setName(e.target.value);
            if (!shortTouched) setShort(initials(e.target.value));
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
      </label>
      <div className="form-row">
        <label>
          Short name <span className="muted">(badge)</span>
          <input
            name="shortName"
            required
            maxLength={5}
            value={short}
            onChange={(e) => {
              setShortTouched(true);
              setShort(e.target.value.toUpperCase());
            }}
          />
        </label>
        <label>
          Founded
          <input name="founded" type="number" min={1850} max={2100} defaultValue={club?.founded ?? ""} placeholder="2025" />
        </label>
      </div>
      {creating && (
        <label>
          Web address
          <div className="input-prefix">
            <span>/c/</span>
            <input
              name="slug"
              required
              maxLength={40}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
            />
          </div>
        </label>
      )}
      <label>
        Tagline
        <input name="tagline" maxLength={120} defaultValue={club?.tagline ?? ""} placeholder="Sunday league. Every goal, every card, every excuse." />
      </label>
      <div className="form-row">
        <label>
          Main colour
          <input type="color" name="accent" value={accent} onChange={(e) => setAccent(e.target.value)} />
        </label>
        <label>
          Trim colour
          <input type="color" name="gold" value={gold} onChange={(e) => setGold(e.target.value)} />
        </label>
      </div>
      <LogoField initial={club?.logo ?? null} onChange={setLogo} />

      {creating && (
        <fieldset>
          <legend>Admin password</legend>
          <p className="small muted">Anyone can view the club. Whoever has this password can add players and results, so share it only with whoever runs the stats.</p>
          <div className="form-row">
            <label>
              Password
              <input type="password" name="password" required minLength={6} autoComplete="new-password" />
            </label>
            <label>
              Confirm
              <input type="password" name="confirm" required minLength={6} autoComplete="new-password" />
            </label>
          </div>
        </fieldset>
      )}

      <Notice state={state} />
      <Submit>{creating ? "Create club" : "Save settings"}</Submit>
    </form>
  );
}

export function PasswordForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  const ref = useResetOnOk(state);
  return (
    <form action={formAction} className="form" ref={ref}>
      <label>
        Current password
        <input type="password" name="current" required autoComplete="current-password" />
      </label>
      <div className="form-row">
        <label>
          New password
          <input type="password" name="password" required minLength={6} autoComplete="new-password" />
        </label>
        <label>
          Confirm
          <input type="password" name="confirm" required minLength={6} autoComplete="new-password" />
        </label>
      </div>
      <Notice state={state} />
      <Submit>Change password</Submit>
    </form>
  );
}

export function LoginForm({ action, next }: { action: Action; next?: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="form">
      <input type="hidden" name="next" value={next ?? ""} />
      <label>
        Admin password
        <input type="password" name="password" required autoFocus autoComplete="current-password" />
      </label>
      <Notice state={state} />
      <Submit pending="Signing in…">Sign in</Submit>
    </form>
  );
}

export function DeleteClubForm({ action, name }: { action: Action; name: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="form">
      <label>
        Type <strong>{name}</strong> to delete the club, its players and every result. This can&apos;t be undone.
        <input name="confirm" autoComplete="off" />
      </label>
      <Notice state={state} />
      <Submit className="btn btn-danger" pending="Deleting…">Delete club</Submit>
    </form>
  );
}

// ---------- players ----------

function useResetOnOk(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function AddPlayerForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  const ref = useResetOnOk(state);
  return (
    <form action={formAction} className="form" ref={ref}>
      <div className="form-row form-row-player">
        <label>
          Name
          <input name="name" required maxLength={60} />
        </label>
        <label>
          No.
          <input name="number" type="number" min={0} max={999} />
        </label>
        <label>
          Position
          <select name="position" defaultValue="MID">
            {POSITIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Nickname
          <input name="nickname" maxLength={40} />
        </label>
      </div>
      <Notice state={state} />
      <Submit>Add player</Submit>
    </form>
  );
}

export function EditPlayerRow({ player, save, remove }: { player: Player; save: Action; remove: Action }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(save, {});
  const [delState, deleteAction] = useActionState(remove, {});

  return (
    <li className="squad-row">
      <div className="squad-row-head">
        <span className="muted num" style={{ width: 28 }}>{player.number ?? "–"}</span>
        <strong style={{ opacity: player.active ? 1 : 0.5 }}>{player.name}</strong>
        <span className="chip">{player.position}</span>
        {!player.active && <span className="chip">Inactive</span>}
        <button type="button" className="btn-link" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Close" : "Edit"}
        </button>
      </div>
      {open && (
        <div className="squad-row-body">
          <form action={formAction} className="form">
            <input type="hidden" name="id" value={player.id} />
            <div className="form-row form-row-player">
              <label>
                Name
                <input name="name" required maxLength={60} defaultValue={player.name} />
              </label>
              <label>
                No.
                <input name="number" type="number" min={0} max={999} defaultValue={player.number ?? ""} />
              </label>
              <label>
                Position
                <select name="position" defaultValue={player.position}>
                  {POSITIONS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                Nickname
                <input name="nickname" maxLength={40} defaultValue={player.nickname ?? ""} />
              </label>
            </div>
            <label>
              Bio
              <textarea name="bio" maxLength={300} rows={2} defaultValue={player.bio ?? ""} />
            </label>
            <label className="check">
              <input type="checkbox" name="active" defaultChecked={player.active} /> Active (shows up when logging matches)
            </label>
            <Notice state={state} />
            <div className="form-actions">
              <Submit>Save</Submit>
            </div>
          </form>
          <form action={deleteAction} className="form-inline">
            <input type="hidden" name="id" value={player.id} />
            <Submit className="btn-link danger" pending="Removing…">Delete player</Submit>
            <Notice state={delState} />
          </form>
        </div>
      )}
    </li>
  );
}

// ---------- moments ----------

export function MomentForm({ action, players, matches }: { action: Action; players: Player[]; matches: { id: string; label: string }[] }) {
  const [state, formAction] = useActionState(action, {});
  const ref = useResetOnOk(state);
  return (
    <form action={formAction} className="form" ref={ref}>
      <div className="form-row">
        <label>
          Hall
          <select name="kind" defaultValue="fame">
            <option value="fame">Hall of Fame</option>
            <option value="shame">Hall of Shame</option>
          </select>
        </label>
        <label>
          Player <span className="muted">(optional)</span>
          <select name="player" defaultValue="">
            <option value="">–</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label>
          Match <span className="muted">(optional)</span>
          <select name="match" defaultValue="">
            <option value="">–</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Title
        <input name="title" required maxLength={80} placeholder="e.g. The penalty that's still going" />
      </label>
      <label>
        Story
        <textarea name="story" maxLength={600} rows={3} />
      </label>
      <Notice state={state} />
      <Submit>Add moment</Submit>
    </form>
  );
}

/** Submit button that asks before doing something destructive. */
export function ConfirmSubmit({ children, message, className = "btn btn-danger" }: { children: ReactNode; message: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "Deleting…" : children}
    </button>
  );
}
