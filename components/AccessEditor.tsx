"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Notice, Submit } from "@/components/forms";
import { useT } from "@/components/I18n";
import type { FormState } from "@/lib/actions";

type Action = (state: FormState, f: FormData) => Promise<FormState>;

/** Empties the password fields once a save goes through. */
function useClearOnOk(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function AdminPassword({ action }: { action: Action }) {
  const t = useT();
  const [state, formAction] = useActionState(action, {});
  const ref = useClearOnOk(state);
  return (
    <form action={formAction} className="form ve-form" ref={ref}>
      <label>
        {t("Current password")}
        <input type="password" name="current" required autoComplete="current-password" />
      </label>
      <div className="ve-pair">
        <label>
          {t("New password")}
          <input type="password" name="password" required minLength={6} autoComplete="new-password" />
        </label>
        <label>
          {t("Confirm")}
          <input type="password" name="confirm" required minLength={6} autoComplete="new-password" />
        </label>
      </div>
      <div className="ve-actions">
        <Submit className="hx-btn hx-btn-primary" pending={t("Changing…")}>
          {t("Change password")}
        </Submit>
      </div>
      <Notice state={state} />
    </form>
  );
}

/** The link the coach signs in at, with a button that copies it. */
function ShareLink({ url, label }: { url: string; label: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="ac-share">
      <span>{label}</span>
      <div>
        <code>{url}</code>
        <button
          type="button"
          className="btn-link"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // No clipboard (insecure page or blocked): the link is there to select by hand.
            }
          }}
        >
          {copied ? t("Copied") : t("Copy")}
        </button>
      </div>
    </div>
  );
}

/** Words for the two extra passwords: the coach (line-ups) and the squad (viewing a private club). */
const ROLE_TEXT = {
  coach: {
    on: "Coach login is on.",
    off: "No coach login yet.",
    field: "Coach password",
    newField: "New coach password",
    turnOn: "Turn on coach login",
    share: "Sign-in link for the coach",
  },
  squad: {
    on: "Squad password is set.",
    off: "No squad password yet.",
    field: "Squad password",
    newField: "New squad password",
    turnOn: "Set squad password",
    share: "Link to send the squad",
  },
};

export function RoleLogin({ role, action, isSet, loginUrl }: { role: keyof typeof ROLE_TEXT; action: Action; isSet: boolean; loginUrl: string }) {
  const t = useT();
  const words = ROLE_TEXT[role];
  const [state, formAction] = useActionState(action, {});
  const ref = useClearOnOk(state);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state]);
  const showForm = !isSet || editing;

  return (
    <div className="ve-block">
      <div className="ve-account">
        <p>
          <span className={`ve-dot${isSet ? "" : " shared"}`} aria-hidden="true" />
          {isSet ? t(words.on) : t(words.off)}
        </p>
        {isSet && !editing && (
          <div className="ve-actions">
            <button type="button" className="btn-link" onClick={() => setEditing(true)}>
              {t("Change password")}
            </button>
            <form action={formAction}>
              <input type="hidden" name="remove" value="1" />
              <Submit className="btn-link danger" pending={t("Removing…")}>
                {t("Remove")}
              </Submit>
            </form>
          </div>
        )}
      </div>
      {isSet && <ShareLink url={loginUrl} label={t(words.share)} />}

      {showForm && (
        <form action={formAction} className="form ve-form" ref={ref}>
          <div className="ve-pair">
            <label>
              {isSet ? t(words.newField) : t(words.field)}
              <input type="password" name="password" required minLength={6} autoComplete="new-password" />
            </label>
            <label>
              {t("Confirm")}
              <input type="password" name="confirm" required minLength={6} autoComplete="new-password" />
            </label>
          </div>
          <div className="ve-actions">
            <Submit className="hx-btn hx-btn-primary" pending={t("Saving…")}>
              {isSet ? t("Save password") : t(words.turnOn)}
            </Submit>
            {isSet && (
              <button type="button" className="btn-link" onClick={() => setEditing(false)}>
                {t("Cancel")}
              </button>
            )}
          </div>
        </form>
      )}
      <Notice state={state} />
    </div>
  );
}

/** Public or private, saved as soon as it is picked. */
export function Visibility({ action, isPrivate }: { action: Action; isPrivate: boolean }) {
  const t = useT();
  const [state, formAction] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);
  return (
    <form action={formAction} ref={form} className="ac-vis">
      <fieldset>
        <legend className="sr-only">{t("Who can see the club")}</legend>
        {(
          [
            ["public", "Public", "Anyone with the link sees results, players, stats and the halls."],
            ["private", "Private", "Only people with a password: the squad password, or the coach or admin one."],
          ] as const
        ).map(([value, label, note]) => (
          <label key={value} className="ac-vis-option">
            <input
              type="radio"
              name="visibility"
              value={value}
              defaultChecked={(value === "private") === isPrivate}
              onChange={() => form.current?.requestSubmit()}
            />
            <span>
              <b>{t(label)}</b>
              <small>{t(note)}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <Notice state={state} />
    </form>
  );
}

/** Deleting the club: folded shut, and the button stays off until the name is typed exactly. */
export function DangerZone({ action, name }: { action: Action; name: string }) {
  const t = useT();
  const [state, formAction] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <section className="ac-danger" aria-labelledby="ac-danger">
      <div className="ac-danger-head">
        <div>
          <h3 id="ac-danger" className="ve-h">
            {t("Delete the club")}
          </h3>
          <p className="ce-note">{t("Removes {name}, its players, every result and every password. This can't be undone.", { name })}</p>
        </div>
        {!open && (
          <button type="button" className="ac-danger-open" onClick={() => setOpen(true)}>
            {t("Delete club…")}
          </button>
        )}
      </div>
      {open && (
        <form action={formAction} className="form ve-form">
          <label>
            {t("Type the club name to confirm:")} <b>{name}</b>
            <input name="confirm" autoComplete="off" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </label>
          <div className="ve-actions">
            <DeleteButton ready={typed === name} />
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
            >
              {t("Cancel")}
            </button>
          </div>
          <Notice state={state} />
        </form>
      )}
    </section>
  );
}

function DeleteButton({ ready }: { ready: boolean }) {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="ac-delete" disabled={!ready || pending}>
      {pending ? t("Deleting…") : t("Delete forever")}
    </button>
  );
}
