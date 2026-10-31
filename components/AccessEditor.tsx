"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Notice, Submit } from "@/components/forms";
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
  const [state, formAction] = useActionState(action, {});
  const ref = useClearOnOk(state);
  return (
    <form action={formAction} className="form ve-form" ref={ref}>
      <label>
        Current password
        <input type="password" name="current" required autoComplete="current-password" />
      </label>
      <div className="ve-pair">
        <label>
          New password
          <input type="password" name="password" required minLength={6} autoComplete="new-password" />
        </label>
        <label>
          Confirm
          <input type="password" name="confirm" required minLength={6} autoComplete="new-password" />
        </label>
      </div>
      <div className="ve-actions">
        <Submit className="hx-btn hx-btn-primary" pending="Changing…">
          Change password
        </Submit>
      </div>
      <Notice state={state} />
    </form>
  );
}

/** The link the coach signs in at, with a button that copies it. */
function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ac-share">
      <span>Sign-in link for the coach</span>
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
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function CoachLogin({ action, isSet, loginUrl }: { action: Action; isSet: boolean; loginUrl: string }) {
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
          {isSet ? "Coach login is on." : "No coach login yet."}
        </p>
        {isSet && !editing && (
          <div className="ve-actions">
            <button type="button" className="btn-link" onClick={() => setEditing(true)}>
              Change password
            </button>
            <form action={formAction}>
              <input type="hidden" name="remove" value="1" />
              <Submit className="btn-link danger" pending="Removing…">
                Remove
              </Submit>
            </form>
          </div>
        )}
      </div>
      {isSet && <ShareLink url={loginUrl} />}

      {showForm && (
        <form action={formAction} className="form ve-form" ref={ref}>
          <div className="ve-pair">
            <label>
              {isSet ? "New coach password" : "Coach password"}
              <input type="password" name="password" required minLength={6} autoComplete="new-password" />
            </label>
            <label>
              Confirm
              <input type="password" name="confirm" required minLength={6} autoComplete="new-password" />
            </label>
          </div>
          <div className="ve-actions">
            <Submit className="hx-btn hx-btn-primary" pending="Saving…">
              {isSet ? "Save password" : "Turn on coach login"}
            </Submit>
            {isSet && (
              <button type="button" className="btn-link" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
      <Notice state={state} />
    </div>
  );
}

/** Deleting the club: folded shut, and the button stays off until the name is typed exactly. */
export function DangerZone({ action, name }: { action: Action; name: string }) {
  const [state, formAction] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <section className="ac-danger" aria-labelledby="ac-danger">
      <div className="ac-danger-head">
        <div>
          <h3 id="ac-danger" className="ve-h">
            Delete the club
          </h3>
          <p className="ce-note">Removes {name}, its players, every result and both passwords. This can&apos;t be undone.</p>
        </div>
        {!open && (
          <button type="button" className="ac-danger-open" onClick={() => setOpen(true)}>
            Delete club…
          </button>
        )}
      </div>
      {open && (
        <form action={formAction} className="form ve-form">
          <label>
            Type <b>{name}</b> to confirm
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
              Cancel
            </button>
          </div>
          <Notice state={state} />
        </form>
      )}
    </section>
  );
}

function DeleteButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="ac-delete" disabled={!ready || pending}>
      {pending ? "Deleting…" : "Delete forever"}
    </button>
  );
}
