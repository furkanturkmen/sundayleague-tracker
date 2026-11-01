"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Notice, Submit } from "@/components/forms";
import { useT } from "@/components/I18n";
import type { FormState } from "@/lib/actions";

type Action = (state: FormState, f: FormData) => Promise<FormState>;
type Option = { id: string; label: string };

/** "Add a moment" under a hall, opening a short form with that hall already chosen. Stays open to add another. */
export function AddMoment({ action, kind, players, matches }: { action: Action; kind: "fame" | "shame"; players: Option[]; matches: Option[] }) {
  const t = useT();
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
          {t("Add a moment")}
        </button>
        {state.ok && <Notice state={state} />}
      </div>
    );

  return (
    <form action={formAction} className="form mo-form" key={round}>
      <input type="hidden" name="kind" value={kind} />
      <label>
        {t("Title")}
        <input
          name="title"
          required
          maxLength={80}
          autoFocus
          placeholder={kind === "fame" ? t("e.g. The volley from the halfway line") : t("e.g. The penalty that's still going")}
        />
      </label>
      <label>
        {t("Story")} <span className="muted">{t("(optional)")}</span>
        <textarea name="story" maxLength={600} rows={3} placeholder={t("What happened, in a sentence or three.")} />
      </label>
      <div className="mo-pair">
        <label>
          {t("Player")} <span className="muted">{t("(optional)")}</span>
          <select name="player" defaultValue="">
            <option value="">{t("No one in particular")}</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Match")} <span className="muted">{t("(optional)")}</span>
          <select name="match" defaultValue="">
            <option value="">{t("No match")}</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mo-actions">
        <Submit className="hx-btn hx-btn-primary" pending={t("Adding…")}>
          {kind === "fame" ? t("Add to the Hall of Fame") : t("Add to the Hall of Shame")}
        </Submit>
        <button type="button" className="btn-link" onClick={() => setOpen(false)}>
          {t("Done")}
        </button>
      </div>
      <Notice state={state} />
    </form>
  );
}

/** Delete on a moment, asking "Sure?" in place instead of a browser pop-up. */
export function DeleteMoment({ action, id }: { action: (f: FormData) => Promise<void>; id: string }) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" className="mo-delete" onClick={() => setAsking(true)}>
        {t("Delete")}
      </button>
    );
  return (
    <form action={action} className="mo-confirm">
      <input type="hidden" name="id" value={id} />
      <span>{t("Delete this moment?")}</span>
      <ConfirmButton />
      <button type="button" className="mo-delete" onClick={() => setAsking(false)}>
        {t("Keep")}
      </button>
    </form>
  );
}

function ConfirmButton() {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="mo-delete danger" disabled={pending}>
      {pending ? t("Deleting…") : t("Yes, delete")}
    </button>
  );
}
