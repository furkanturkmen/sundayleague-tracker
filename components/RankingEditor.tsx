"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Notice, Submit } from "@/components/forms";
import type { FormState } from "@/lib/actions";
import type { Player } from "@/lib/types";

type Action = (state: FormState, f: FormData) => Promise<FormState>;

const label = (p: Player) => `${p.number != null ? `${p.number}. ` : ""}${p.name}`;

/** Title fields for a new ranking. Creating it opens the editor. */
export function NewRankingForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="form ranking-new" aria-label="New ranking">
      <div className="ranking-title-fields">
        <label>
          Title
          <input name="title" required maxLength={40} placeholder="e.g. Snelste" />
        </label>
        <label>
          In club colour <span className="muted small">(optional)</span>
          <input name="accentText" maxLength={40} placeholder="e.g. van het team" />
        </label>
      </div>
      <Notice state={state} />
      <div className="form-actions">
        <Submit>Create and pick players</Submit>
      </div>
    </form>
  );
}

/** The list in order, with the graphic beside it. Drag a row, or use the arrows, to move a player; the preview redraws as you go. */
export function RankingEditor({
  action,
  players,
  initial,
  image,
}: {
  action: Action;
  players: Player[];
  initial: { title: string; accentText: string; players: string[] };
  image: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [title, setTitle] = useState(initial.title);
  const [accentText, setAccentText] = useState(initial.accentText);
  const [order, setOrder] = useState(initial.players);
  const dragging = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const byId = new Map(players.map((p) => [p.id, p]));
  const rest = players.filter((p) => p.active && !order.includes(p.id));

  const query = `t=${encodeURIComponent(title)}&a=${encodeURIComponent(accentText)}&p=${order.join(",")}`;
  const [shown, setShown] = useState(`${image}?${query}`);
  const [loading, setLoading] = useState(false);
  const saved = title === initial.title && accentText === initial.accentText && order.join() === initial.players.join();

  useEffect(() => {
    const next = `${image}?${query}`;
    if (next === shown) return;
    // Wait for a pause, then load the new render off-screen and swap it in.
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

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((o) => {
      const next = [...o];
      const [id] = next.splice(from, 1);
      next.splice(to, 0, id);
      return next;
    });
  }

  return (
    <div className="lineup-layout">
      <form action={formAction} className="card form">
        <div className="ranking-title-fields">
          <label>
            Title
            <input name="title" required maxLength={40} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            In club colour <span className="muted small">(optional)</span>
            <input name="accentText" maxLength={40} value={accentText} onChange={(e) => setAccentText(e.target.value)} />
          </label>
        </div>
        <input type="hidden" name="players" value={order.join(",")} />

        <fieldset>
          <legend>
            Order <span className="muted small">best first · drag or use the arrows</span>
          </legend>
          {order.length ? (
            <ol className="ranking-order">
              {order.map((id, i) => {
                const p = byId.get(id);
                if (!p) return null;
                return (
                  <li
                    key={id}
                    draggable
                    className={over === i ? "drop" : undefined}
                    onDragStart={(e) => {
                      dragging.current = i;
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOver(i);
                    }}
                    onDragLeave={() => setOver((o) => (o === i ? null : o))}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragging.current !== null) move(dragging.current, i);
                      dragging.current = null;
                      setOver(null);
                    }}
                    onDragEnd={() => {
                      dragging.current = null;
                      setOver(null);
                    }}
                  >
                    <span className="ranking-place">{i + 1}</span>
                    <span className="ranking-name">{p.name}</span>
                    <button type="button" className="icon-btn" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${p.name} up`}>↑</button>
                    <button type="button" className="icon-btn" onClick={() => move(i, i + 1)} disabled={i === order.length - 1} aria-label={`Move ${p.name} down`}>↓</button>
                    <button type="button" className="icon-btn" onClick={() => setOrder((o) => o.filter((x) => x !== id))} aria-label={`Take ${p.name} off the list`}>✕</button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>Nobody on the list yet. Add players below.</p>
          )}
        </fieldset>

        {rest.length > 0 && (
          <fieldset>
            <legend>Add to the bottom</legend>
            <div className="ranking-add">
              {rest.map((p) => (
                <button key={p.id} type="button" className="chip-btn" onClick={() => setOrder((o) => [...o, p.id])}>
                  + {label(p)}
                </button>
              ))}
              {rest.length > 1 && (
                <button type="button" className="chip-btn chip-btn-all" onClick={() => setOrder((o) => [...o, ...rest.map((p) => p.id)])}>
                  + Everyone left ({rest.length})
                </button>
              )}
            </div>
          </fieldset>
        )}

        <Notice state={state} />
        <div className="form-actions">
          <Submit>Save ranking</Submit>
          {!saved && <span className="small muted">Unsaved changes</span>}
        </div>
      </form>

      <div className="card lineup-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shown} width={1080} height={1350} alt="Ranking graphic" style={{ opacity: loading ? 0.6 : 1, transition: "opacity 150ms" }} />
        <div className="form-actions">
          <a href={`${image}?download=1&${query}`} className="btn" download>
            Download PNG
          </a>
          <span className="small muted">{loading ? "Updating…" : order.length > 20 ? "The graphic shows the top 20." : "1080×1350, for Instagram."}</span>
        </div>
      </div>
    </div>
  );
}
