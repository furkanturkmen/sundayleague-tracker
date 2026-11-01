"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useT } from "@/components/I18n";
import type { FormState } from "@/lib/actions";
import { cutOut } from "@/lib/cutout";

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
  const t = useT();
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending ? (pendingLabel ?? t("Saving…")) : children}
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

/**
 * File picker that sends a shrunk data URL in `name`, "remove" to clear the saved image, or nothing to keep it.
 * With `cutout`, a photo of a person has its background removed first, so they stand free like the shirt.
 */
export function ImageField({
  name,
  label,
  hint,
  initial,
  maxPx,
  cutout = false,
  onChange,
}: {
  name: string;
  label: ReactNode;
  hint: ReactNode;
  initial: string | null;
  maxPx: number;
  cutout?: boolean;
  onChange?: (preview: string | null) => void;
}) {
  const [value, setValue] = useState("");
  const [has, setHas] = useState(Boolean(initial));
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const t = useT();

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
            setNote("");
            if (file.size > 5_000_000) {
              setError(t("That file is over 5 MB. Pick a smaller one."));
              return;
            }
            let data: string;
            try {
              data = await shrinkImage(file, maxPx);
            } catch {
              setError(t("Couldn't read that image. Try a PNG or JPG."));
              return;
            }
            if (cutout) {
              setBusy(true);
              try {
                const cut = await cutOut(data, maxPx);
                if (cut) data = cut;
                else setNote(t("No person found to cut out, so the photo is kept as it is."));
              } catch {
                setNote(t("Couldn't cut out the background (no connection?), so the photo is kept as it is."));
              }
              setBusy(false);
            }
            setValue(data);
            setHas(true);
            onChange?.(data);
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
            {t("Remove")}
          </button>
        )}
      </div>
      {cutout && value && value !== "remove" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="logo-field-preview" />
      )}
      {busy ? (
        <p className="small muted" role="status">{t("Cutting out the background…")}</p>
      ) : error ? (
        <p className="notice notice-error" role="alert">{error}</p>
      ) : (
        <p className="small muted">{note || hint}</p>
      )}
    </div>
  );
}

// Big enough for a 160px card at 2x and the round bench photos.
export const PHOTO_PX = 480;
/** English, as a translation key: show it with t(PHOTO_HINT). */
export const PHOTO_HINT = "For the line-up graphic. A cut-out on a transparent background (PNG) looks best; a normal photo works too.";
/** A player's photo has its background cut out on upload. */
export const PLAYER_PHOTO_HINT = "For the player pages and the graphics. The background is cut out for you, so they stand like the shirt.";

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
  const t = useT();
  return (
    <form action={formAction} className="form">
      <input type="hidden" name="next" value={next ?? ""} />
      <label>
        {t("Password")}
        <input type="password" name="password" required autoFocus autoComplete="current-password" />
      </label>
      <Notice state={state} />
      <Submit pending={t("Signing in…")}>{t("Sign in")}</Submit>
    </form>
  );
}

// ---------- voetbal.nl ----------

export function AddLineupPlayer({ action, name, matches }: { action: Action; name: string; matches: number }) {
  const [state, formAction] = useActionState(action, {});
  const t = useT();
  if (state.ok) return null;
  return (
    <li className="squad-row">
      <form action={formAction} className="squad-row-head">
        <input type="hidden" name="name" value={name} />
        <strong>{name}</strong>
        <span className="muted small">{t(matches === 1 ? "in {n} line-up" : "in {n} line-ups", { n: matches })}</span>
        <Submit className="btn-link" pending={t("Adding…")}>
          {t("Add to squad")}
        </Submit>
      </form>
      {state.error && <Notice state={state} />}
    </li>
  );
}

/** One button for every line-up name at once. */
export function AddAllLineupPlayers({ action, names }: { action: Action; names: string[] }) {
  const [state, formAction] = useActionState(action, {});
  const t = useT();
  return (
    <form action={formAction} className="squad-add-all">
      {names.map((n) => (
        <input key={n} type="hidden" name="name" value={n} />
      ))}
      <Submit pending={t("Adding…")}>{t("Add all {n}", { n: names.length })}</Submit>
      {state.error && <Notice state={state} />}
    </form>
  );
}

/** Submit button that asks before doing something destructive. */
export function ConfirmSubmit({ children, message, className = "btn btn-danger" }: { children: ReactNode; message: string; className?: string }) {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? t("Deleting…") : children}
    </button>
  );
}
