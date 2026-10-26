"use client";

import { useActionState, useEffect, useState } from "react";
import { Notice, Submit } from "@/components/forms";
import type { FormState } from "@/lib/actions";
import { FORMATIONS, formationSlots, MAX_BENCH, suggestLineup } from "@/lib/lineup";
import type { Player } from "@/lib/types";

type Action = (state: FormState, f: FormData) => Promise<FormState>;

const label = (p: Player) => `${p.number != null ? `${p.number}. ` : ""}${p.name} · ${p.position}`;

/** Formation, a player per spot and the bench, with the graphic next to it. The preview redraws on every change. */
export function LineupForm({
  action,
  players,
  initial,
  image,
}: {
  action: Action;
  players: Player[];
  initial: { formation: string; starters: (string | null)[]; bench: string[] };
  image: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [formation, setFormation] = useState(initial.formation);
  const [starters, setStarters] = useState(initial.starters);
  const [bench, setBench] = useState(initial.bench);
  // What the picks look like as preview params, and the last image that finished loading (kept on screen meanwhile).
  const query = `f=${encodeURIComponent(formation)}&s=${starters.map((id) => id ?? "").join(",")}&b=${bench.join(",")}`;
  const [shown, setShown] = useState(`${image}?${query}`);
  const [loading, setLoading] = useState(false);
  const slots = formationSlots(formation);
  const byId = new Map(players.map((p) => [p.id, p]));
  const chosen = new Set(starters.filter(Boolean));
  // Active players, plus anyone inactive who is already picked.
  const options = players.filter((p) => p.active || chosen.has(p.id) || bench.includes(p.id));

  useEffect(() => {
    const next = `${image}?${query}`;
    if (next === shown) return;
    // Wait for a pause in the clicking, then load the new render off-screen and swap it in.
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      const img = new Image();
      img.onload = img.onerror = () => {
        if (cancelled) return;
        setShown(next);
        setLoading(false);
      };
      img.src = next;
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [image, query, shown]);

  function changeFormation(next: string) {
    // Re-fit the current eleven to the new shape, keeping them ahead of everyone else.
    const current = starters.filter((id): id is string => Boolean(id)).map((id) => byId.get(id)!);
    const { starters: fitted } = suggestLineup(next, current);
    setFormation(next);
    setStarters(fitted);
    setBench((b) => b.filter((id) => !fitted.includes(id)));
  }

  function pick(slot: number, id: string) {
    setStarters((s) => s.map((cur, i) => (i === slot ? id || null : cur === id ? null : cur)));
    setBench((b) => b.filter((x) => x !== id));
  }

  return (
    <div className="lineup-layout">
      <form action={formAction} className="card form">
        <label>
          Formation
          <select name="formation" value={formation} onChange={(e) => changeFormation(e.target.value)}>
            {Object.keys(FORMATIONS).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>Starting eleven</legend>
          <ul className="lineup-slots">
            {slots.map((s, i) => (
              <li key={`${formation}-${i}`}>
                <span className="chip">{s.pos}</span>
                <select name={`slot${i}`} value={starters[i] ?? ""} onChange={(e) => pick(i, e.target.value)} aria-label={`${s.pos}, spot ${i + 1}`}>
                  <option value="">Empty</option>
                  {options.map((p) => (
                    <option key={p.id} value={p.id}>{label(p)}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset>
          <legend>
            Bench <span className="muted small">(up to {MAX_BENCH})</span>
          </legend>
          <div className="lineup-bench">
            {options
              .filter((p) => !chosen.has(p.id))
              .map((p) => (
                <label key={p.id} className="check">
                  <input
                    type="checkbox"
                    name="bench"
                    value={p.id}
                    checked={bench.includes(p.id)}
                    disabled={!bench.includes(p.id) && bench.length >= MAX_BENCH}
                    onChange={(e) => setBench((b) => (e.target.checked ? [...b, p.id] : b.filter((x) => x !== p.id)))}
                  />
                  {label(p)}
                </label>
              ))}
          </div>
        </fieldset>

        <Notice state={state} />
        <div className="form-actions">
          <Submit>Save line-up</Submit>
        </div>
      </form>

      <div className="card lineup-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shown} width={1080} height={1350} alt="Line-up graphic" style={{ opacity: loading ? 0.6 : 1, transition: "opacity 150ms" }} />
        <div className="form-actions">
          <a href={`${image}?download=1&${query}`} className="btn" download>
            Download PNG
          </a>
          <span className="small muted">{loading ? "Updating…" : "Save to keep this line-up."}</span>
        </div>
      </div>
    </div>
  );
}
