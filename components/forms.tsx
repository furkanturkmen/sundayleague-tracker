"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions";

type Action = (state: FormState, f: FormData) => Promise<FormState>;

export function Submit({
  children,
  className = "btn",
  pending: pendingLabel,
  name,
  value,
}: {
  children: ReactNode;
  className?: string;
  pending?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}

export function Notice({ state }: { state: FormState }) {
  if (state.error) return <p className="notice notice-error" role="alert">{state.error}</p>;
  if (state.ok) return <p className="notice notice-ok" role="status">{state.ok}</p>;
  return null;
}

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

/**
 * Draws the picked image onto a canvas no bigger than maxPx, so uploads stay small whatever the source.
 * Always PNG or JPEG: the social graphics are drawn by a renderer that can't read WebP. JPEGs stay JPEG
 * (smaller); anything that might have transparency, like a cut-out photo or a crest, becomes PNG.
 */
export async function shrinkImage(file: File, maxPx: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // SVGs without width/height decode at 0×0; give them a square to fill.
    const w = img.naturalWidth || maxPx;
    const h = img.naturalHeight || maxPx;
    const scale = Math.min(1, maxPx / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return file.type === "image/jpeg" ? canvas.toDataURL("image/jpeg", 0.88) : canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** File picker that sends a shrunk data URL in `name`, "remove" to clear the saved image, or nothing to keep it. */
export function ImageField({
  name,
  label,
  hint,
  initial,
  maxPx,
  onChange,
}: {
  name: string;
  label: ReactNode;
  hint: ReactNode;
  initial: string | null;
  maxPx: number;
  onChange?: (preview: string | null) => void;
}) {
  const [value, setValue] = useState("");
  const [has, setHas] = useState(Boolean(initial));
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="logo-field">
      <span className="logo-field-label">{label}</span>
      <input type="hidden" name={name} value={value} />
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
              const data = await shrinkImage(file, maxPx);
              setValue(data);
              setHas(true);
              onChange?.(data);
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
              onChange?.(null);
              if (input.current) input.current.value = "";
            }}
          >
            Remove
          </button>
        )}
      </div>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : <p className="small muted">{hint}</p>}
    </div>
  );
}

// Big enough for a 160px card at 2x and the round bench photos.
export const PHOTO_PX = 480;
export const PHOTO_HINT = "For the line-up graphic. A cut-out on a transparent background (PNG) looks best; a normal photo works too.";

export function initials(name: string) {
  const all = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  // "AFC DWS 2" → "DWS": the club type and the team number say little on a badge.
  const core = all.filter((w) => !/^(afc|avv|asv|sv|vv|vvv|rksv|rkav|fc|sc|\d+)$/i.test(w));
  if (core.length === 1 && core[0].length <= 5) return core[0].toUpperCase();
  const words = core.length ? core : all;
  return (words.length > 1 ? words.map((w) => (/^\d+$/.test(w) ? w : w[0])).join("") : (words[0] ?? "")).slice(0, 4).toUpperCase();
}

// ---------- club ----------

export function LoginForm({ action, next }: { action: Action; next?: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="form">
      <input type="hidden" name="next" value={next ?? ""} />
      <label>
        Password
        <input type="password" name="password" required autoFocus autoComplete="current-password" />
      </label>
      <Notice state={state} />
      <Submit pending="Signing in…">Sign in</Submit>
    </form>
  );
}

// ---------- voetbal.nl ----------

export function AddLineupPlayer({ action, name, matches }: { action: Action; name: string; matches: number }) {
  const [state, formAction] = useActionState(action, {});
  if (state.ok) return null;
  return (
    <li className="squad-row">
      <form action={formAction} className="squad-row-head">
        <input type="hidden" name="name" value={name} />
        <strong>{name}</strong>
        <span className="muted small">
          in {matches} {matches === 1 ? "line-up" : "line-ups"}
        </span>
        <Submit className="btn-link" pending="Adding…">Add to squad</Submit>
      </form>
      {state.error && <Notice state={state} />}
    </li>
  );
}

/** One button for every line-up name at once. */
export function AddAllLineupPlayers({ action, names }: { action: Action; names: string[] }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="squad-add-all">
      {names.map((n) => (
        <input key={n} type="hidden" name="name" value={n} />
      ))}
      <Submit pending="Adding…">Add all {names.length}</Submit>
      {state.error && <Notice state={state} />}
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
