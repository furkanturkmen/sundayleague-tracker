"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Notice, Submit } from "@/components/forms";
import type { FormState } from "@/lib/actions";

type Action = (state: FormState, f: FormData) => Promise<FormState>;
type Option = { id: string; label: string };

/** "Add a moment" under a hall, opening a short form with that hall already chosen. Stays open to add another. */
export function AddMoment({ action, kind, players, matches }: { action: Action; kind: "fame" | "shame"; players: Option[]; matches: Option[] }) {
  const [state, formAction] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  // A fresh form after each moment, so the next one starts empty.
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (state.ok) setRound((r) => r + 1);
  }, [state]);

  if (!open)
    return (
      <div className="mo-add-bar">
        <button type="button" className="hx-btn" onClick={() => setOpen(true)}>
          Add a moment
        </button>
        {state.ok && <Notice state={state} />}
      </div>
    );

  return (
    <form action={formAction} className="form mo-form" key={round}>
      <input type="hidden" name="kind" value={kind} />
      <label>
        Title
        <input name="title" required maxLength={80} autoFocus placeholder={kind === "fame" ? "e.g. The volley from the halfway line" : "e.g. The penalty that's still going"} />
      </label>
      <label>
        Story <span className="muted">(optional)</span>
        <textarea name="story" maxLength={600} rows={3} placeholder="What happened, in a sentence or three." />
      </label>
      <div className="mo-pair">
        <label>
          Player <span className="muted">(optional)</span>
          <select name="player" defaultValue="">
            <option value="">No one in particular</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Match <span className="muted">(optional)</span>
          <select name="match" defaultValue="">
            <option value="">No match</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mo-actions">
        <Submit className="hx-btn hx-btn-primary" pending="Adding…">
          {kind === "fame" ? "Add to the Hall of Fame" : "Add to the Hall of Shame"}
        </Submit>
        <button type="button" className="btn-link" onClick={() => setOpen(false)}>
          Done
        </button>
      </div>
      <Notice state={state} />
    </form>
  );
}

/** Delete on a moment, asking "Sure?" in place instead of a browser pop-up. */
export function DeleteMoment({ action, id }: { action: (f: FormData) => Promise<void>; id: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" className="mo-delete" onClick={() => setAsking(true)}>
        Delete
      </button>
    );
  return (
    <form action={action} className="mo-confirm">
      <input type="hidden" name="id" value={id} />
      <span>Delete this moment?</span>
      <ConfirmButton />
      <button type="button" className="mo-delete" onClick={() => setAsking(false)}>
        Keep
      </button>
    </form>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="mo-delete danger" disabled={pending}>
      {pending ? "Deleting…" : "Yes, delete"}
    </button>
  );
}
