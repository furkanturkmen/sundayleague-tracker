"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A row of cards that scrolls sideways: swipe on touch, drag or use the arrows with a mouse. Snaps to cards.
 * A drag doesn't count as a click, so letting go over a card doesn't open it.
 */
export function Rail({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const page = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className={`hx-rail ${className ?? ""}`}>
      <div className="hx-rail-arrows">
        <button type="button" onClick={() => page(-1)} disabled={edges.start} aria-label={`Scroll ${label} back`}>
          ←
        </button>
        <button type="button" onClick={() => page(1)} disabled={edges.end} aria-label={`Scroll ${label} on`}>
          →
        </button>
      </div>
      <div
        ref={ref}
        className="hx-rail-track"
        role="region"
        aria-label={label}
        tabIndex={0}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || !ref.current) return;
          drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !ref.current) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) < 6) return;
          if (!d.moved) {
            d.moved = true;
            ref.current.setPointerCapture(e.pointerId);
            ref.current.dataset.dragging = "";
          }
          ref.current.scrollLeft = d.left - dx;
        }}
        onPointerUp={(e) => {
          const el = ref.current;
          if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
          if (el) delete el.dataset.dragging;
          // Swallow the click that follows a drag.
          if (drag.current?.moved) el?.addEventListener("click", (ev) => ev.preventDefault(), { capture: true, once: true });
          drag.current = null;
        }}
        onPointerCancel={() => {
          if (ref.current) delete ref.current.dataset.dragging;
          drag.current = null;
        }}
      >
        {children}
      </div>
    </div>
  );
}
