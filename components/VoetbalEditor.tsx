"use client";

import { useActionState, useEffect, useState } from "react";
import { Notice, Submit } from "@/components/forms";
import type { FormState } from "@/lib/actions";

type Action = (state: FormState, f: FormData) => Promise<FormState>;

export function SyncNow({ sync }: { sync: () => Promise<FormState> }) {
  const [state, action] = useActionState(sync, {});
  return (
    <form action={action} className="ve-sync">
      <Submit className="hx-btn hx-btn-primary" pending="Syncing… about half a minute">
        Sync now
      </Submit>
      <Notice state={state} />
    </form>
  );
}

/** The team link. Saving a new one syncs straight away; Disconnect clears it and the league table. */
export function TeamLink({ save, teamId }: { save: Action; teamId: string | null }) {
  const [state, action] = useActionState(save, {});
  // Kept in state: React empties a form after it is sent, and a refused link should stay to be fixed.
  const [link, setLink] = useState(teamId ? `https://www.voetbal.nl/team/${teamId}/overzicht` : "");
  return (
    <div className="ve-block">
      <form action={action} className="form ve-form">
        <label>
          Team link
          <input
            name="team"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.voetbal.nl/team/T1628317720/overzicht"
          />
        </label>
        <p className="ce-note">Open your team on voetbal.nl and copy the address from the browser. It contains something like T1628317720.</p>
        <div className="ve-actions">
          <Submit className="hx-btn hx-btn-primary" pending="Saving and syncing…">
            {teamId ? "Save link" : "Connect team"}
          </Submit>
        </div>
      </form>
      {teamId && (
        <form action={action} className="ve-disconnect">
          <input type="hidden" name="team" value="" />
          <Submit className="btn-link danger" pending="Disconnecting…">
            Disconnect this team
          </Submit>
          <span>Matches already synced stay.</span>
        </form>
      )}
      <Notice state={state} />
    </div>
  );
}

/** The club's own voetbal.nl account. The password never comes back to the page, only the email. */
export function LoginForm({
  save,
  remove,
  email,
  siteAccount,
}: {
  save: Action;
  remove: () => Promise<FormState>;
  email: string | null;
  siteAccount: boolean;
}) {
  const [state, action] = useActionState(save, {});
  const [removeState, removeAction] = useActionState(remove, {});
  const [editing, setEditing] = useState(false);
  const [typed, setTyped] = useState(email ?? "");
  // Only the latest message, so a removed login doesn't still say "Connected as …".
  const [message, setMessage] = useState<FormState>({});

  // A saved login closes the form; the page then shows the new email.
  useEffect(() => {
    setMessage(state);
    if (state.ok) setEditing(false);
  }, [state]);
  useEffect(() => setMessage(removeState), [removeState]);

  const showForm = !email || editing;

  return (
    <div className="ve-block">
      {email ? (
        <div className="ve-account">
          <p>
            <span className="ve-dot" aria-hidden="true" />
            Connected as <b>{email}</b>
          </p>
          {!editing && (
            <div className="ve-actions">
              <button type="button" className="btn-link" onClick={() => setEditing(true)}>
                Replace
              </button>
              <form action={removeAction}>
                <Submit className="btn-link danger" pending="Removing…">
                  Remove
                </Submit>
              </form>
            </div>
          )}
        </div>
      ) : (
        <p className="ve-account">
          <span className={`ve-dot ${siteAccount ? "shared" : "off"}`} aria-hidden="true" />
          {siteAccount ? "No login of your own yet. Syncs use the site's shared account for now." : "No login yet. Connect one to sync."}
        </p>
      )}

      {showForm && (
        <form action={action} className="form ve-form">
          <div className="ve-pair">
            <label>
              Email
              <input name="email" type="email" required autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="team@example.com" />
            </label>
            <label>
              Password
              <input name="password" type="password" required autoComplete="new-password" />
            </label>
          </div>
          <div className="ve-actions">
            <Submit className="hx-btn hx-btn-primary" pending="Checking with voetbal.nl…">
              {email ? "Save login" : "Connect login"}
            </Submit>
            {email && (
              <button type="button" className="btn-link" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
      <Notice state={message} />
    </div>
  );
}
